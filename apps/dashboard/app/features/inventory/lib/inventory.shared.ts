/**
 * 재고 관리 - 공유 유틸리티 및 타입
 */

// 색상 맵핑
export const COLOR_MAP: Record<string, string> = {
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

// 어두운 색상 목록
export const DARK_COLORS = ["블랙", "네이비", "차콜", "버건디", "와인", "딥씨"];

// 색상 코드 찾기
export function findColor(name: string): string {
  if (COLOR_MAP[name]) return COLOR_MAP[name];
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return value;
    }
  }
  return "#E5E7EB";
}

// 어두운 색상인지 확인
export function isDarkColor(colorName: string): boolean {
  return DARK_COLORS.some((c) => colorName.includes(c));
}

// 채널 맵핑 정보 타입
export interface ChannelMapping {
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
export interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
  is_default?: boolean;
}

// 창고별 재고 타입
export interface WarehouseStock {
  warehouse_id: string;
  sku: string;
  quantity: number;
}

// 재고 아이템 타입
export interface InventoryItem {
  id: string;
  sku: string;
  current_stock: number;
  previous_stock: number | null;
  stock_change: number | null;
  alert_threshold: number;
  synced_at: string | null;
  products: {
    id?: string;
    product_name: string;
    parent_sku: string;
    color_kr: string | null;
    sku_6_size: string | null;
    priority_warehouse_id?: string | null;
  } | null;
  cafe24_stock: number | null;
  cafe24_synced: string | null;
  naver_stock: number | null;
  naver_synced: string | null;
  channel_mapping?: ChannelMapping;
  warehouse_stocks?: Record<string, number>; // warehouse_id -> quantity
}

// 그룹 타입
export interface InventoryGroup {
  key: string;
  label: string;
  items: InventoryItem[];
  totalStock: number;
  lowStockCount: number;
  zeroStockCount: number;
}

// 정렬 타입
export type SortKey =
  | "sku"
  | "product_name"
  | "color"
  | "size"
  | "current_stock"
  | "cafe24_stock"
  | "naver_stock"
  | "alert_threshold";
export type SortOrder = "asc" | "desc";

// 통계 타입
export interface InventoryStats {
  total: number;
  totalStock: number;
  lowStock: number;
  zeroStock: number;
  normalStock: number;
}

// 필터 타입
export interface InventoryFilters {
  stockFilter: string;
  parentSku: string;
  color: string;
  size: string;
  warehouse: string;
}

// 필터 옵션 타입
export interface InventoryFilterOptions {
  parentSkus: Array<{ parent_sku: string; product_name: string }>;
  colors: string[];
  sizes: string[];
  warehouses: Warehouse[];
}

// 옵션 값 포맷팅 함수
export function formatOptions(options: any): string {
  if (!options) return "";
  if (typeof options === "string") return options;
  if (Array.isArray(options)) {
    return options
      .map((opt: any) => {
        if (typeof opt === "string") return opt;
        if (opt && typeof opt === "object") {
          return opt.value || opt.name || JSON.stringify(opt);
        }
        return "";
      })
      .filter(Boolean)
      .join(" / ");
  }
  if (typeof options === "object") {
    return Object.values(options)
      .filter((v) => v && typeof v !== "object")
      .join(" / ");
  }
  return "";
}

// CSV 내보내기
export function exportInventoryToCSV(items: InventoryItem[]): void {
  const headers = [
    "SKU",
    "상품명",
    "색상",
    "사이즈",
    "현재재고",
    "Cafe24재고",
    "네이버재고",
    "안전재고",
  ];

  const rows = items.map((item) => [
    item.sku,
    item.products?.product_name || "",
    item.products?.color_kr || "",
    item.products?.sku_6_size || "",
    item.current_stock,
    item.cafe24_stock ?? "",
    item.naver_stock ?? "",
    item.alert_threshold,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}
