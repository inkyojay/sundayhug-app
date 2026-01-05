/**
 * 결제 관리 - 공유 유틸리티 및 타입
 */

import { z } from "zod";

// ============================================================
// 상수
// ============================================================

/** 기본 결제 금액 (데모용) */
export const DEFAULT_PAYMENT_AMOUNT = 10_000;

/** 결제 상태 */
export const PAYMENT_STATUS = {
  DONE: "DONE",
  CANCELED: "CANCELED",
  PARTIAL_CANCELED: "PARTIAL_CANCELED",
  ABORTED: "ABORTED",
  EXPIRED: "EXPIRED",
} as const;

/** 결제 상태 라벨 */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  DONE: "완료",
  CANCELED: "취소됨",
  PARTIAL_CANCELED: "부분취소",
  ABORTED: "실패",
  EXPIRED: "만료",
};

// ============================================================
// 타입
// ============================================================

/** 결제 상태 타입 */
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** 결제 아이템 타입 */
export interface Payment {
  payment_id: number;
  payment_key: string;
  order_id: string;
  order_name: string;
  total_amount: number;
  metadata: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  receipt_url: string;
  status: string;
  user_id: string | null;
  approved_at: string;
  requested_at: string;
  created_at: string;
  updated_at: string;
}

/** 결제 목록 필터 */
export interface PaymentFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================
// Zod 스키마
// ============================================================

/**
 * Toss Payments 리다이렉트 URL 파라미터 스키마
 *
 * 결제 성공 후 리다이렉트 시 URL에 포함되는 파라미터:
 * - orderId: 주문 고유 식별자
 * - paymentKey: 결제 트랜잭션 식별자
 * - amount: 결제 금액
 * - paymentType: 결제 수단 (카드, 계좌이체 등)
 */
export const paymentParamsSchema = z.object({
  orderId: z.string(),
  paymentKey: z.string(),
  amount: z.coerce.number(),
  paymentType: z.string(),
});

export type PaymentParams = z.infer<typeof paymentParamsSchema>;

/**
 * Toss Payments API 응답 스키마
 *
 * 결제 확인 API 응답 구조:
 * - paymentKey, orderId: 트랜잭션 식별자
 * - orderName: 주문명
 * - status: 결제 상태
 * - requestedAt, approvedAt: 타임스탬프
 * - receipt: 영수증 정보
 * - totalAmount: 결제 금액
 * - metadata: 추가 메타데이터
 */
export const paymentResponseSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  orderName: z.string(),
  status: z.string(),
  requestedAt: z.string(),
  approvedAt: z.string(),
  receipt: z.object({
    url: z.string(),
  }),
  totalAmount: z.number(),
  metadata: z.record(z.string()),
});

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 금액을 한국 원화 형식으로 포맷팅
 * @param amount 금액
 * @returns 포맷팅된 문자열 (예: "₩10,000")
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("ko-KR", {
    style: "currency",
    currency: "KRW",
  });
}

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param date 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 문자열 (예: "2024년 1월 5일")
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 날짜시간을 한국어 형식으로 포맷팅
 * @param date 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 문자열 (예: "2024년 1월 5일 오후 3:30")
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * 결제 상태 라벨 반환
 * @param status 결제 상태 코드
 * @returns 한국어 라벨
 */
export function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABEL[status] || status;
}

/**
 * 결제 상태에 따른 색상 클래스 반환
 * @param status 결제 상태 코드
 * @returns Tailwind CSS 클래스
 */
export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case PAYMENT_STATUS.DONE:
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950";
    case PAYMENT_STATUS.CANCELED:
    case PAYMENT_STATUS.PARTIAL_CANCELED:
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950";
    case PAYMENT_STATUS.ABORTED:
    case PAYMENT_STATUS.EXPIRED:
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950";
  }
}
