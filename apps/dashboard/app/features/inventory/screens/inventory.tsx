/**
 * 재고 관리 - 재고 현황 (개선된 UI)
 */
import type { Route } from "./+types/inventory";

import {
  PackageIcon,
  SearchIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  FilterIcon,
  DownloadIcon,
  UploadIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LayersIcon,
  WarehouseIcon,
  SendIcon,
  FileUpIcon,
  StoreIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/core/components/ui/collapsible";

import makeServerClient from "~/core/lib/supa-client.server";

// lib imports
import {
  type InventoryItem,
  type InventoryGroup,
  type SortKey,
  type SortOrder,
  type ChannelMapping,
  type Warehouse,
  exportInventoryToCSV,
} from "../lib/inventory.shared";
import {
  parseInventoryQueryParams,
  getFilterOptions,
  getInventoryStats,
  getInventory,
  enrichInventoryWithChannelData,
  updateThreshold,
  bulkUpdateThreshold,
  updateWarehouseStock,
  updatePriorityWarehouse,
  transferStock,
  csvImport,
  type CsvImportItem,
} from "../lib/inventory.server";

// components imports
import {
  ColorChip,
  StockProgressBar,
  ChannelMappingDetail,
  SortableHeader,
} from "../components";

export const meta: Route.MetaFunction = () => {
  return [{ title: `재고 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);

  // 쿼리 파라미터 파싱
  const params = parseInventoryQueryParams(url);

  // 필터 옵션, 통계, 재고 목록 조회
  const [filterOptions, stats, inventoryResult] = await Promise.all([
    getFilterOptions(supabase),
    getInventoryStats(supabase),
    getInventory(supabase, params),
  ]);

  // 채널 데이터로 enrichment
  const enrichedInventory = await enrichInventoryWithChannelData(
    supabase,
    inventoryResult.inventory
  );

  return {
    inventory: enrichedInventory,
    stats,
    totalCount: inventoryResult.totalCount,
    currentPage: inventoryResult.currentPage,
    totalPages: inventoryResult.totalPages,
    limit: params.limit,
    search: params.search,
    groupBy: params.groupBy,
    filters: {
      stockFilter: params.stockFilter,
      parentSku: params.parentSku,
      color: params.color,
      size: params.size,
      warehouse: params.warehouseFilter,
    },
    filterOptions,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  if (actionType === "updateThreshold") {
    const inventoryId = formData.get("inventoryId") as string;
    const alertThreshold = parseInt(formData.get("alertThreshold") as string);
    return await updateThreshold(adminClient, inventoryId, alertThreshold);
  }

  if (actionType === "bulkUpdateThreshold") {
    const inventoryIds = JSON.parse(formData.get("inventoryIds") as string) as string[];
    const alertThreshold = parseInt(formData.get("alertThreshold") as string);
    return await bulkUpdateThreshold(adminClient, inventoryIds, alertThreshold);
  }

  // 채널 재고 푸시
  if (actionType === "pushChannelStock") {
    const sku = formData.get("sku") as string;
    const cafe24Stock = formData.get("cafe24Stock") as string;
    const naverStock = formData.get("naverStock") as string;
    const cafe24Variants = formData.get("cafe24Variants") as string;
    const naverOptions = formData.get("naverOptions") as string;
    
    const results = { cafe24: { success: 0, fail: 0, errors: [] as string[] }, naver: { success: 0, fail: 0, errors: [] as string[] } };

    // Cafe24 재고 업데이트 - 직접 API 호출
    if (cafe24Stock && cafe24Variants) {
      const { updateVariantInventory } = await import("~/features/integrations/lib/cafe24.server");
      const variants = JSON.parse(cafe24Variants) as Array<{ product_no: number; variant_code: string }>;
      const stockValue = parseInt(cafe24Stock);
      
      for (const variant of variants) {
        const result = await updateVariantInventory(variant.product_no, variant.variant_code, stockValue);
        if (result.success) {
          results.cafe24.success++;
          // DB에도 동기화 상태 업데이트
          await adminClient
            .from("cafe24_product_variants")
            .update({ stock_quantity: stockValue, synced_at: new Date().toISOString() })
            .eq("product_no", variant.product_no)
            .eq("variant_code", variant.variant_code);
        } else {
          results.cafe24.fail++;
          results.cafe24.errors.push(result.error || "알 수 없는 오류");
        }
      }
    }

    // 네이버 재고 업데이트 - 직접 API 호출
    if (naverStock && naverOptions) {
      const { updateProductOptionStock } = await import("~/features/integrations/lib/naver.server");
      const options = JSON.parse(naverOptions) as Array<{ origin_product_no: number; option_combination_id: number }>;
      const stockValue = parseInt(naverStock);
      
      // 같은 origin_product_no를 가진 옵션들을 그룹화하여 한 번에 업데이트
      const groupedOptions = options.reduce((acc, opt) => {
        if (!acc[opt.origin_product_no]) {
          acc[opt.origin_product_no] = [];
        }
        acc[opt.origin_product_no].push({
          optionCombinationId: opt.option_combination_id,
          stockQuantity: stockValue,
        });
        return acc;
      }, {} as Record<number, Array<{ optionCombinationId: number; stockQuantity: number }>>);
      
      for (const [originProductNoStr, optionUpdates] of Object.entries(groupedOptions)) {
        const originProductNo = parseInt(originProductNoStr);
        const result = await updateProductOptionStock(originProductNo, optionUpdates);
        if (result.success) {
          results.naver.success += optionUpdates.length;
          // DB에도 동기화 상태 업데이트
          for (const opt of optionUpdates) {
            await adminClient
              .from("naver_product_options")
              .update({ stock_quantity: stockValue, synced_at: new Date().toISOString() })
              .eq("origin_product_no", originProductNo)
              .eq("option_combination_id", opt.optionCombinationId);
          }
        } else {
          results.naver.fail += optionUpdates.length;
          results.naver.errors.push(result.error || "알 수 없는 오류");
        }
      }
    }

    const messages = [];
    if (results.cafe24.success > 0) messages.push(`Cafe24: ${results.cafe24.success}개 성공`);
    if (results.cafe24.fail > 0) messages.push(`Cafe24: ${results.cafe24.fail}개 실패`);
    if (results.naver.success > 0) messages.push(`네이버: ${results.naver.success}개 성공`);
    if (results.naver.fail > 0) messages.push(`네이버: ${results.naver.fail}개 실패`);
    
    const hasErrors = results.cafe24.fail > 0 || results.naver.fail > 0;
    const errorDetail = [...results.cafe24.errors, ...results.naver.errors].slice(0, 3).join("; ");
    
    return { 
      success: !hasErrors, 
      message: messages.join(", ") || "업데이트할 채널이 없습니다.",
      error: hasErrors ? errorDetail : undefined,
    };
  }

  // 일괄 재고 분배
  if (actionType === "bulkDistributeStock") {
    const itemsStr = formData.get("items") as string;
    const cafe24RatioStr = formData.get("cafe24Ratio") as string;
    const naverRatioStr = formData.get("naverRatio") as string;
    
    const items = JSON.parse(itemsStr) as Array<{
      sku: string;
      current_stock: number;
      cafe24Variants: Array<{ product_no: number; variant_code: string }>;
      naverOptions: Array<{ origin_product_no: number; option_combination_id: number }>;
    }>;
    
    const cafe24Ratio = parseInt(cafe24RatioStr) / 100;
    const naverRatio = parseInt(naverRatioStr) / 100;
    
    const { updateVariantInventory } = await import("~/features/integrations/lib/cafe24.server");
    const { updateProductOptionStock } = await import("~/features/integrations/lib/naver.server");
    
    const results = { cafe24: { success: 0, fail: 0 }, naver: { success: 0, fail: 0 } };
    
    for (const item of items) {
      const cafe24Stock = Math.floor(item.current_stock * cafe24Ratio);
      const naverStock = Math.floor(item.current_stock * naverRatio);
      
      // Cafe24 업데이트
      for (const variant of item.cafe24Variants) {
        const result = await updateVariantInventory(variant.product_no, variant.variant_code, cafe24Stock);
        if (result.success) {
          results.cafe24.success++;
          await adminClient
            .from("cafe24_product_variants")
            .update({ stock_quantity: cafe24Stock, synced_at: new Date().toISOString() })
            .eq("product_no", variant.product_no)
            .eq("variant_code", variant.variant_code);
        } else {
          results.cafe24.fail++;
        }
      }
      
      // 네이버 업데이트 - 같은 origin_product_no 그룹화
      const groupedOptions = item.naverOptions.reduce((acc, opt) => {
        if (!acc[opt.origin_product_no]) acc[opt.origin_product_no] = [];
        acc[opt.origin_product_no].push({
          optionCombinationId: opt.option_combination_id,
          stockQuantity: naverStock,
        });
        return acc;
      }, {} as Record<number, Array<{ optionCombinationId: number; stockQuantity: number }>>);
      
      for (const [originProductNoStr, optionUpdates] of Object.entries(groupedOptions)) {
        const originProductNo = parseInt(originProductNoStr);
        const result = await updateProductOptionStock(originProductNo, optionUpdates);
        if (result.success) {
          results.naver.success += optionUpdates.length;
          for (const opt of optionUpdates) {
            await adminClient
              .from("naver_product_options")
              .update({ stock_quantity: naverStock, synced_at: new Date().toISOString() })
              .eq("origin_product_no", originProductNo)
              .eq("option_combination_id", opt.optionCombinationId);
          }
        } else {
          results.naver.fail += optionUpdates.length;
        }
      }
    }
    
    const messages = [];
    if (results.cafe24.success > 0) messages.push(`Cafe24: ${results.cafe24.success}개 성공`);
    if (results.cafe24.fail > 0) messages.push(`Cafe24: ${results.cafe24.fail}개 실패`);
    if (results.naver.success > 0) messages.push(`네이버: ${results.naver.success}개 성공`);
    if (results.naver.fail > 0) messages.push(`네이버: ${results.naver.fail}개 실패`);
    
    return {
      success: results.cafe24.fail === 0 && results.naver.fail === 0,
      message: `${items.length}개 SKU 분배 완료. ${messages.join(", ")}`,
    };
  }

  // 창고별 재고 수정
  if (actionType === "updateWarehouseStock") {
    const sku = formData.get("sku") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const warehouseName = formData.get("warehouseName") as string;
    return await updateWarehouseStock(adminClient, sku, warehouseId, quantity, warehouseName);
  }

  // 우선 출고 창고 변경
  if (actionType === "updatePriorityWarehouse") {
    const sku = formData.get("sku") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const warehouseName = formData.get("warehouseName") as string;
    return await updatePriorityWarehouse(adminClient, sku, warehouseId, warehouseName);
  }

  // 창고 간 재고 이동
  if (actionType === "transferStock") {
    const sku = formData.get("sku") as string;
    const fromWarehouseId = formData.get("fromWarehouseId") as string;
    const toWarehouseId = formData.get("toWarehouseId") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const fromWarehouseName = formData.get("fromWarehouseName") as string;
    const toWarehouseName = formData.get("toWarehouseName") as string;
    return await transferStock(
      adminClient,
      sku,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      fromWarehouseName,
      toWarehouseName
    );
  }

  // CSV 일괄 재고 수정
  if (actionType === "csvImport") {
    const itemsStr = formData.get("items") as string;
    const items = JSON.parse(itemsStr) as CsvImportItem[];
    return await csvImport(adminClient, items);
  }

  return { success: false, error: "지원하지 않는 액션입니다." };
}

export default function Inventory({ loaderData }: Route.ComponentProps) {
  const { inventory, stats, totalCount, currentPage, totalPages, limit, search, groupBy, filters, filterOptions } = loaderData;

  const [searchInput, setSearchInput] = useState(search);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkThreshold, setBulkThreshold] = useState("10");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // 채널 재고 푸시 모달 상태
  const [stockPushModal, setStockPushModal] = useState<{
    open: boolean;
    item: InventoryItem | null;
  }>({ open: false, item: null });
  const [cafe24PushStock, setCafe24PushStock] = useState("");
  const [naverPushStock, setNaverPushStock] = useState("");
  const [syncBoth, setSyncBoth] = useState(true);
  
  // 일괄 분배 모달 상태
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [cafe24Ratio, setCafe24Ratio] = useState("100");
  const [naverRatio, setNaverRatio] = useState("100");

  // 창고별 재고 편집 상태
  const [editingWarehouseStock, setEditingWarehouseStock] = useState<{
    sku: string;
    warehouseId: string;
  } | null>(null);
  const [editWarehouseStockValue, setEditWarehouseStockValue] = useState("");

  // 재고 이동 모달 상태
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    item: InventoryItem | null;
  }>({ open: false, item: null });
  const [transferFromWarehouse, setTransferFromWarehouse] = useState("");
  const [transferToWarehouse, setTransferToWarehouse] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");

  // 정렬 상태
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // CSV 업로드 모달 상태
  const [showCsvUploadDialog, setShowCsvUploadDialog] = useState(false);
  const [csvData, setCsvData] = useState<Array<{
    sku: string;
    warehouseId: string;
    warehouseName: string;
    oldQuantity: number;
    newQuantity: number;
    productName?: string;
  }>>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);

  // 창고 목록
  const warehouses = filterOptions.warehouses as Warehouse[];
  const defaultWarehouse = warehouses.find(w => w.is_default);
  
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const syncing = fetcher.state === "submitting" || fetcher.state === "loading";
  const hasHandledRef = useRef(false);

  // 정렬된 데이터
  const sortedInventory = useMemo(() => {
    if (!sortKey) return inventory as InventoryItem[];
    
    return [...(inventory as InventoryItem[])].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortKey) {
        case "sku": aVal = a.sku; bVal = b.sku; break;
        case "product_name": aVal = a.products?.product_name || ""; bVal = b.products?.product_name || ""; break;
        case "color": aVal = a.products?.color_kr || ""; bVal = b.products?.color_kr || ""; break;
        case "size": aVal = a.products?.sku_6_size || ""; bVal = b.products?.sku_6_size || ""; break;
        case "current_stock": aVal = a.current_stock; bVal = b.current_stock; break;
        case "cafe24_stock": aVal = a.cafe24_stock ?? -1; bVal = b.cafe24_stock ?? -1; break;
        case "naver_stock": aVal = a.naver_stock ?? -1; bVal = b.naver_stock ?? -1; break;
        case "alert_threshold": aVal = a.alert_threshold; bVal = b.alert_threshold; break;
        default: return 0;
      }
      
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal, "ko");
        return sortOrder === "asc" ? cmp : -cmp;
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [inventory, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // 그룹화
  const groupedInventory = useMemo((): InventoryGroup[] => {
    if (groupBy === "none") return [];
    const groups = new Map<string, InventoryItem[]>();
    
    sortedInventory.forEach((item) => {
      let key = "";
      if (groupBy === "parent") key = item.products?.parent_sku || "기타";
      else if (groupBy === "color") key = item.products?.color_kr || "미지정";
      else if (groupBy === "status") {
        key = item.current_stock === 0 ? "zero" : item.current_stock <= item.alert_threshold ? "low" : "normal";
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        label: groupBy === "status" 
          ? (key === "zero" ? "품절" : key === "low" ? "재고 부족" : "정상")
          : (groupBy === "parent" ? filterOptions.parentSkus.find((p: any) => p.parent_sku === key)?.product_name || key : key),
        items,
        totalStock: items.reduce((sum, i) => sum + i.current_stock, 0),
        lowStockCount: items.filter(i => i.current_stock > 0 && i.current_stock <= i.alert_threshold).length,
        zeroStockCount: items.filter(i => i.current_stock === 0).length,
      }))
      .sort((a, b) => {
        if (groupBy === "status") {
          const order = { zero: 0, low: 1, normal: 2 };
          return (order[a.key as keyof typeof order] || 3) - (order[b.key as keyof typeof order] || 3);
        }
        return b.totalStock - a.totalStock;
      });
  }, [sortedInventory, groupBy, filterOptions.parentSkus]);

  // 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && !hasHandledRef.current) {
      hasHandledRef.current = true;
      if ((fetcher.data as any).success) {
        const data = (fetcher.data as any).data;
        const msg = data?.itemsSynced 
          ? `✅ ${(fetcher.data as any).message} (${data.itemsSynced}개 동기화)`
          : `✅ ${(fetcher.data as any).message}`;
        setSyncMessage(msg);
        setSelectedItems(new Set());
        setEditingId(null);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${(fetcher.data as any).error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (fetcher.state === "submitting") hasHandledRef.current = false;
  }, [fetcher.data, fetcher.state, revalidator]);

  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const vals = {
      search: overrides.search !== undefined ? overrides.search : search,
      stockFilter: overrides.stockFilter !== undefined ? overrides.stockFilter : filters.stockFilter,
      parentSku: overrides.parentSku !== undefined ? overrides.parentSku : filters.parentSku,
      color: overrides.color !== undefined ? overrides.color : filters.color,
      size: overrides.size !== undefined ? overrides.size : filters.size,
      warehouse: overrides.warehouse !== undefined ? overrides.warehouse : filters.warehouse,
      groupBy: overrides.groupBy !== undefined ? overrides.groupBy : groupBy,
      page: overrides.page !== undefined ? overrides.page : "1",
      limit: overrides.limit !== undefined ? overrides.limit : String(limit),
    };

    if (vals.search) params.set("search", vals.search);
    if (vals.stockFilter && vals.stockFilter !== "all") params.set("stockFilter", vals.stockFilter);
    if (vals.parentSku) params.set("parentSku", vals.parentSku);
    if (vals.color) params.set("color", vals.color);
    if (vals.size) params.set("size", vals.size);
    if (vals.warehouse && vals.warehouse !== "all") params.set("warehouse", vals.warehouse);
    if (vals.groupBy && vals.groupBy !== "none") params.set("groupBy", vals.groupBy);
    if (vals.page && vals.page !== "1") params.set("page", vals.page);
    if (vals.limit && vals.limit !== "100") params.set("limit", vals.limit);
    
    const qs = params.toString();
    return `/dashboard/inventory${qs ? `?${qs}` : ""}`;
  };
  
  // 채널 재고 푸시 모달 열기
  const openStockPushModal = (item: InventoryItem) => {
    setStockPushModal({ open: true, item });
    setCafe24PushStock(String(item.current_stock));
    setNaverPushStock(String(item.current_stock));
    setSyncBoth(true);
  };

  // 채널 재고 푸시 처리
  const handlePushChannelStock = () => {
    if (!stockPushModal.item) return;
    
    const cafe24Variants = stockPushModal.item.channel_mapping?.cafe24.map(v => ({
      product_no: v.product_no,
      variant_code: v.variant_code,
    })) || [];
    
    const naverOptions = stockPushModal.item.channel_mapping?.naver.map(o => ({
      origin_product_no: o.origin_product_no,
      option_combination_id: o.option_combination_id,
    })) || [];
    
    fetcher.submit({
      actionType: "pushChannelStock",
      sku: stockPushModal.item.sku,
      cafe24Stock: cafe24Variants.length > 0 ? cafe24PushStock : "",
      naverStock: naverOptions.length > 0 ? naverPushStock : "",
      cafe24Variants: JSON.stringify(cafe24Variants),
      naverOptions: JSON.stringify(naverOptions),
    }, { method: "POST" });
    
    setStockPushModal({ open: false, item: null });
  };

  // CSV 다운로드
  const handleCsvDownload = () => {
    const headers = ["SKU", "제품명", "색상", "사이즈"];
    warehouses.forEach(w => headers.push(w.warehouse_name));
    headers.push("총 재고", "카페24 재고", "네이버 재고");

    const rows = sortedInventory.map((item) => {
      const row = [
        item.sku,
        item.products?.product_name || "",
        item.products?.color_kr || "",
        item.products?.sku_6_size || "",
      ];
      warehouses.forEach(w => {
        row.push(String(item.warehouse_stocks?.[w.id] || 0));
      });
      row.push(String(item.current_stock));
      row.push(item.cafe24_stock !== null ? String(item.cafe24_stock) : "");
      row.push(item.naver_stock !== null ? String(item.naver_stock) : "");
      return row;
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV 파일 파싱
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvParseError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(l => l);
        if (lines.length < 2) {
          setCsvParseError("CSV 파일에 데이터가 없습니다.");
          return;
        }

        const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
        const skuIndex = headers.findIndex(h => h.toUpperCase() === "SKU");
        if (skuIndex === -1) {
          setCsvParseError("SKU 컬럼을 찾을 수 없습니다.");
          return;
        }

        // 창고 컬럼 인덱스 찾기
        const warehouseColumns: { index: number; warehouse: Warehouse }[] = [];
        warehouses.forEach(w => {
          const idx = headers.findIndex(h => h === w.warehouse_name);
          if (idx !== -1) warehouseColumns.push({ index: idx, warehouse: w });
        });

        if (warehouseColumns.length === 0) {
          setCsvParseError("창고 컬럼을 찾을 수 없습니다. (예: 본사 창고)");
          return;
        }

        const parsed: typeof csvData = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
          const sku = values[skuIndex];
          if (!sku) continue;

          // 현재 재고 찾기
          const currentItem = sortedInventory.find(item => item.sku === sku);

          warehouseColumns.forEach(({ index, warehouse }) => {
            const newQuantity = parseInt(values[index]) || 0;
            const oldQuantity = currentItem?.warehouse_stocks?.[warehouse.id] || 0;

            // 변경된 경우만 추가
            if (newQuantity !== oldQuantity) {
              parsed.push({
                sku,
                warehouseId: warehouse.id,
                warehouseName: warehouse.warehouse_name,
                oldQuantity,
                newQuantity,
                productName: currentItem?.products?.product_name || "",
              });
            }
          });
        }

        if (parsed.length === 0) {
          setCsvParseError("변경된 재고가 없습니다.");
          return;
        }

        setCsvData(parsed);
      } catch (err) {
        setCsvParseError("CSV 파일 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  // CSV 업로드 적용
  const handleCsvImport = () => {
    if (csvData.length === 0) return;

    fetcher.submit({
      actionType: "csvImport",
      items: JSON.stringify(csvData),
    }, { method: "POST" });

    setShowCsvUploadDialog(false);
    setCsvData([]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    window.location.href = buildUrl({ [filterType]: value === "all" || value === "none" ? null : value });
  };

  const handleReset = () => window.location.href = "/dashboard/inventory";

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedItems(new Set(sortedInventory.map(i => i.id)));
    else setSelectedItems(new Set());
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedItems);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedItems(newSet);
  };

  const toggleRowExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const saveThreshold = (item: any) => {
    fetcher.submit({ actionType: "updateThreshold", inventoryId: item.id, alertThreshold: editThreshold }, { method: "POST" });
  };

  // 창고별 재고 저장
  const saveWarehouseStock = () => {
    if (!editingWarehouseStock) return;
    const warehouse = warehouses.find(w => w.id === editingWarehouseStock.warehouseId);
    fetcher.submit({
      actionType: "updateWarehouseStock",
      sku: editingWarehouseStock.sku,
      warehouseId: editingWarehouseStock.warehouseId,
      warehouseName: warehouse?.warehouse_name || "",
      quantity: editWarehouseStockValue,
    }, { method: "POST" });
    setEditingWarehouseStock(null);
  };

  // 우선 출고 창고 변경
  const handlePriorityWarehouseChange = (sku: string, warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    fetcher.submit({
      actionType: "updatePriorityWarehouse",
      sku,
      warehouseId,
      warehouseName: warehouse?.warehouse_name || "",
    }, { method: "POST" });
  };

  // 재고 이동 모달 열기
  const openTransferModal = (item: InventoryItem) => {
    setTransferModal({ open: true, item });
    const firstWarehouse = warehouses[0]?.id || "";
    const secondWarehouse = warehouses[1]?.id || firstWarehouse;
    setTransferFromWarehouse(firstWarehouse);
    setTransferToWarehouse(secondWarehouse);
    setTransferQuantity("");
  };

  // 재고 이동 실행
  const handleTransferStock = () => {
    if (!transferModal.item) return;
    const fromWarehouse = warehouses.find(w => w.id === transferFromWarehouse);
    const toWarehouse = warehouses.find(w => w.id === transferToWarehouse);
    fetcher.submit({
      actionType: "transferStock",
      sku: transferModal.item.sku,
      fromWarehouseId: transferFromWarehouse,
      toWarehouseId: transferToWarehouse,
      fromWarehouseName: fromWarehouse?.warehouse_name || "",
      toWarehouseName: toWarehouse?.warehouse_name || "",
      quantity: transferQuantity,
    }, { method: "POST" });
    setTransferModal({ open: false, item: null });
  };

  const handleBulkUpdate = () => {
    fetcher.submit({ actionType: "bulkUpdateThreshold", inventoryIds: JSON.stringify(Array.from(selectedItems)), alertThreshold: bulkThreshold }, { method: "POST" });
    setShowBulkDialog(false);
  };

  // 일괄 분배 핸들러 - 선택된 SKU들의 재고를 채널별로 분배
  const handleBulkDistribution = () => {
    if (selectedItems.size === 0) return;
    
    // 선택된 아이템들의 데이터 수집
    const selectedSkuData = sortedInventory
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        sku: item.sku,
        current_stock: item.current_stock,
        cafe24Variants: item.channel_mapping?.cafe24.map(v => ({
          product_no: v.product_no,
          variant_code: v.variant_code,
        })) || [],
        naverOptions: item.channel_mapping?.naver.map(o => ({
          origin_product_no: o.origin_product_no,
          option_combination_id: o.option_combination_id,
        })) || [],
      }));
    
    fetcher.submit({
      actionType: "bulkDistributeStock",
      items: JSON.stringify(selectedSkuData),
      cafe24Ratio: cafe24Ratio,
      naverRatio: naverRatio,
    }, { method: "POST" });
    
    setShowDistributionDialog(false);
    setSelectedItems(new Set());
  };


  const hasActiveFilters = search || filters.stockFilter !== "all" || filters.parentSku || filters.color || filters.size || filters.warehouse !== "all";

  // 테이블 행 렌더링 (Collapsible 제거 - HTML 테이블 구조 유지)
  const renderRow = (item: InventoryItem, index: number) => {
    const isExpanded = expandedRows.has(item.id);
    const hasMapping = item.channel_mapping && (item.channel_mapping.cafe24.length > 0 || item.channel_mapping.naver.length > 0);
    const rowBg = item.current_stock === 0 ? "bg-red-50" : item.current_stock <= item.alert_threshold ? "bg-amber-50" : "";

    return (
      <>
        <tr key={item.id} className={`border-b hover:bg-muted/50 ${rowBg} ${selectedItems.has(item.id) ? "bg-blue-50" : ""}`}>
          <td className="px-2 py-2 w-[50px]">
            <div className="flex items-center gap-1">
              <Checkbox
                checked={selectedItems.has(item.id)}
                onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
              />
              {hasMapping && (
                <button className="p-1 hover:bg-muted rounded" onClick={() => toggleRowExpand(item.id)}>
                  {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                </button>
              )}
            </div>
          </td>
          <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{item.sku}</td>
          <td className="px-2 py-2 max-w-[200px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm block truncate">{item.products?.product_name || "-"}</span>
              </TooltipTrigger>
              <TooltipContent side="top">{item.products?.product_name || "제품 정보 없음"}</TooltipContent>
            </Tooltip>
          </td>
          <td className="px-2 py-2 whitespace-nowrap">
            {item.products?.color_kr ? <ColorChip colorName={item.products.color_kr} /> : <span className="text-muted-foreground text-sm">-</span>}
          </td>
          <td className="px-2 py-2 text-center">
            {item.products?.sku_6_size ? (
              <Badge variant="secondary" className="text-xs">{item.products.sku_6_size}</Badge>
            ) : <span className="text-muted-foreground">-</span>}
          </td>
          <td className="px-2 py-2 min-w-[120px]">
            <StockProgressBar current={item.current_stock} threshold={item.alert_threshold} />
          </td>
          {/* 창고별 재고 컬럼 */}
          {warehouses.map((wh) => {
            const whStock = item.warehouse_stocks?.[wh.id] ?? 0;
            const isEditing = editingWarehouseStock?.sku === item.sku && editingWarehouseStock?.warehouseId === wh.id;
            return (
              <td key={wh.id} className="px-2 py-2 text-center">
                {isEditing ? (
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      value={editWarehouseStockValue}
                      onChange={(e) => setEditWarehouseStockValue(e.target.value)}
                      className="w-16 h-7 text-xs text-center"
                      min="0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveWarehouseStock();
                        if (e.key === "Escape") setEditingWarehouseStock(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveWarehouseStock} disabled={syncing}>
                      <CheckIcon className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingWarehouseStock(null)}>
                      <XIcon className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className={`px-2 py-1 rounded hover:bg-muted transition-colors min-w-[50px] ${
                      whStock === 0 ? "text-red-600 font-medium" : whStock < 10 ? "text-orange-600" : ""
                    }`}
                    onClick={() => {
                      setEditingWarehouseStock({ sku: item.sku, warehouseId: wh.id });
                      setEditWarehouseStockValue(String(whStock));
                    }}
                  >
                    {whStock}
                  </button>
                )}
              </td>
            );
          })}
          {/* 우선 출고 창고 */}
          <td className="px-2 py-2">
            <Select
              value={item.products?.priority_warehouse_id || defaultWarehouse?.id || ""}
              onValueChange={(v) => handlePriorityWarehouseChange(item.sku, v)}
              disabled={syncing}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue placeholder="창고 선택">
                  {warehouses.find(w => w.id === (item.products?.priority_warehouse_id || defaultWarehouse?.id))?.warehouse_name || "선택"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id} className="text-xs">
                    {wh.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
          <td className="px-2 py-2 text-center">
            {item.cafe24_stock !== null ? (
              <Badge variant="outline" className="border-blue-300 text-blue-700">{item.cafe24_stock}</Badge>
            ) : <span className="text-muted-foreground">-</span>}
          </td>
          <td className="px-2 py-2 text-center">
            {item.naver_stock !== null ? (
              <Badge variant="outline" className="border-green-300 text-green-700">{item.naver_stock}</Badge>
            ) : <span className="text-muted-foreground">-</span>}
          </td>
          <td className="px-2 py-2 text-right">
            {editingId === item.id ? (
              <div className="flex items-center justify-end gap-1">
                <Input
                  type="number"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                  className="w-14 h-7 text-xs text-right"
                  min="0"
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveThreshold(item)} disabled={syncing}>
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                  <XIcon className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1">
                <span>{item.alert_threshold}</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingId(item.id); setEditThreshold(String(item.alert_threshold || 10)); }}>
                  <PencilIcon className="h-3 w-3" />
                </Button>
              </div>
            )}
          </td>
          <td className="px-2 py-2 text-center">
            <div className="flex items-center justify-center gap-1">
              {/* 재고 이동 버튼 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => { e.stopPropagation(); openTransferModal(item); }}
                  >
                    <WarehouseIcon className="h-3 w-3 text-purple-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>창고 간 재고 이동</TooltipContent>
              </Tooltip>
              {/* 채널 재고 푸시 버튼 */}
              {hasMapping && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => { e.stopPropagation(); openStockPushModal(item); }}
                    >
                      <SendIcon className="h-3 w-3 text-blue-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>채널 재고 푸시</TooltipContent>
                </Tooltip>
              )}
            </div>
          </td>
        </tr>
        {hasMapping && isExpanded && (
          <tr key={`${item.id}-detail`} className="bg-muted/20">
            <td colSpan={12 + warehouses.length} className="p-0">
              <ChannelMappingDetail mapping={item.channel_mapping!} />
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6 p-6">
        {syncMessage && (
          <div className={`p-4 rounded-lg ${syncMessage.startsWith("✅") ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
            {syncMessage}
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PackageIcon className="h-6 w-6" />
              재고 관리
            </h1>
            <p className="text-muted-foreground">SKU별 재고 현황 및 채널 동기화</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCsvDownload}>
              <DownloadIcon className="h-4 w-4 mr-2" />CSV 다운로드
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowCsvUploadDialog(true); setCsvData([]); setCsvParseError(null); }}>
              <UploadIcon className="h-4 w-4 mr-2" />CSV 업로드
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("stockFilter", "all")}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">전체 SKU</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total.toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">총 재고</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 border-emerald-200" onClick={() => handleFilterChange("stockFilter", "normal")}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><CheckIcon className="h-4 w-4 text-emerald-500" />정상</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-500">{stats.normalStock.toLocaleString()}</div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 border-amber-200" onClick={() => handleFilterChange("stockFilter", "low")}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><AlertTriangleIcon className="h-4 w-4 text-amber-500" />재고 부족</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-500">{stats.lowStock.toLocaleString()}</div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 border-red-200" onClick={() => handleFilterChange("stockFilter", "zero")}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><AlertTriangleIcon className="h-4 w-4 text-red-500" />품절</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-500">{stats.zeroStock.toLocaleString()}</div></CardContent>
          </Card>
        </div>

        {/* 검색 & 필터 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="SKU로 검색..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
              </div>
              <Button type="submit">검색</Button>
            </form>

            <div className="flex flex-wrap gap-3 items-center">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={groupBy || "none"} onValueChange={(v) => handleFilterChange("groupBy", v)}>
                <SelectTrigger className="w-[140px]"><LayersIcon className="h-4 w-4 mr-2" /><SelectValue placeholder="그룹별 보기" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">그룹 없음</SelectItem>
                  <SelectItem value="parent">제품군별</SelectItem>
                  <SelectItem value="color">색상별</SelectItem>
                  <SelectItem value="status">상태별</SelectItem>
                  <SelectItem value="warehouse">창고별</SelectItem>
                </SelectContent>
              </Select>
              {filterOptions.warehouses && filterOptions.warehouses.length > 0 && (
                <Select value={filters.warehouse || "all"} onValueChange={(v) => handleFilterChange("warehouse", v)}>
                  <SelectTrigger className="w-[140px]">
                    <WarehouseIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="창고" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 창고</SelectItem>
                    {filterOptions.warehouses.map((w: Warehouse) => (
                      <SelectItem key={w.id} value={w.warehouse_code}>
                        {w.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filters.stockFilter || "all"} onValueChange={(v) => handleFilterChange("stockFilter", v)}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="재고 상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="normal">정상</SelectItem>
                  <SelectItem value="low">재고 부족</SelectItem>
                  <SelectItem value="zero">품절</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.parentSku || "all"} onValueChange={(v) => handleFilterChange("parentSku", v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="제품 분류" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 분류</SelectItem>
                  {filterOptions.parentSkus.map((p: any) => (
                    <SelectItem key={p.parent_sku} value={p.parent_sku}>{p.product_name || p.parent_sku}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.color || "all"} onValueChange={(v) => handleFilterChange("color", v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="색상" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 색상</SelectItem>
                  {filterOptions.colors.map((c: string) => (
                    <SelectItem key={c} value={c}><ColorChip colorName={c} /></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.size || "all"} onValueChange={(v) => handleFilterChange("size", v)}>
                <SelectTrigger className="w-[100px]"><SelectValue placeholder="사이즈" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {filterOptions.sizes.map((s: string) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
              {groupBy === "none" && (
                <Select value={String(limit)} onValueChange={(v) => window.location.href = buildUrl({ limit: v })}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[50, 100, 200, 500].map(n => (<SelectItem key={n} value={String(n)}>{n}개씩</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
              {hasActiveFilters && <Button variant="outline" size="sm" onClick={handleReset}>필터 초기화</Button>}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {search && <Badge variant="secondary">검색: {search}</Badge>}
                {filters.stockFilter && filters.stockFilter !== "all" && (
                  <Badge variant="secondary">상태: {filters.stockFilter === "low" ? "재고 부족" : filters.stockFilter === "zero" ? "품절" : "정상"}</Badge>
                )}
                {filters.parentSku && (
                  <Badge variant="secondary">분류: {filterOptions.parentSkus.find((p: any) => p.parent_sku === filters.parentSku)?.product_name || filters.parentSku}</Badge>
                )}
                {filters.color && <Badge variant="secondary">색상: {filters.color}</Badge>}
                {filters.size && <Badge variant="secondary">사이즈: {filters.size}</Badge>}
                {filters.warehouse && filters.warehouse !== "all" && (
                  <Badge variant="secondary">창고: {filterOptions.warehouses?.find((w: Warehouse) => w.warehouse_code === filters.warehouse)?.warehouse_name || filters.warehouse}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 일괄 처리 */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">{selectedItems.size}개 선택됨</span>
            <Button size="sm" variant="outline" onClick={() => setShowBulkDialog(true)}>
              <SettingsIcon className="h-4 w-4 mr-1" />안전재고 일괄 설정
            </Button>
            <Button size="sm" variant="default" onClick={() => setShowDistributionDialog(true)}>
              <SendIcon className="h-4 w-4 mr-1" />채널 재고 일괄 분배
            </Button>
          </div>
        )}

        {/* 재고 목록 */}
        {groupBy !== "none" ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {groupBy === "parent" ? "제품군별" : groupBy === "color" ? "색상별" : "상태별"} ({groupedInventory.length}개 그룹, {totalCount}개 SKU)
            </div>
            {groupedInventory.map((group) => (
              <Collapsible key={group.key} defaultOpen>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <ChevronDownIcon className="w-4 h-4" />
                      {groupBy === "color" && group.key !== "미지정" ? <ColorChip colorName={group.key} /> : <span className="font-medium">{group.label}</span>}
                      <Badge variant="secondary">{group.items.length} SKU</Badge>
                      <span className="text-sm text-muted-foreground">총 {group.totalStock.toLocaleString()}개</span>
                    </div>
                    <div className="flex gap-2">
                      {group.zeroStockCount > 0 && <Badge variant="destructive">품절 {group.zeroStockCount}</Badge>}
                      {group.lowStockCount > 0 && <Badge variant="outline" className="border-amber-500 text-amber-700">부족 {group.lowStockCount}</Badge>}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-2 py-3 text-left w-[50px]"></th>
                            <SortableHeader sortKey="sku" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>SKU</SortableHeader>
                            <SortableHeader sortKey="product_name" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>제품명</SortableHeader>
                            <SortableHeader sortKey="color" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>색상</SortableHeader>
                            <SortableHeader sortKey="size" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>사이즈</SortableHeader>
                            <SortableHeader sortKey="current_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>재고 현황</SortableHeader>
                            <SortableHeader sortKey="cafe24_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>Cafe24</SortableHeader>
                            <SortableHeader sortKey="naver_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>네이버</SortableHeader>
                            <SortableHeader sortKey="alert_threshold" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} className="text-right">안전재고</SortableHeader>
                            <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">푸시</th>
                          </tr>
                        </thead>
                        <tbody>{group.items.map((item, idx) => renderRow(item, idx))}</tbody>
                      </table>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>재고 목록</CardTitle>
              <CardDescription>
                {hasActiveFilters ? "필터링된 결과" : "전체 재고"} ({totalCount.toLocaleString()}개)
                <span className="text-xs ml-2">• 헤더 클릭으로 정렬 • 화살표 클릭으로 채널 맵핑 보기</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-2 py-3 text-left w-[50px]">
                        <Checkbox
                          checked={inventory.length > 0 && selectedItems.size === inventory.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </th>
                      <SortableHeader sortKey="sku" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>SKU</SortableHeader>
                      <SortableHeader sortKey="product_name" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>제품명</SortableHeader>
                      <SortableHeader sortKey="color" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>색상</SortableHeader>
                      <SortableHeader sortKey="size" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>사이즈</SortableHeader>
                      <SortableHeader sortKey="current_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>전체</SortableHeader>
                      {/* 창고별 컬럼 헤더 */}
                      {warehouses.map((wh) => (
                        <th key={wh.id} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <WarehouseIcon className="w-3 h-3" />
                            {wh.warehouse_name}
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">우선출고</th>
                      <SortableHeader sortKey="cafe24_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>Cafe24</SortableHeader>
                      <SortableHeader sortKey="naver_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>네이버</SortableHeader>
                      <SortableHeader sortKey="alert_threshold" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} className="text-right">안전재고</SortableHeader>
                      <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">푸시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInventory.map((item, idx) => renderRow(item, idx))}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-muted-foreground">
                          {hasActiveFilters ? "검색 결과가 없습니다" : "재고 데이터가 없습니다"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">페이지 {currentPage} / {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}>이전</Button>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}>다음</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 안전재고 일괄 설정 */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>안전재고 일괄 설정</DialogTitle>
              <DialogDescription>선택한 {selectedItems.size}개 항목의 안전재고를 일괄 설정합니다.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium">안전재고</label>
              <Input type="number" value={bulkThreshold} onChange={(e) => setBulkThreshold(e.target.value)} min="0" className="mt-2" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>취소</Button>
              <Button onClick={handleBulkUpdate} disabled={syncing}>{syncing ? "처리 중..." : "설정"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 채널 재고 일괄 분배 모달 */}
        <Dialog open={showDistributionDialog} onOpenChange={setShowDistributionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayersIcon className="h-5 w-5" />
                채널 재고 일괄 분배
              </DialogTitle>
              <DialogDescription>
                선택한 {selectedItems.size}개 SKU의 현재 재고를 비율에 맞게 각 채널에 분배합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 분배 비율 설정 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                    <StoreIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-sm w-24">Cafe24</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      value={cafe24Ratio}
                      onChange={(e) => setCafe24Ratio(e.target.value)}
                      min="0"
                      max="100"
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                    <ShoppingBagIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-sm w-24">네이버</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      value={naverRatio}
                      onChange={(e) => setNaverRatio(e.target.value)}
                      min="0"
                      max="100"
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <AlertTriangleIcon className="h-4 w-4 inline mr-1" />
                각 SKU의 현재 재고에 비율을 곱한 값이 해당 채널에 전송됩니다.
                <br />
                예: 현재 재고 100개, Cafe24 50% → Cafe24에 50개 설정
              </div>

              {/* 선택된 SKU 요약 */}
              <div className="text-xs text-muted-foreground">
                선택된 SKU 중 총 재고: {sortedInventory.filter(i => selectedItems.has(i.id)).reduce((sum, i) => sum + i.current_stock, 0).toLocaleString()}개
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDistributionDialog(false)}>취소</Button>
              <Button onClick={handleBulkDistribution} disabled={syncing}>
                <SendIcon className="h-4 w-4 mr-2" />
                {syncing ? "분배 중..." : "재고 분배"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 채널 재고 푸시 모달 */}
        <Dialog open={stockPushModal.open} onOpenChange={(open) => !open && setStockPushModal({ open: false, item: null })}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SendIcon className="h-5 w-5" />
                채널 재고 푸시
              </DialogTitle>
              <DialogDescription>
                선택한 SKU의 재고를 Cafe24 및 네이버 스마트스토어에 동기화합니다.
              </DialogDescription>
            </DialogHeader>
            {stockPushModal.item && (
              <div className="space-y-4">
                {/* SKU 정보 */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm font-medium">{stockPushModal.item.sku}</div>
                      <div className="text-xs text-muted-foreground">{stockPushModal.item.products?.product_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">현재 재고</div>
                      <div className="text-xl font-bold">{stockPushModal.item.current_stock}</div>
                    </div>
                  </div>
                </div>

                {/* 동기화 옵션 */}
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="syncBoth" 
                    checked={syncBoth} 
                    onCheckedChange={(checked) => {
                      setSyncBoth(!!checked);
                      if (checked) {
                        setNaverPushStock(cafe24PushStock);
                      }
                    }}
                  />
                  <label htmlFor="syncBoth" className="text-sm">동일 재고로 동기화</label>
                </div>

                {/* Cafe24 재고 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                      <StoreIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-sm">Cafe24</span>
                    {stockPushModal.item.channel_mapping?.cafe24.length === 0 && (
                      <Badge variant="outline" className="text-xs">맵핑 없음</Badge>
                    )}
                    {stockPushModal.item.channel_mapping?.cafe24.length! > 0 && (
                      <Badge variant="secondary" className="text-xs">{stockPushModal.item.channel_mapping?.cafe24.length}개 옵션</Badge>
                    )}
                  </div>
                  {stockPushModal.item.channel_mapping?.cafe24.length! > 0 && (
                    <Input 
                      type="number" 
                      value={cafe24PushStock} 
                      onChange={(e) => {
                        setCafe24PushStock(e.target.value);
                        if (syncBoth) setNaverPushStock(e.target.value);
                      }}
                      min="0"
                      placeholder="재고 수량"
                    />
                  )}
                </div>

                {/* 네이버 재고 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                      <ShoppingBagIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-sm">네이버 스마트스토어</span>
                    {stockPushModal.item.channel_mapping?.naver.length === 0 && (
                      <Badge variant="outline" className="text-xs">맵핑 없음</Badge>
                    )}
                    {stockPushModal.item.channel_mapping?.naver.length! > 0 && (
                      <Badge variant="secondary" className="text-xs">{stockPushModal.item.channel_mapping?.naver.length}개 옵션</Badge>
                    )}
                  </div>
                  {stockPushModal.item.channel_mapping?.naver.length! > 0 && (
                    <Input 
                      type="number" 
                      value={naverPushStock} 
                      onChange={(e) => setNaverPushStock(e.target.value)}
                      min="0"
                      placeholder="재고 수량"
                      disabled={syncBoth}
                    />
                  )}
                </div>

                {/* 경고 */}
                {(stockPushModal.item.channel_mapping?.cafe24.length! > 0 || stockPushModal.item.channel_mapping?.naver.length! > 0) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangleIcon className="h-4 w-4 inline mr-1" />
                    입력한 재고 수량이 해당 채널의 모든 맵핑된 옵션에 적용됩니다.
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStockPushModal({ open: false, item: null })}>취소</Button>
              <Button 
                onClick={handlePushChannelStock} 
                disabled={syncing || (!stockPushModal.item?.channel_mapping?.cafe24.length && !stockPushModal.item?.channel_mapping?.naver.length)}
              >
                <SendIcon className="h-4 w-4 mr-2" />
                {syncing ? "전송 중..." : "재고 전송"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 재고 이동 모달 */}
        <Dialog open={transferModal.open} onOpenChange={(open) => setTransferModal({ open, item: open ? transferModal.item : null })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <WarehouseIcon className="h-5 w-5" />
                창고 간 재고 이동
              </DialogTitle>
              <DialogDescription>
                선택한 SKU의 재고를 다른 창고로 이동합니다.
              </DialogDescription>
            </DialogHeader>
            {transferModal.item && (
              <div className="space-y-4">
                {/* SKU 정보 */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-mono text-sm font-medium">{transferModal.item.sku}</div>
                  <div className="text-xs text-muted-foreground">{transferModal.item.products?.product_name}</div>
                </div>

                {/* 출발 창고 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">출발 창고</label>
                  <Select value={transferFromWarehouse} onValueChange={setTransferFromWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="출발 창고 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.warehouse_name} (재고: {transferModal.item?.warehouse_stocks?.[wh.id] ?? 0}개)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 도착 창고 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">도착 창고</label>
                  <Select value={transferToWarehouse} onValueChange={setTransferToWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="도착 창고 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.filter(wh => wh.id !== transferFromWarehouse).map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.warehouse_name} (재고: {transferModal.item?.warehouse_stocks?.[wh.id] ?? 0}개)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 이동 수량 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">이동 수량</label>
                  <Input
                    type="number"
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    min="1"
                    max={transferModal.item?.warehouse_stocks?.[transferFromWarehouse] ?? 0}
                    placeholder="이동할 수량 입력"
                  />
                  <p className="text-xs text-muted-foreground">
                    출발 창고 현재 재고: {transferModal.item?.warehouse_stocks?.[transferFromWarehouse] ?? 0}개
                  </p>
                </div>

                {/* 이동 결과 미리보기 */}
                {transferQuantity && parseInt(transferQuantity) > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div className="font-medium mb-2">이동 후 예상 재고</div>
                    <div className="flex justify-between">
                      <span>{warehouses.find(w => w.id === transferFromWarehouse)?.warehouse_name}:</span>
                      <span className="font-mono">
                        {(transferModal.item?.warehouse_stocks?.[transferFromWarehouse] ?? 0) - parseInt(transferQuantity)}개
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{warehouses.find(w => w.id === transferToWarehouse)?.warehouse_name}:</span>
                      <span className="font-mono">
                        {(transferModal.item?.warehouse_stocks?.[transferToWarehouse] ?? 0) + parseInt(transferQuantity)}개
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferModal({ open: false, item: null })}>취소</Button>
              <Button
                onClick={handleTransferStock}
                disabled={
                  syncing ||
                  !transferFromWarehouse ||
                  !transferToWarehouse ||
                  transferFromWarehouse === transferToWarehouse ||
                  !transferQuantity ||
                  parseInt(transferQuantity) <= 0 ||
                  parseInt(transferQuantity) > (transferModal.item?.warehouse_stocks?.[transferFromWarehouse] ?? 0)
                }
              >
                <WarehouseIcon className="h-4 w-4 mr-2" />
                {syncing ? "이동 중..." : "재고 이동"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV 업로드 모달 */}
        <Dialog open={showCsvUploadDialog} onOpenChange={setShowCsvUploadDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileUpIcon className="h-5 w-5" />
                CSV 재고 일괄 수정
              </DialogTitle>
              <DialogDescription>
                CSV 파일을 업로드하여 창고별 재고를 일괄 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-auto flex-1">
              {/* 파일 업로드 */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    CSV 파일을 선택하거나 여기로 드래그하세요
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV 다운로드로 받은 파일의 창고 재고 열을 수정하세요
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    파일 선택
                  </Button>
                </label>
              </div>

              {/* 파싱 오류 */}
              {csvParseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {csvParseError}
                </div>
              )}

              {/* 변경 미리보기 */}
              {csvData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">변경 미리보기 ({csvData.length}건)</h4>
                    <Badge variant="secondary">{csvData.length}개 항목이 변경됩니다</Badge>
                  </div>
                  <div className="border rounded-lg max-h-[300px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">SKU</th>
                          <th className="px-3 py-2 text-left font-medium">제품명</th>
                          <th className="px-3 py-2 text-left font-medium">창고</th>
                          <th className="px-3 py-2 text-right font-medium">현재</th>
                          <th className="px-3 py-2 text-center font-medium">→</th>
                          <th className="px-3 py-2 text-right font-medium">변경</th>
                          <th className="px-3 py-2 text-right font-medium">차이</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((item, idx) => {
                          const diff = item.newQuantity - item.oldQuantity;
                          return (
                            <tr key={idx} className="border-t hover:bg-muted/30">
                              <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                              <td className="px-3 py-2 text-xs truncate max-w-[150px]">{item.productName}</td>
                              <td className="px-3 py-2 text-xs">{item.warehouseName}</td>
                              <td className="px-3 py-2 text-right font-mono">{item.oldQuantity}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">→</td>
                              <td className="px-3 py-2 text-right font-mono font-medium">{item.newQuantity}</td>
                              <td className={`px-3 py-2 text-right font-mono font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                                {diff > 0 ? "+" : ""}{diff}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCsvUploadDialog(false)}>취소</Button>
              <Button
                onClick={handleCsvImport}
                disabled={syncing || csvData.length === 0}
              >
                {syncing ? "적용 중..." : `${csvData.length}개 항목 적용`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 범례 */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-blue-300 text-blue-700">Cafe24</Badge>
                <span className="text-muted-foreground">자사몰</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-300 text-green-700">네이버</Badge>
                <span className="text-muted-foreground">스마트스토어</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-2 bg-emerald-500 rounded-full" />
                <span className="text-muted-foreground">정상</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-2 bg-amber-500 rounded-full" />
                <span className="text-muted-foreground">부족</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-2 bg-red-500 rounded-full" />
                <span className="text-muted-foreground">품절</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
