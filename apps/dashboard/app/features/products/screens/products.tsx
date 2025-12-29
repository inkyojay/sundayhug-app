/**
 * 제품 관리 - 제품 목록 (고급 기능)
 * 
 * 기능:
 * - 인라인 편집 (색상/사이즈는 셀렉트)
 * - 체크박스 일괄 변경
 * - 정렬 (Sorting)
 * - 그룹핑
 * - 변경 확인 알람
 * - 변경 로그 기록
 * - CSV 다운로드/업로드 (Upsert)
 */
import type { Route } from "./+types/products";

import { 
  BoxIcon, 
  SearchIcon, 
  RefreshCwIcon, 
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  StoreIcon,
  ShoppingCartIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  PlusIcon,
  DownloadIcon,
  UploadIcon,
  Trash2Icon,
  ArrowUpDownIcon,
  GroupIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/core/components/ui/alert-dialog";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";

import makeServerClient from "~/core/lib/supa-client.server";

// 색상명 → 실제 색상 코드 매핑
const colorMap: Record<string, string> = {
  // 기본 색상
  "화이트": "#FFFFFF", "흰색": "#FFFFFF", "white": "#FFFFFF", "아이보리": "#FFFFF0",
  "블랙": "#1a1a1a", "검정": "#1a1a1a", "black": "#1a1a1a", "차콜": "#36454F",
  "그레이": "#808080", "회색": "#808080", "gray": "#808080", "grey": "#808080",
  "라이트그레이": "#D3D3D3", "다크그레이": "#404040",
  // 브라운 계열
  "브라운": "#8B4513", "갈색": "#8B4513", "brown": "#8B4513",
  "어스브라운": "#6B4423", "다크브라운": "#3D2914", "라이트브라운": "#A0522D",
  "베이지": "#F5F5DC", "beige": "#F5F5DC", "탄": "#D2B48C", "카멜": "#C19A6B",
  "크림": "#FFFDD0", "데일리크림": "#FFFDD0", "cream": "#FFFDD0",
  "카키": "#8B8B00", "khaki": "#F0E68C", "올리브": "#808000",
  // 블루 계열  
  "네이비": "#000080", "navy": "#000080", "블루": "#0000FF", "blue": "#0000FF",
  "스카이블루": "#87CEEB", "라이트블루": "#ADD8E6", "다크블루": "#00008B",
  "인디고": "#4B0082", "민트": "#98FF98", "청록": "#008B8B", "틸": "#008080",
  // 핑크/레드 계열
  "핑크": "#FFC0CB", "pink": "#FFC0CB", "로즈": "#FF007F", "코랄": "#FF7F50",
  "레드": "#FF0000", "빨강": "#FF0000", "red": "#FF0000", "와인": "#722F37",
  "버건디": "#800020", "마룬": "#800000", "살몬": "#FA8072",
  // 그린 계열
  "그린": "#008000", "녹색": "#008000", "green": "#008000",
  "라이트그린": "#90EE90", "다크그린": "#006400", "포레스트": "#228B22",
  // 옐로우/오렌지 계열
  "옐로우": "#FFFF00", "노랑": "#FFFF00", "yellow": "#FFFF00",
  "오렌지": "#FFA500", "주황": "#FFA500", "orange": "#FFA500",
  "머스타드": "#FFDB58", "골드": "#FFD700", "레몬": "#FFF44F",
  // 퍼플 계열
  "퍼플": "#800080", "보라": "#800080", "purple": "#800080",
  "라벤더": "#E6E6FA", "바이올렛": "#EE82EE", "플럼": "#DDA0DD",
};

// 색상명에서 색상 코드 추출
function getColorCode(colorName: string): string | null {
  if (!colorName) return null;
  const lowerName = colorName.toLowerCase().replace(/\s/g, "");
  
  // 정확한 매칭
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase().replace(/\s/g, ""))) {
      return value;
    }
  }
  return null;
}

// 배경색에 따른 텍스트 색상 결정
function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// 색상 뱃지 컴포넌트
function ColorBadge({ colorName }: { colorName: string }) {
  const bgColor = getColorCode(colorName);
  
  if (bgColor) {
    const textColor = getContrastColor(bgColor);
    const borderColor = bgColor === "#FFFFFF" || bgColor === "#FFFFF0" || bgColor === "#FFFDD0" 
      ? "border border-gray-300" 
      : "";
    return (
      <span 
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${borderColor}`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {colorName}
      </span>
    );
  }
  
  return (
    <Badge variant="outline" className="text-xs">{colorName}</Badge>
  );
}

export const meta: Route.MetaFunction = () => {
  return [{ title: `제품 관리 | Sundayhug Admin` }];
};

// 채널 매핑 타입
interface ChannelMapping {
  cafe24: {
    variant_code: string;
    stock_quantity: number;
    additional_price: number;
    product_name: string;
  } | null;
  naver: {
    option_combination_id: number;
    stock_quantity: number;
    price: number;
    product_name: string;
  } | null;
}

// 판매 집계 타입
interface SalesData {
  cafe24: { orderCount: number; totalSales: number };
  naver: { orderCount: number; totalSales: number };
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const parentSku = url.searchParams.get("parentSku") || "";
  const color = url.searchParams.get("color") || "";
  const size = url.searchParams.get("size") || "";
  const sortBy = url.searchParams.get("sortBy") || "updated_at";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  const groupBy = url.searchParams.get("groupBy") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // 필터 옵션 데이터 가져오기
  const [parentSkusResult, colorsResult, sizesResult] = await Promise.all([
    supabase
      .from("parent_products")
      .select("parent_sku, product_name")
      .order("product_name", { ascending: true }),
    supabase
      .from("products")
      .select("color_kr")
      .not("color_kr", "is", null)
      .not("color_kr", "eq", ""),
    supabase
      .from("products")
      .select("sku_6_size")
      .not("sku_6_size", "is", null)
      .not("sku_6_size", "eq", ""),
  ]);

  const parentSkuOptions = parentSkusResult.data || [];
  const colorOptions = [...new Set(colorsResult.data?.map((c: any) => c.color_kr))].sort();
  const sizeOptions = [...new Set(sizesResult.data?.map((s: any) => s.sku_6_size))].sort();

  // 제품 수 쿼리
  let countQuery = supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  
  // 제품 목록 쿼리
  let query = supabase
    .from("products")
    .select("*")
    .order(sortBy, { ascending: sortOrder === "asc" });

  // 필터 적용
  if (search) {
    countQuery = countQuery.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
    query = query.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
  }
  if (parentSku) {
    countQuery = countQuery.eq("parent_sku", parentSku);
    query = query.eq("parent_sku", parentSku);
  }
  if (color) {
    countQuery = countQuery.eq("color_kr", color);
    query = query.eq("color_kr", color);
  }
  if (size) {
    countQuery = countQuery.eq("sku_6_size", size);
    query = query.eq("sku_6_size", size);
  }
  
  const { count: totalCount } = await countQuery;

  query = query.range(offset, offset + limit - 1);
  const { data: products } = await query;

  // 채널 매핑 조회
  const skuList = (products || []).map((p: any) => p.sku).filter(Boolean);

  const [cafe24VariantsResult, naverOptionsResult] = await Promise.all([
    skuList.length > 0 
      ? supabase
          .from("cafe24_product_variants")
          .select("sku, variant_code, stock_quantity, additional_price, product_no")
          .in("sku", skuList)
      : Promise.resolve({ data: [] }),
    skuList.length > 0 
      ? supabase
          .from("naver_product_options")
          .select("seller_management_code, option_combination_id, stock_quantity, price, origin_product_no")
          .in("seller_management_code", skuList)
      : Promise.resolve({ data: [] }),
  ]);

  const cafe24ProductNos = [...new Set((cafe24VariantsResult.data || []).map((v: any) => v.product_no))];
  const { data: cafe24Products } = cafe24ProductNos.length > 0
    ? await supabase.from("cafe24_products").select("product_no, product_name").in("product_no", cafe24ProductNos)
    : { data: [] };

  const naverProductNos = [...new Set((naverOptionsResult.data || []).map((o: any) => o.origin_product_no))];
  const { data: naverProducts } = naverProductNos.length > 0
    ? await supabase.from("naver_products").select("origin_product_no, product_name").in("origin_product_no", naverProductNos)
    : { data: [] };

  const channelMappings: Record<string, ChannelMapping> = {};
  
  for (const variant of cafe24VariantsResult.data || []) {
    const productName = (cafe24Products || []).find((p: any) => p.product_no === variant.product_no)?.product_name || "";
    if (!channelMappings[variant.sku]) {
      channelMappings[variant.sku] = { cafe24: null, naver: null };
    }
    channelMappings[variant.sku].cafe24 = {
      variant_code: variant.variant_code,
      stock_quantity: variant.stock_quantity,
      additional_price: variant.additional_price,
      product_name: productName,
    };
  }

  for (const option of naverOptionsResult.data || []) {
    const productName = (naverProducts || []).find((p: any) => p.origin_product_no === option.origin_product_no)?.product_name || "";
    if (!channelMappings[option.seller_management_code]) {
      channelMappings[option.seller_management_code] = { cafe24: null, naver: null };
    }
    channelMappings[option.seller_management_code].naver = {
      option_combination_id: option.option_combination_id,
      stock_quantity: option.stock_quantity,
      price: option.price,
      product_name: productName,
    };
  }

  // 주문 집계
  const salesDataMap: Record<string, SalesData> = {};
  
  if (skuList.length > 0) {
    const { data: orderStats } = await supabase
      .from("orders")
      .select("sku, shop_cd, pay_amt")
      .in("sku", skuList);

    for (const order of orderStats || []) {
      if (!order.sku) continue;
      
      if (!salesDataMap[order.sku]) {
        salesDataMap[order.sku] = {
          cafe24: { orderCount: 0, totalSales: 0 },
          naver: { orderCount: 0, totalSales: 0 },
        };
      }
      
      if (order.shop_cd === "cafe24") {
        salesDataMap[order.sku].cafe24.orderCount++;
        salesDataMap[order.sku].cafe24.totalSales += order.pay_amt || 0;
      } else if (order.shop_cd === "naver") {
        salesDataMap[order.sku].naver.orderCount++;
        salesDataMap[order.sku].naver.totalSales += order.pay_amt || 0;
      }
    }
  }

  return {
    products: products || [],
    totalCount: totalCount || 0,
    currentPage: page,
    totalPages: Math.ceil((totalCount || 0) / limit),
    currentLimit: limit,
    search,
    filters: { parentSku, color, size },
    sortBy,
    sortOrder,
    groupBy,
    filterOptions: {
      parentSkus: parentSkuOptions,
      colors: colorOptions,
      sizes: sizeOptions,
    },
    channelMappings,
    salesDataMap,
  };
}

// Action 함수
export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // 현재 사용자 가져오기
  const { data: { user } } = await supabase.auth.getUser();

  // 단일 제품 업데이트
  if (intent === "update") {
    const id = formData.get("id") as string;
    const changes = JSON.parse(formData.get("changes") as string);

    // 기존 데이터 조회 (로그용)
    const { data: oldData } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("products")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    // 변경 로그 기록
    for (const [field, newValue] of Object.entries(changes)) {
      if (oldData && oldData[field] !== newValue) {
        await supabase.from("product_change_logs").insert({
          table_name: "products",
          record_id: id,
          field_name: field,
          old_value: oldData[field]?.toString() || null,
          new_value: newValue?.toString() || null,
          changed_by: user?.id,
          change_type: "update",
        });
      }
    }

    return { success: true, message: "제품이 업데이트되었습니다." };
  }

  // 일괄 업데이트
  if (intent === "bulk_update") {
    const ids = JSON.parse(formData.get("ids") as string) as string[];
    const changes = JSON.parse(formData.get("changes") as string);

    // 기존 데이터 조회
    const { data: oldDataList } = await supabase
      .from("products")
      .select("*")
      .in("id", ids);

    const { error } = await supabase
      .from("products")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      return { success: false, error: error.message };
    }

    // 변경 로그 기록
    for (const oldData of oldDataList || []) {
      for (const [field, newValue] of Object.entries(changes)) {
        if (oldData[field] !== newValue) {
          await supabase.from("product_change_logs").insert({
            table_name: "products",
            record_id: oldData.id,
            field_name: field,
            old_value: oldData[field]?.toString() || null,
            new_value: newValue?.toString() || null,
            changed_by: user?.id,
            change_type: "bulk_update",
          });
        }
      }
    }

    return { success: true, message: `${ids.length}개 제품이 업데이트되었습니다.` };
  }

  // 새 제품 추가
  if (intent === "create") {
    const product_name = formData.get("product_name") as string;
    const sku = formData.get("sku") as string;
    const parent_sku = formData.get("parent_sku") as string;
    const category = formData.get("category") as string;
    const color_kr = formData.get("color_kr") as string;
    const sku_6_size = formData.get("sku_6_size") as string;
    const thumbnail_url = formData.get("thumbnail_url") as string;
    const cost_price = formData.get("cost_price") as string;

    const { data: newProduct, error } = await supabase
      .from("products")
      .insert({
        product_name: product_name || null,
        sku,
        parent_sku: parent_sku || null,
        category: category || null,
        color_kr: color_kr || null,
        sku_6_size: sku_6_size || null,
        thumbnail_url: thumbnail_url || null,
        cost_price: cost_price ? parseFloat(cost_price) : null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 생성 로그
    await supabase.from("product_change_logs").insert({
      table_name: "products",
      record_id: newProduct.id,
      field_name: "sku",
      old_value: null,
      new_value: sku,
      changed_by: user?.id,
      change_type: "create",
    });

    return { success: true, message: "새 제품이 추가되었습니다." };
  }

  // CSV 업로드 (Upsert)
  if (intent === "csv_upload") {
    const csvData = JSON.parse(formData.get("csvData") as string) as any[];
    
    let successCount = 0;
    let errorCount = 0;

    for (const row of csvData) {
      if (!row.sku) continue;

      const productData = {
        sku: row.sku,
        product_name: row.product_name || null,
        parent_sku: row.parent_sku || null,
        category: row.category || null,
        color_kr: row.color_kr || null,
        sku_6_size: row.sku_6_size || null,
        thumbnail_url: row.thumbnail_url || null,
        cost_price: row.cost_price ? parseFloat(row.cost_price) : null,
        is_active: row.is_active === "true" || row.is_active === true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("products")
        .upsert(productData, { onConflict: "sku" });

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    // 업로드 로그
    await supabase.from("product_change_logs").insert({
      table_name: "products",
      record_id: "00000000-0000-0000-0000-000000000000",
      field_name: "csv_upload",
      old_value: null,
      new_value: `${successCount} rows uploaded`,
      changed_by: user?.id,
      change_type: "bulk_update",
    });

    return { 
      success: true, 
      message: `CSV 업로드 완료: ${successCount}개 성공, ${errorCount}개 실패` 
    };
  }

  // 제품 동기화
  if (intent === "sync") {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/sync-inventory-simple`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ trigger: "manual" }),
        }
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        return { success: true, message: "제품 동기화가 완료되었습니다!", data: result.data };
      } else {
        return { success: false, error: result.error || "동기화 중 오류가 발생했습니다." };
      }
    } catch (error: any) {
      return { success: false, error: error.message || "동기화 중 오류가 발생했습니다." };
    }
  }

  return { success: false, error: "Unknown intent" };
}

// CSV 다운로드 함수
function downloadCSV(products: any[], filename: string) {
  const headers = [
    "sku",
    "product_name", 
    "parent_sku",
    "category",
    "color_kr",
    "sku_6_size",
    "thumbnail_url",
    "cost_price",
    "is_active",
  ];
  
  const csvContent = [
    headers.join(","),
    ...products.map(p => 
      headers.map(h => {
        const value = p[h];
        if (value === null || value === undefined) return "";
        const str = String(value);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// CSV 파싱 함수
function parseCSV(text: string): any[] {
  const lines = text.split("\n").filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/^"|"$/g, "") || "";
    });
    rows.push(row);
  }

  return rows;
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { 
    products, 
    totalCount, 
    currentPage, 
    totalPages,
    currentLimit,
    search, 
    filters, 
    sortBy,
    sortOrder,
    groupBy,
    filterOptions,
    channelMappings,
    salesDataMap,
  } = loaderData;
  
  const [searchInput, setSearchInput] = useState(search);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkChanges, setBulkChanges] = useState<any>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [currentGroupBy, setCurrentGroupBy] = useState(groupBy);
  const [pageLimit, setPageLimit] = useState(currentLimit);
  
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = fetcher.state === "submitting";

  // 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setMessage(`✅ ${fetcher.data.message}`);
        setEditingId(null);
        setSelectedIds(new Set());
        setShowBulkDialog(false);
        revalidator.revalidate();
      } else {
        setMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setMessage(null), 5000);
    }
  }, [fetcher.data, fetcher.state]);

  // URL 생성 헬퍼
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newParentSku = overrides.parentSku !== undefined ? overrides.parentSku : filters.parentSku;
    const newColor = overrides.color !== undefined ? overrides.color : filters.color;
    const newSize = overrides.size !== undefined ? overrides.size : filters.size;
    const newSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const newSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const newGroupBy = overrides.groupBy !== undefined ? overrides.groupBy : currentGroupBy;
    const newPage = overrides.page !== undefined ? overrides.page : "1";
    const newLimit = overrides.limit !== undefined ? overrides.limit : String(pageLimit);

    if (newSearch) params.set("search", newSearch);
    if (newParentSku) params.set("parentSku", newParentSku);
    if (newColor) params.set("color", newColor);
    if (newSize) params.set("size", newSize);
    if (newSortBy && newSortBy !== "updated_at") params.set("sortBy", newSortBy);
    if (newSortOrder && newSortOrder !== "desc") params.set("sortOrder", newSortOrder);
    if (newGroupBy) params.set("groupBy", newGroupBy);
    if (newPage && newPage !== "1") params.set("page", newPage);
    if (newLimit && newLimit !== "50") params.set("limit", newLimit);
    
    const queryString = params.toString();
    return `/dashboard/products${queryString ? `?${queryString}` : ""}`;
  };

  const handleLimitChange = (value: string) => {
    setPageLimit(parseInt(value));
    window.location.href = buildUrl({ limit: value, page: "1" });
  };

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    window.location.href = buildUrl({ sortBy: column, sortOrder: newOrder });
  };

  const handleGroupBy = (value: string) => {
    setCurrentGroupBy(value === "none" ? "" : value);
    window.location.href = buildUrl({ groupBy: value === "none" ? null : value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newValue = value === "all" ? null : value;
    window.location.href = buildUrl({ [filterType]: newValue });
  };

  const handleReset = () => {
    window.location.href = "/dashboard/products";
  };

  const handleSync = () => {
    fetcher.submit({ intent: "sync" }, { method: "POST" });
  };

  const toggleRow = (sku: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p: any) => p.id)));
    }
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditData({
      product_name: product.product_name || "",
      parent_sku: product.parent_sku || "",
      category: product.category || "",
      color_kr: product.color_kr || "",
      sku_6_size: product.sku_6_size || "",
      thumbnail_url: product.thumbnail_url || "",
      cost_price: product.cost_price || "",
      is_active: product.is_active ?? true,
    });
  };

  const saveEdit = () => {
    setPendingAction(() => () => {
      fetcher.submit(
        { 
          intent: "update", 
          id: editingId!, 
          changes: JSON.stringify(editData) 
        },
        { method: "POST" }
      );
    });
    setShowConfirmDialog(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleBulkUpdate = () => {
    setPendingAction(() => () => {
      fetcher.submit(
        {
          intent: "bulk_update",
          ids: JSON.stringify(Array.from(selectedIds)),
          changes: JSON.stringify(bulkChanges),
        },
        { method: "POST" }
      );
    });
    setShowConfirmDialog(true);
  };

  const handleCSVDownload = () => {
    downloadCSV(products, `products_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      
      if (data.length === 0) {
        setMessage("❌ CSV 파일이 비어있거나 형식이 잘못되었습니다.");
        return;
      }

      setPendingAction(() => () => {
        fetcher.submit(
          { intent: "csv_upload", csvData: JSON.stringify(data) },
          { method: "POST" }
        );
      });
      setShowConfirmDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmAction = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const hasActiveFilters = search || filters.parentSku || filters.color || filters.size;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  // 정렬 아이콘
  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDownIcon className="h-3 w-3 text-gray-400" />;
    return sortOrder === "asc" 
      ? <ChevronUpIcon className="h-3 w-3 text-blue-600" />
      : <ChevronDownIcon className="h-3 w-3 text-blue-600" />;
  };

  // 그룹핑된 데이터
  const groupedProducts = currentGroupBy
    ? products.reduce((acc: Record<string, any[]>, product: any) => {
        const key = product[currentGroupBy] || "미지정";
        if (!acc[key]) acc[key] = [];
        acc[key].push(product);
        return acc;
      }, {})
    : { "전체": products };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      {/* 확인 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>변경 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 변경하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일괄 변경 다이얼로그 */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>일괄 변경 ({selectedIds.size}개 선택)</DialogTitle>
            <DialogDescription>
              변경할 필드만 입력하세요. 빈 필드는 변경되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>분류 (Parent SKU)</Label>
              <Select
                value={bulkChanges.parent_sku || "__none__"}
                onValueChange={(v) => setBulkChanges({ ...bulkChanges, parent_sku: v === "__none__" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="변경 안함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">변경 안함</SelectItem>
                  {filterOptions.parentSkus.map((p: any) => (
                    <SelectItem key={p.parent_sku} value={p.parent_sku}>
                      {p.product_name || p.parent_sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Input
                value={bulkChanges.category || ""}
                onChange={(e) => setBulkChanges({ ...bulkChanges, category: e.target.value || undefined })}
                placeholder="변경 안함"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>색상 (직접 입력 가능)</Label>
                <Input
                  value={bulkChanges.color_kr || ""}
                  onChange={(e) => setBulkChanges({ ...bulkChanges, color_kr: e.target.value || undefined })}
                  placeholder="변경 안함"
                  list="color-options-bulk"
                />
              </div>
              <div className="space-y-2">
                <Label>사이즈 (직접 입력 가능)</Label>
                <Input
                  value={bulkChanges.sku_6_size || ""}
                  onChange={(e) => setBulkChanges({ ...bulkChanges, sku_6_size: e.target.value || undefined })}
                  placeholder="변경 안함"
                  list="size-options-bulk"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>원가</Label>
              <Input
                type="number"
                value={bulkChanges.cost_price || ""}
                onChange={(e) => setBulkChanges({ ...bulkChanges, cost_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="변경 안함 (숫자만 입력)"
              />
            </div>
            <div className="space-y-2">
              <Label>썸네일 URL</Label>
              <Input
                value={bulkChanges.thumbnail_url || ""}
                onChange={(e) => setBulkChanges({ ...bulkChanges, thumbnail_url: e.target.value || undefined })}
                placeholder="변경 안함"
              />
            </div>
            <div className="space-y-2">
              <Label>활성 상태</Label>
              <Select
                value={bulkChanges.is_active === undefined ? "__none__" : String(bulkChanges.is_active)}
                onValueChange={(v) => setBulkChanges({ ...bulkChanges, is_active: v === "__none__" ? undefined : v === "true" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="변경 안함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">변경 안함</SelectItem>
                  <SelectItem value="true">활성</SelectItem>
                  <SelectItem value="false">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkDialog(false); setBulkChanges({}); }}>취소</Button>
            <Button onClick={handleBulkUpdate} disabled={isSubmitting || Object.keys(bulkChanges).filter(k => bulkChanges[k] !== undefined).length === 0}>
              {isSubmitting ? "처리 중..." : "일괄 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BoxIcon className="h-6 w-6" />
            제품 관리
          </h1>
          <p className="text-gray-500">
            등록된 제품 목록 ({totalCount.toLocaleString()}개)
            {selectedIds.size > 0 && ` · ${selectedIds.size}개 선택됨`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* CSV 업로드 */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-4 w-4 mr-1" />
            CSV 업로드
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSVDownload}>
            <DownloadIcon className="h-4 w-4 mr-1" />
            CSV 다운로드
          </Button>
          <Button onClick={handleSync} disabled={isSubmitting}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isSubmitting ? "animate-spin" : ""}`} />
            동기화
          </Button>
        </div>
      </div>

      {/* 선택된 항목 일괄 처리 */}
      {selectedIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-blue-700 font-medium">{selectedIds.size}개 선택됨</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                선택 해제
              </Button>
              <Button size="sm" onClick={() => setShowBulkDialog(true)}>
                일괄 변경
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="SKU 또는 제품명으로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>

          <div className="flex flex-wrap gap-3 items-center">
            <FilterIcon className="h-4 w-4 text-gray-400" />
            
            <Select 
              value={filters.parentSku || "all"} 
              onValueChange={(v) => handleFilterChange("parentSku", v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="제품 분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                {filterOptions.parentSkus.map((p: any) => (
                  <SelectItem key={p.parent_sku} value={p.parent_sku}>
                    {p.product_name || p.parent_sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.color || "all"} 
              onValueChange={(v) => handleFilterChange("color", v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="색상" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 색상</SelectItem>
                {filterOptions.colors.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.size || "all"} 
              onValueChange={(v) => handleFilterChange("size", v)}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="사이즈" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {filterOptions.sizes.map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="border-l pl-3 ml-2">
              <Select value={currentGroupBy || "none"} onValueChange={handleGroupBy}>
                <SelectTrigger className="w-[130px]">
                  <GroupIcon className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="그룹" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">그룹 없음</SelectItem>
                  <SelectItem value="parent_sku">분류별</SelectItem>
                  <SelectItem value="color_kr">색상별</SelectItem>
                  <SelectItem value="sku_6_size">사이즈별</SelectItem>
                  <SelectItem value="category">카테고리별</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-3 py-2.5 w-10">
                    <Checkbox
                      checked={selectedIds.size === products.length && products.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase w-12">이미지</th>
                  <th 
                    className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("product_name")}
                  >
                    <div className="flex items-center gap-1">제품명 <SortIcon column="product_name" /></div>
                  </th>
                  <th 
                    className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("sku")}
                  >
                    <div className="flex items-center gap-1">SKU <SortIcon column="sku" /></div>
                  </th>
                  <th 
                    className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("sku_6_size")}
                  >
                    <div className="flex items-center gap-1">사이즈 <SortIcon column="sku_6_size" /></div>
                  </th>
                  <th 
                    className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("color_kr")}
                  >
                    <div className="flex items-center gap-1">색상 <SortIcon column="color_kr" /></div>
                  </th>
                  <th 
                    className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("cost_price")}
                  >
                    <div className="flex items-center gap-1">원가 <SortIcon column="cost_price" /></div>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase">분류</th>
                  <th className="px-3 py-2.5 text-center text-xs text-gray-500 uppercase">채널</th>
                  <th className="px-3 py-2.5 text-center text-xs text-gray-500 uppercase">상태</th>
                  <th className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase w-20">액션</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedProducts).map(([groupKey, groupProducts]: [string, any[]]) => (
                  <>
                    {currentGroupBy && (
                      <tr key={`group-${groupKey}`} className="bg-gray-100">
                        <td colSpan={11} className="px-4 py-2 font-semibold text-gray-700">
                          {currentGroupBy === "parent_sku" 
                            ? filterOptions.parentSkus.find((p: any) => p.parent_sku === groupKey)?.product_name || groupKey
                            : groupKey
                          } ({groupProducts.length}개)
                        </td>
                      </tr>
                    )}
                    {groupProducts.map((product: any) => {
                      const isEditing = editingId === product.id;
                      const mapping = channelMappings[product.sku];
                      
                      return (
                        <tr 
                          key={product.id}
                          className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isEditing ? 'bg-blue-50/30' : ''}`}
                        >
                          {/* 체크박스 */}
                          <td className="px-3 py-2.5">
                            <Checkbox
                              checked={selectedIds.has(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                            />
                          </td>
                          {/* 이미지 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <Input
                                value={editData.thumbnail_url}
                                onChange={(e) => setEditData({ ...editData, thumbnail_url: e.target.value })}
                                placeholder="URL"
                                className="h-8 text-xs w-20"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                {product.thumbnail_url ? (
                                  <img src={product.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            )}
                          </td>
                          {/* 제품명 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <Input
                                value={editData.product_name}
                                onChange={(e) => setEditData({ ...editData, product_name: e.target.value })}
                                className="h-8 text-sm"
                              />
                            ) : (
                              <span className="text-sm">{product.product_name || "-"}</span>
                            )}
                          </td>
                          {/* SKU */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 cursor-pointer" onClick={() => toggleRow(product.sku)}>
                              {expandedRows.has(product.sku) ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{product.sku}</code>
                            </div>
                          </td>
                          {/* 사이즈 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <Input
                                value={editData.sku_6_size}
                                onChange={(e) => setEditData({ ...editData, sku_6_size: e.target.value })}
                                placeholder="사이즈"
                                className="h-8 text-sm w-20"
                                list="size-options"
                              />
                            ) : product.sku_6_size ? (
                              <Badge variant="secondary" className="text-xs">{product.sku_6_size}</Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          {/* 색상 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <Input
                                value={editData.color_kr}
                                onChange={(e) => setEditData({ ...editData, color_kr: e.target.value })}
                                placeholder="색상 입력"
                                className="h-8 text-sm w-24"
                                list="color-options"
                              />
                            ) : product.color_kr ? (
                              <ColorBadge colorName={product.color_kr} />
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          {/* 원가 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editData.cost_price}
                                onChange={(e) => setEditData({ ...editData, cost_price: e.target.value })}
                                placeholder="원가"
                                className="h-8 text-sm w-24"
                              />
                            ) : (
                              <span className="text-sm">{product.cost_price ? formatPrice(product.cost_price) : "-"}</span>
                            )}
                          </td>
                          {/* 분류 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <Select
                                value={editData.parent_sku || "none"}
                                onValueChange={(v) => setEditData({ ...editData, parent_sku: v === "none" ? "" : v })}
                              >
                                <SelectTrigger className="h-8 text-sm w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">없음</SelectItem>
                                  {filterOptions.parentSkus.map((p: any) => (
                                    <SelectItem key={p.parent_sku} value={p.parent_sku}>
                                      {p.product_name || p.parent_sku}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-gray-600">
                                {filterOptions.parentSkus.find((p: any) => p.parent_sku === product.parent_sku)?.product_name || product.parent_sku || "-"}
                              </span>
                            )}
                          </td>
                          {/* 채널 */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex gap-1 justify-center">
                              {mapping?.cafe24 && <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">C24</Badge>}
                              {mapping?.naver && <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">NV</Badge>}
                              {!mapping?.cafe24 && !mapping?.naver && <span className="text-gray-400 text-xs">-</span>}
                            </div>
                          </td>
                          {/* 상태 */}
                          <td className="px-3 py-2.5 text-center">
                            {isEditing ? (
                              <Checkbox
                                checked={editData.is_active}
                                onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
                              />
                            ) : (
                              <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                                {product.is_active ? "활성" : "비활성"}
                              </Badge>
                            )}
                          </td>
                          {/* 액션 */}
                          <td className="px-3 py-2.5">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveEdit}>
                                  <CheckIcon className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                  <XIcon className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(product)}>
                                <PencilIcon className="h-4 w-4 text-gray-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500">
                      {hasActiveFilters ? "검색 결과가 없습니다" : "등록된 제품이 없습니다"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                총 {totalCount.toLocaleString()}개 중 {((currentPage - 1) * currentLimit) + 1} - {Math.min(currentPage * currentLimit, totalCount)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">표시:</span>
                <Select value={String(pageLimit)} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50개</SelectItem>
                    <SelectItem value="100">100개</SelectItem>
                    <SelectItem value="500">500개</SelectItem>
                    <SelectItem value="1000">1000개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">페이지 {currentPage} / {totalPages}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Datalist for autocomplete */}
      <datalist id="color-options">
        {filterOptions.colors.map((c: string) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="color-options-bulk">
        {filterOptions.colors.map((c: string) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="size-options">
        {filterOptions.sizes.map((s: string) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="size-options-bulk">
        {filterOptions.sizes.map((s: string) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
