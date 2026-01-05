/**
 * 재고 이동 - 공유 유틸리티 및 타입
 */

// ========== 타입 정의 ==========

/** 이동 상태 */
export interface TransferStatusOption {
  value: string;
  label: string;
  color: "secondary" | "outline" | "default" | "destructive";
}

/** 이동 상태 목록 */
export const TRANSFER_STATUSES: TransferStatusOption[] = [
  { value: "pending", label: "대기중", color: "secondary" },
  { value: "in_transit", label: "이동중", color: "outline" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

/** 상태 정보 반환 */
export function getStatusInfo(status: string): TransferStatusOption {
  return TRANSFER_STATUSES.find(s => s.value === status) || TRANSFER_STATUSES[0];
}

/** 창고 정보 */
export interface Warehouse {
  id: string;
  warehouse_name: string;
  warehouse_code: string;
}

/** 이동 품목 */
export interface StockTransferItem {
  id?: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  available_quantity: number;
}

/** 재고 이동 정보 */
export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_date: string;
  status: string;
  notes: string | null;
  total_quantity: number;
  created_at: string;
  updated_at?: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  items?: {
    id: string;
    sku: string;
    product_name: string;
    quantity: number;
  }[];
}

/** 이동 폼 데이터 */
export interface StockTransferFormData {
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_date: string;
  notes: string;
}

/** 재고 위치 정보 */
export interface InventoryLocation {
  id: string;
  warehouse_id: string;
  product_id: string | null;
  sku: string;
  product_name?: string;
  quantity: number;
}

/** 로더 데이터 */
export interface StockTransferListLoaderData {
  transfers: StockTransfer[];
  warehouses: Warehouse[];
  search: string;
  statusFilter: string;
  newTransferNumber: string;
}

/** 액션 결과 */
export interface StockTransferActionResult {
  success?: boolean;
  message?: string;
  error?: string;
}

// ========== 상수 ==========

/** 빈 이동 폼 데이터 */
export const EMPTY_TRANSFER_FORM: StockTransferFormData = {
  transfer_number: "",
  from_warehouse_id: "",
  to_warehouse_id: "",
  transfer_date: new Date().toISOString().slice(0, 10),
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
 * 재고 항목을 이동 품목으로 변환
 */
export function inventoryToTransferItem(stock: InventoryLocation): StockTransferItem {
  return {
    product_id: stock.product_id,
    sku: stock.sku,
    product_name: stock.product_name || stock.sku,
    quantity: 1,
    available_quantity: stock.quantity,
  };
}
