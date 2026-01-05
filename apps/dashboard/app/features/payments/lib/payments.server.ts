/**
 * 결제 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "database.types";

import {
  DEFAULT_PAYMENT_AMOUNT,
  paymentParamsSchema,
  paymentResponseSchema,
  type Payment,
  type PaymentFilters,
  type PaymentResponse,
} from "./payments.shared";

// ============================================================
// 쿼리 함수
// ============================================================

/**
 * 사용자의 결제 내역 조회
 *
 * RLS 정책에 의해 사용자는 자신의 결제 내역만 조회 가능
 *
 * @param client - 인증된 Supabase 클라이언트
 * @param userId - 사용자 ID
 * @param filters - 필터 옵션 (선택)
 * @returns 결제 내역 배열
 */
export async function getPayments(
  client: SupabaseClient<Database>,
  { userId, filters }: { userId: string; filters?: PaymentFilters }
): Promise<Payment[]> {
  let query = client.from("payments").select("*").eq("user_id", userId);

  // 상태 필터
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // 날짜 필터
  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  // 최신순 정렬
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as Payment[];
}

/**
 * 단일 결제 내역 조회
 *
 * @param client - 인증된 Supabase 클라이언트
 * @param paymentId - 결제 ID
 * @returns 결제 정보 또는 null
 */
export async function getPaymentById(
  client: SupabaseClient<Database>,
  paymentId: number
): Promise<Payment | null> {
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("payment_id", paymentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as Payment;
}

/**
 * 주문 ID로 결제 내역 조회
 *
 * @param client - 인증된 Supabase 클라이언트
 * @param orderId - 주문 ID
 * @returns 결제 정보 또는 null
 */
export async function getPaymentByOrderId(
  client: SupabaseClient<Database>,
  orderId: string
): Promise<Payment | null> {
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as Payment;
}

// ============================================================
// Toss Payments 관련 함수
// ============================================================

/**
 * URL 파라미터에서 결제 정보 파싱
 *
 * @param url - 요청 URL
 * @returns 파싱된 결제 파라미터 또는 에러
 */
export function parsePaymentParams(url: URL) {
  return paymentParamsSchema.safeParse(Object.fromEntries(url.searchParams));
}

/**
 * Toss Payments 인증 헤더 생성
 *
 * @returns Base64 인코딩된 인증 헤더
 */
export function getTossAuthHeader(): string {
  return (
    "Basic " +
    Buffer.from(process.env.TOSS_PAYMENTS_SECRET_KEY + ":").toString("base64")
  );
}

/**
 * Toss Payments API로 결제 확인 요청
 *
 * @param orderId - 주문 ID
 * @param amount - 결제 금액
 * @param paymentKey - 결제 키
 * @returns API 응답
 */
export async function confirmPayment(
  orderId: string,
  amount: number,
  paymentKey: string
): Promise<{ success: true; data: PaymentResponse } | { success: false; code: string; message: string }> {
  const response = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      body: JSON.stringify({
        orderId,
        amount,
        paymentKey,
      }),
      headers: {
        Authorization: getTossAuthHeader(),
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  // API 에러 처리
  if (response.status !== 200 && data.code && data.message) {
    return {
      success: false,
      code: data.code,
      message: data.message,
    };
  }

  // 응답 스키마 검증
  const paymentResponse = paymentResponseSchema.safeParse(data);
  if (!paymentResponse.success) {
    return {
      success: false,
      code: "validation-error",
      message: "Invalid response from Toss",
    };
  }

  return {
    success: true,
    data: paymentResponse.data,
  };
}

/**
 * 결제 금액 검증
 *
 * 실제 프로덕션에서는 DB에서 예상 금액을 조회하여 비교해야 함
 *
 * @param amount - 결제 금액
 * @param expectedAmount - 예상 금액 (기본값: DEFAULT_PAYMENT_AMOUNT)
 * @returns 유효 여부
 */
export function validatePaymentAmount(
  amount: number,
  expectedAmount: number = DEFAULT_PAYMENT_AMOUNT
): boolean {
  return amount === expectedAmount;
}

// ============================================================
// 데이터베이스 저장 함수
// ============================================================

/**
 * 결제 정보 저장
 *
 * @param adminClient - Supabase admin 클라이언트
 * @param paymentData - Toss Payments 응답 데이터
 * @param rawData - 원본 API 응답
 * @param userId - 사용자 ID
 * @returns 저장 결과
 */
export async function savePayment(
  adminClient: SupabaseClient<Database>,
  paymentData: PaymentResponse,
  rawData: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await adminClient.from("payments").insert({
    payment_key: paymentData.paymentKey,
    order_id: paymentData.orderId,
    order_name: paymentData.orderName,
    total_amount: paymentData.totalAmount,
    receipt_url: paymentData.receipt.url,
    status: paymentData.status,
    approved_at: paymentData.approvedAt,
    requested_at: paymentData.requestedAt,
    metadata: paymentData.metadata,
    raw_data: rawData,
    user_id: userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 결제 상태 업데이트
 *
 * @param adminClient - Supabase admin 클라이언트
 * @param paymentId - 결제 ID
 * @param status - 새로운 상태
 * @returns 업데이트 결과
 */
export async function updatePaymentStatus(
  adminClient: SupabaseClient<Database>,
  paymentId: number,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await adminClient
    .from("payments")
    .update({ status })
    .eq("payment_id", paymentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
