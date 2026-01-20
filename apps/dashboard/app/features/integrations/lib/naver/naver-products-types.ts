/**
 * 네이버 상품 관리 관련 타입 정의
 *
 * 상태 변경, 대량 수정 등 일괄 작업용 타입
 */

// ============================================================================
// 상품 상태 타입
// ============================================================================

/**
 * 상품 상태 타입
 * - SALE: 판매중
 * - OUTOFSTOCK: 품절
 * - SUSPENSION: 판매중지
 * - CLOSE: 판매종료
 * - DELETE: 삭제
 */
export type ProductStatusType =
  | "SALE"
  | "OUTOFSTOCK"
  | "SUSPENSION"
  | "CLOSE"
  | "DELETE";

/**
 * 상태별 표시 정보
 */
export const PRODUCT_STATUS_INFO: Record<ProductStatusType, { label: string; description: string; color: string }> = {
  SALE: { label: "판매중", description: "상품을 판매 상태로 변경", color: "green" },
  OUTOFSTOCK: { label: "품절", description: "품절 상태로 표시", color: "red" },
  SUSPENSION: { label: "판매중지", description: "일시적으로 판매 중지", color: "yellow" },
  CLOSE: { label: "판매종료", description: "판매를 종료", color: "gray" },
  DELETE: { label: "삭제", description: "상품을 삭제", color: "destructive" },
};

// ============================================================================
// 대량 수정 타입
// ============================================================================

/**
 * 대량 수정 타입
 * - IMMEDIATE_DISCOUNT: 즉시할인가
 * - SALE_PRICE: 판매가
 * - SALE_PERIOD: 판매기간
 * - DELIVERY: 배송정보
 * - PURCHASE_QUANTITY_LIMIT: 구매수량제한
 */
export type BulkUpdateType =
  | "IMMEDIATE_DISCOUNT"
  | "SALE_PRICE"
  | "SALE_PERIOD"
  | "DELIVERY"
  | "DELIVERY_ATTRIBUTE"
  | "DELIVERY_HOPE"
  | "PURCHASE_BENEFIT"
  | "PURCHASE_QUANTITY_LIMIT";

// ============================================================================
// 요청/응답 타입
// ============================================================================

/**
 * 상태 변경 요청
 */
export interface ChangeStatusRequest {
  originProductNo: number;
  statusType: ProductStatusType;
  changeReason?: string;
}

/**
 * 대량 수정 요청
 */
export interface BulkUpdateRequest {
  bulkUpdateType: BulkUpdateType;
  originProductNos: number[];
  updateData: Record<string, unknown>;
}

/**
 * 일괄 작업 결과
 */
export interface BulkOperationResult {
  originProductNo: number;
  success: boolean;
  error?: string;
}

/**
 * 대량 수정 결과
 */
export interface BulkUpdateResult {
  success: boolean;
  results?: BulkOperationResult[];
  error?: string;
}

/**
 * 즉시할인 수정 요청 데이터
 */
export interface ImmediateDiscountUpdateData {
  immediateDiscountPolicy: {
    discountMethod: {
      value: number;
      unitType: "PERCENT" | "WON";
    };
  };
}

/**
 * 판매가 수정 요청 데이터
 */
export interface SalePriceUpdateData {
  salePrice: number;
}

/**
 * 재고 수정 요청
 */
export interface InventoryUpdateRequest {
  originProductNo: number;
  stockQuantity?: number;
  optionUpdates?: {
    optionCombinationId: number;
    stockQuantity: number;
    price?: number;
  }[];
}
