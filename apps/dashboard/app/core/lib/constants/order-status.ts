/**
 * 주문 상태 관련 상수
 */

/** 취소/환불 상태 목록 - 매출 계산 시 제외 */
export const CANCELLED_STATUSES = [
  "취소",
  "CANCELED",
  "취소완료",
  "환불",
  "환불완료",
  "REFUND",
  "반품완료",
] as const;

export type CancelledStatus = typeof CANCELLED_STATUSES[number];

/** 배송 완료 상태 목록 */
export const DELIVERED_STATUSES = [
  "배송완료",
  "DELIVERED",
  "수취확인",
] as const;

export type DeliveredStatus = typeof DELIVERED_STATUSES[number];

/** 결제 완료 상태 목록 */
export const PAID_STATUSES = [
  "결제완료",
  "PAID",
  "입금완료",
] as const;

export type PaidStatus = typeof PAID_STATUSES[number];

/** Supabase 쿼리용 취소 상태 필터 문자열 생성 */
export function getCancelledStatusFilter(): string {
  return `(${CANCELLED_STATUSES.map(s => `"${s}"`).join(",")})`;
}
