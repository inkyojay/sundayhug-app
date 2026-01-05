/**
 * 입고 관리 - 공유 유틸리티 및 타입
 */

// ========== 타입 정의 ==========

/** 입고 상태 */
export interface ReceiptStatusOption {
  value: string;
  label: string;
  color: "secondary" | "default" | "destructive";
}

/** 입고 상태 목록 */
export const RECEIPT_STATUSES: ReceiptStatusOption[] = [
  { value: "pending", label: "대기중", color: "secondary" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

/** 상태 정보 반환 */
export function getStatusInfo(status: string): ReceiptStatusOption {
  return RECEIPT_STATUSES.find(s => s.value === status) || RECEIPT_STATUSES[0];
}

/** 창고 정보 */
export interface Warehouse {
  id: string;
  warehouse_name: string;
  warehouse_code: string;
}

/** 입고 품목 */
export interface StockReceiptItem {
  id?: string;
  purchase_order_item_id?: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  expected_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
}

/** 입고 정보 */
export interface StockReceipt {
  id: string;
  receipt_number: string;
  purchase_order_id: string | null;
  warehouse_id: string;
  receipt_date: string;
  status: string;
  notes: string | null;
  total_quantity: number;
  created_at: string;
  updated_at?: string;
  warehouse?: Warehouse;
  purchase_order?: {
    id: string;
    order_number: string;
  };
  items?: StockReceiptItem[];
}

/** 입고 폼 데이터 */
export interface StockReceiptFormData {
  receipt_number: string;
  purchase_order_id: string;
  warehouse_id: string;
  receipt_date: string;
  notes: string;
}

/** 발주서 정보 */
export interface PurchaseOrder {
  id: string;
  order_number: string;
  factory_id: string;
  status: string;
  order_date: string;
  total_quantity: number;
  factory?: {
    factory_name: string;
  };
  items?: {
    id: string;
    sku: string;
    product_name: string;
    quantity: number;
    received_quantity: number;
  }[];
}

/** 제품 정보 */
export interface Product {
  id: string;
  sku: string;
  product_name: string;
  color_kr: string;
  sku_6_size: string;
  parent_sku?: string;
  parent_product?: {
    id: string;
    product_name: string;
  };
}

/** 로더 데이터 */
export interface StockReceiptListLoaderData {
  receipts: StockReceipt[];
  warehouses: Warehouse[];
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  search: string;
  statusFilter: string;
  warehouseFilter: string;
  newReceiptNumber: string;
}

/** 액션 결과 */
export interface StockReceiptActionResult {
  success?: boolean;
  message?: string;
  error?: string;
}

// ========== 상수 ==========

/** 빈 입고 폼 데이터 */
export const EMPTY_RECEIPT_FORM: StockReceiptFormData = {
  receipt_number: "",
  purchase_order_id: "",
  warehouse_id: "",
  receipt_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

// ========== 유틸리티 함수 ==========

/**
 * 날짜 포맷팅
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

/**
 * 발주서 품목에서 입고 품목으로 변환
 */
export function purchaseOrderItemsToReceiptItems(
  items: PurchaseOrder["items"]
): StockReceiptItem[] {
  if (!items) return [];
  return items.map((item) => ({
    purchase_order_item_id: item.id,
    product_id: null,
    sku: item.sku,
    product_name: item.product_name,
    expected_quantity: item.quantity - (item.received_quantity || 0),
    received_quantity: item.quantity - (item.received_quantity || 0),
    damaged_quantity: 0,
  }));
}

/**
 * 제품을 입고 품목으로 변환
 */
export function productToReceiptItem(product: Product): StockReceiptItem {
  return {
    product_id: product.id,
    sku: product.sku,
    product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
    expected_quantity: 0,
    received_quantity: 1,
    damaged_quantity: 0,
  };
}
