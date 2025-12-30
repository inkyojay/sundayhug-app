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
  PencilIcon,
  CheckIcon,
  XIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LayersIcon,
  StoreIcon,
  ShoppingBagIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WarehouseIcon,
  ExternalLinkIcon,
  SendIcon,
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

export const meta: Route.MetaFunction = () => {
  return [{ title: `재고 관리 | Sundayhug Admin` }];
};

// 색상 맵핑
const COLOR_MAP: Record<string, string> = {
  "크림": "#FFFDD0",
  "아이보리": "#FFFFF0",
  "화이트": "#FFFFFF",
  "블랙": "#1a1a1a",
  "그레이": "#808080",
  "차콜": "#36454F",
  "네이비": "#000080",
  "블루": "#0066CC",
  "스카이블루": "#87CEEB",
  "민트": "#98FF98",
  "그린": "#228B22",
  "카키": "#6B8E23",
  "올리브": "#808000",
  "베이지": "#F5F5DC",
  "브라운": "#8B4513",
  "카멜": "#C19A6B",
  "핑크": "#FFC0CB",
  "레드": "#DC143C",
  "버건디": "#800020",
  "와인": "#722F37",
  "퍼플": "#800080",
  "라벤더": "#E6E6FA",
  "오렌지": "#FF8C00",
  "옐로우": "#FFD700",
  "실버": "#C0C0C0",
  "골드": "#FFD700",
  "딥씨": "#006994",
  "모카": "#967969",
  "버터밀크": "#FFFFC2",
  "밤부": "#E3DBC9",
  "더스티핑크": "#D4A5A5",
  "밀크화이트": "#FDFFF5",
  "내추럴": "#D4B896",
  "데일리크림": "#FFF8DC",
  "베이비핑크": "#F4C2C2",
  "올리브그린": "#556B2F",
  "제이드그린": "#00A86B",
  "페어핑크": "#FFB6C1",
  "페어베이지": "#F5DEB3",
  "벌룬블루": "#6495ED",
  "벌룬베이지": "#DEB887",
  "오트베이지": "#C3B091",
};

// 색상칩 컴포넌트
function ColorChip({ colorName, showLabel = true }: { colorName: string; showLabel?: boolean }) {
  const findColor = (name: string): string => {
    if (COLOR_MAP[name]) return COLOR_MAP[name];
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(COLOR_MAP)) {
      if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
        return value;
      }
    }
    return "#E5E7EB";
  };

  const bgColor = findColor(colorName);
  const isDark = ["블랙", "네이비", "차콜", "버건디", "와인", "딥씨"].some(c => colorName.includes(c));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div
            className="w-4 h-4 rounded-full border flex-shrink-0"
            style={{
              backgroundColor: bgColor,
              borderColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
            }}
          />
          {showLabel && <span className="text-xs truncate max-w-[80px]">{colorName}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent>{colorName}</TooltipContent>
    </Tooltip>
  );
}

// 채널 맵핑 정보 타입
interface ChannelMapping {
  cafe24: Array<{
    product_no: number;
    product_name: string;
    variant_code: string;
    options: any;
    stock_quantity: number;
    display: string;
    selling: string;
  }>;
  naver: Array<{
    origin_product_no: number;
    channel_product_no: number | null;
    product_name: string;
    option_name1: string | null;
    option_value1: string | null;
    option_name2: string | null;
    option_value2: string | null;
    stock_quantity: number;
    use_yn: string;
    option_combination_id: number;
  }>;
}

// 창고 타입
interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
}

// 재고 아이템 타입
interface InventoryItem {
  id: string;
  sku: string;
  current_stock: number;
  previous_stock: number | null;
  stock_change: number | null;
  alert_threshold: number;
  synced_at: string | null;
  products: {
    product_name: string;
    parent_sku: string;
    color_kr: string | null;
    sku_6_size: string | null;
  } | null;
  cafe24_stock: number | null;
  cafe24_synced: string | null;
  naver_stock: number | null;
  naver_synced: string | null;
  channel_mapping?: ChannelMapping;
}

// 그룹 타입
interface InventoryGroup {
  key: string;
  label: string;
  items: InventoryItem[];
  totalStock: number;
  lowStockCount: number;
  zeroStockCount: number;
}

// 정렬 타입
type SortKey = "sku" | "product_name" | "color" | "size" | "current_stock" | "cafe24_stock" | "naver_stock" | "alert_threshold";
type SortOrder = "asc" | "desc";

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const stockFilter = url.searchParams.get("stockFilter") || "all";
  const parentSku = url.searchParams.get("parentSku") || "";
  const color = url.searchParams.get("color") || "";
  const size = url.searchParams.get("size") || "";
  const warehouseFilter = url.searchParams.get("warehouse") || "all";
  const groupBy = url.searchParams.get("groupBy") || "none";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limitParam = url.searchParams.get("limit") || "100";
  const limit = parseInt(limitParam);
  const offset = (page - 1) * limit;

  // 필터 옵션 및 창고 목록
  const [parentSkusResult, colorsResult, sizesResult, warehousesResult] = await Promise.all([
    supabase.from("parent_products").select("parent_sku, product_name").order("product_name", { ascending: true }),
    supabase.from("products").select("color_kr").not("color_kr", "is", null).not("color_kr", "eq", ""),
    supabase.from("products").select("sku_6_size").not("sku_6_size", "is", null).not("sku_6_size", "eq", ""),
    supabase.from("warehouses").select("id, warehouse_code, warehouse_name, warehouse_type").eq("is_active", true).or("is_deleted.is.null,is_deleted.eq.false"),
  ]);

  const parentSkuOptions = parentSkusResult.data || [];
  const colorOptions = [...new Set(colorsResult.data?.map((c: any) => c.color_kr))].sort();
  const sizeOptions = [...new Set(sizesResult.data?.map((s: any) => s.sku_6_size))].sort();
  const warehouses = warehousesResult.data || [];

  // 통계
  const { data: latestInventory } = await supabase
    .from("inventory")
    .select("sku, current_stock, alert_threshold")
    .order("synced_at", { ascending: false });

  const uniqueInventory = new Map();
  latestInventory?.forEach((item: any) => {
    if (!uniqueInventory.has(item.sku)) uniqueInventory.set(item.sku, item);
  });
  const uniqueItems = Array.from(uniqueInventory.values());

  const stats = {
    total: uniqueItems.length,
    totalStock: uniqueItems.reduce((sum, item) => sum + (item.current_stock || 0), 0),
    lowStock: uniqueItems.filter(item => item.current_stock <= item.alert_threshold && item.current_stock > 0).length,
    zeroStock: uniqueItems.filter(item => item.current_stock === 0).length,
    normalStock: uniqueItems.filter(item => item.current_stock > item.alert_threshold).length,
  };

  // 재고 목록 조회
  let query = supabase
    .from("inventory")
    .select(`
      id, sku, current_stock, previous_stock, stock_change, alert_threshold, synced_at,
      products!inner (product_name, parent_sku, color_kr, sku_6_size)
    `)
    .order("synced_at", { ascending: false });

  if (stockFilter === "low") query = query.gt("current_stock", 0).lte("current_stock", 10);
  else if (stockFilter === "zero") query = query.eq("current_stock", 0);
  else if (stockFilter === "normal") query = query.gt("current_stock", 10);

  if (search) query = query.ilike("sku", `%${search}%`);
  if (parentSku) query = query.eq("products.parent_sku", parentSku);
  if (color) query = query.eq("products.color_kr", color);
  if (size) query = query.eq("products.sku_6_size", size);

  // 전체 개수
  let countQuery = supabase.from("inventory").select("*, products!inner(*)", { count: "exact", head: true });
  if (stockFilter === "low") countQuery = countQuery.gt("current_stock", 0).lte("current_stock", 10);
  else if (stockFilter === "zero") countQuery = countQuery.eq("current_stock", 0);
  else if (stockFilter === "normal") countQuery = countQuery.gt("current_stock", 10);
  if (search) countQuery = countQuery.ilike("sku", `%${search}%`);
  if (parentSku) countQuery = countQuery.eq("products.parent_sku", parentSku);
  if (color) countQuery = countQuery.eq("products.color_kr", color);
  if (size) countQuery = countQuery.eq("products.sku_6_size", size);
  
  const { count: totalCount } = await countQuery;

  // 그룹별 보기일 경우 전체 조회
  const finalQuery = groupBy !== "none" ? query : query.range(offset, offset + limit - 1);
  const { data: inventory } = await finalQuery;

  const skus = inventory?.map((i: any) => i.sku) || [];
  const [cafe24Result, naverResult, cafe24ProductsResult, naverProductsResult] = await Promise.all([
    supabase.from("cafe24_product_variants").select("sku, product_no, variant_code, options, stock_quantity, display, selling, synced_at").in("sku", skus),
    supabase.from("naver_product_options").select("seller_management_code, origin_product_no, option_combination_id, option_name1, option_value1, option_name2, option_value2, stock_quantity, use_yn, synced_at").in("seller_management_code", skus),
    supabase.from("cafe24_products").select("product_no, product_name"),
    supabase.from("naver_products").select("origin_product_no, channel_product_no, product_name"),
  ]);

  const cafe24ProductMap = new Map((cafe24ProductsResult.data || []).map((p: any) => [p.product_no, p.product_name]));
  const naverProductMap = new Map((naverProductsResult.data || []).map((p: any) => [p.origin_product_no, { product_name: p.product_name, channel_product_no: p.channel_product_no }]));

  // Cafe24 중복 제거: 같은 product_no + 같은 options 조합에서 최신 것만 유지
  const cafe24Unique = new Map<string, any>();
  (cafe24Result.data || []).forEach((v: any) => {
    const optionsKey = JSON.stringify(v.options || []);
    const uniqueKey = `${v.sku}_${v.product_no}_${optionsKey}`;
    const existing = cafe24Unique.get(uniqueKey);
    if (!existing || new Date(v.synced_at || 0) > new Date(existing.synced_at || 0)) {
      cafe24Unique.set(uniqueKey, { ...v, product_name: cafe24ProductMap.get(v.product_no) || "" });
    }
  });

  // 네이버 중복 제거: 같은 origin_product_no + 같은 option 조합에서 최신 것만 유지
  const naverUnique = new Map<string, any>();
  (naverResult.data || []).forEach((o: any) => {
    const optionsKey = `${o.option_name1}_${o.option_value1}_${o.option_name2}_${o.option_value2}`;
    const uniqueKey = `${o.seller_management_code}_${o.origin_product_no}_${optionsKey}`;
    const existing = naverUnique.get(uniqueKey);
    const naverProduct = naverProductMap.get(o.origin_product_no);
    if (!existing || new Date(o.synced_at || 0) > new Date(existing.synced_at || 0)) {
      naverUnique.set(uniqueKey, { 
        ...o, 
        product_name: naverProduct?.product_name || "", 
        channel_product_no: naverProduct?.channel_product_no || null,
      });
    }
  });

  // SKU별로 그룹핑
  const cafe24BySku = new Map<string, any[]>();
  const naverBySku = new Map<string, any[]>();
  
  cafe24Unique.forEach((v) => {
    const list = cafe24BySku.get(v.sku) || [];
    list.push(v);
    cafe24BySku.set(v.sku, list);
  });
  
  naverUnique.forEach((o) => {
    const list = naverBySku.get(o.seller_management_code) || [];
    list.push(o);
    naverBySku.set(o.seller_management_code, list);
  });

  const enrichedInventory = (inventory || []).map((item: any) => {
    const cafe24List = cafe24BySku.get(item.sku) || [];
    const naverList = naverBySku.get(item.sku) || [];
    const latestCafe24 = cafe24List.sort((a, b) => new Date(b.synced_at || 0).getTime() - new Date(a.synced_at || 0).getTime())[0];
    const latestNaver = naverList.sort((a, b) => new Date(b.synced_at || 0).getTime() - new Date(a.synced_at || 0).getTime())[0];
    
    return {
      ...item,
      cafe24_stock: cafe24List.length > 0 ? cafe24List.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) : null,
      cafe24_synced: latestCafe24?.synced_at || null,
      naver_stock: naverList.length > 0 ? naverList.reduce((sum, o) => sum + (o.stock_quantity || 0), 0) : null,
      naver_synced: latestNaver?.synced_at || null,
      channel_mapping: { cafe24: cafe24List, naver: naverList },
    };
  });

  return {
    inventory: enrichedInventory,
    stats,
    totalCount: totalCount || 0,
    currentPage: groupBy !== "none" ? 1 : page,
    totalPages: groupBy !== "none" ? 1 : Math.ceil((totalCount || 0) / limit),
    limit,
    search,
    groupBy,
    filters: { stockFilter, parentSku, color, size, warehouse: warehouseFilter },
    filterOptions: { parentSkus: parentSkuOptions, colors: colorOptions, sizes: sizeOptions, warehouses },
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
    const { error } = await adminClient.from("inventory").update({ alert_threshold: alertThreshold }).eq("id", inventoryId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: "안전재고가 업데이트되었습니다." };
  }

  if (actionType === "bulkUpdateThreshold") {
    const inventoryIds = JSON.parse(formData.get("inventoryIds") as string) as string[];
    const alertThreshold = parseInt(formData.get("alertThreshold") as string);
    let successCount = 0;
    for (const id of inventoryIds) {
      const { error } = await adminClient.from("inventory").update({ alert_threshold: alertThreshold }).eq("id", id);
      if (!error) successCount++;
    }
    return { success: true, message: `${successCount}개 항목의 안전재고가 ${alertThreshold}로 설정되었습니다.` };
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

  return { success: false, error: "지원하지 않는 액션입니다." };
}

// 재고 프로그레스 바
function StockProgressBar({ current, threshold }: { current: number; threshold: number }) {
  const maxStock = Math.max(threshold * 3, 50);
  const percentage = Math.min((current / maxStock) * 100, 100);
  const thresholdPercentage = (threshold / maxStock) * 100;
  
  let barColor = "bg-emerald-500";
  if (current === 0) barColor = "bg-red-500";
  else if (current <= threshold) barColor = "bg-amber-500";

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-medium w-10 text-right text-sm">{current}</span>
      <div className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden" style={{ minWidth: 60 }}>
        <div className={`absolute left-0 top-0 h-full ${barColor} rounded-full`} style={{ width: `${percentage}%` }} />
        <div className="absolute top-0 w-0.5 h-full bg-gray-400" style={{ left: `${thresholdPercentage}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">안전:{threshold}</span>
    </div>
  );
}

// 채널 맵핑 상세
function ChannelMappingDetail({ mapping }: { mapping: ChannelMapping }) {
  if (!mapping.cafe24.length && !mapping.naver.length) {
    return <div className="text-sm text-muted-foreground p-4">채널에 맵핑된 상품이 없습니다.</div>;
  }

  // 옵션 값 포맷팅 함수
  const formatOptions = (options: any): string => {
    if (!options) return "";
    if (typeof options === "string") return options;
    if (Array.isArray(options)) {
      return options.map((opt: any) => {
        if (typeof opt === "string") return opt;
        if (opt && typeof opt === "object") {
          return opt.value || opt.name || JSON.stringify(opt);
        }
        return "";
      }).filter(Boolean).join(" / ");
    }
    if (typeof options === "object") {
      return Object.values(options).filter(v => v && typeof v !== "object").join(" / ");
    }
    return "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/30">
      {/* Cafe24 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
            <StoreIcon className="w-3 h-3 text-white" />
          </div>
          Cafe24 ({mapping.cafe24.length}개)
        </div>
        {mapping.cafe24.length === 0 ? (
          <div className="text-xs text-muted-foreground">맵핑 없음</div>
        ) : (
          <div className="space-y-1">
            {mapping.cafe24.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{item.product_name || `상품 #${item.product_no}`}</span>
                    <button
                      className="p-0.5 hover:bg-muted rounded text-blue-500 flex-shrink-0"
                      onClick={() => window.open(`https://sundayhug.kr/surl/p/${item.product_no}`, "_blank")}
                      title="Cafe24에서 보기"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-muted-foreground truncate">
                    {formatOptions(item.options) || item.variant_code}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={item.stock_quantity > 0 ? "secondary" : "destructive"} className="text-xs">{item.stock_quantity}</Badge>
                  {item.selling === "T" && item.display === "T" ? (
                    <span className="text-green-600 text-[10px]">판매중</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">미판매</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 네이버 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
            <ShoppingBagIcon className="w-3 h-3 text-white" />
          </div>
          네이버 스마트스토어 ({mapping.naver.length}개)
        </div>
        {mapping.naver.length === 0 ? (
          <div className="text-xs text-muted-foreground">맵핑 없음</div>
        ) : (
          <div className="space-y-1">
            {mapping.naver.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{item.product_name || `상품 #${item.origin_product_no}`}</span>
                    <button
                      className="p-0.5 hover:bg-muted rounded text-green-500 flex-shrink-0"
                      onClick={() => {
                        const productNo = item.channel_product_no || item.origin_product_no;
                        window.open(`https://brand.naver.com/sundayhug/products/${productNo}`, "_blank");
                      }}
                      title="스마트스토어에서 보기"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-muted-foreground truncate">
                    {[
                      item.option_name1 && item.option_value1 ? `${item.option_name1}: ${item.option_value1}` : null,
                      item.option_name2 && item.option_value2 ? `${item.option_name2}: ${item.option_value2}` : null,
                    ].filter(Boolean).join(" / ") || "단일옵션"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={item.stock_quantity > 0 ? "secondary" : "destructive"} className="text-xs">{item.stock_quantity}</Badge>
                  {item.use_yn === "Y" ? (
                    <span className="text-green-600 text-[10px]">사용</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">미사용</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 정렬 헤더
function SortableHeader({ 
  children, 
  sortKey, 
  currentSort, 
  currentOrder, 
  onSort,
  className = "",
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentOrder: SortOrder;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isSorted = currentSort === sortKey;
  
  return (
    <th 
      className={`px-3 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isSorted ? (
          currentOrder === "asc" ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
        ) : (
          <ArrowUpDownIcon className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );
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
  
  // 정렬 상태
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  
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

  const handleExportCSV = () => {
    const headers = ["SKU", "제품명", "분류", "색상", "사이즈", "현재고", "안전재고", "Cafe24재고", "네이버재고"];
    const rows = sortedInventory.map((item) => [
      item.sku, item.products?.product_name || "", item.products?.parent_sku || "",
      item.products?.color_kr || "", item.products?.sku_6_size || "",
      item.current_stock, item.alert_threshold, item.cafe24_stock ?? "", item.naver_stock ?? "",
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
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
          <td className="px-2 py-2 min-w-[160px]">
            <StockProgressBar current={item.current_stock} threshold={item.alert_threshold} />
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
          </td>
        </tr>
        {hasMapping && isExpanded && (
          <tr key={`${item.id}-detail`} className="bg-muted/20">
            <td colSpan={10} className="p-0">
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
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <DownloadIcon className="h-4 w-4 mr-2" />CSV
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
                      <SortableHeader sortKey="current_stock" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort}>재고 현황</SortableHeader>
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
