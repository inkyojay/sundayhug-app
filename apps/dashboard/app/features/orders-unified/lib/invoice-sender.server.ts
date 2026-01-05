/**
 * 통합 송장 전송 모듈
 *
 * Cafe24, 네이버 등 여러 채널에 송장을 통합 전송합니다.
 * 채널별 API 자동 분기, 택배사 코드 변환, 에러 처리를 담당합니다.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Channel } from "./orders-unified.shared";
import { getChannelCarrierCode, getCarrierByValue } from "./carriers";
import { sendInvoiceToCafe24WithAuth } from "~/features/integrations/lib/cafe24.server";
import { sendInvoiceToNaver, sendInvoicesToNaverBulk } from "~/features/integrations/lib/naver.server";

// ============================================================================
// Types
// ============================================================================

export interface InvoiceSendResult {
  success: boolean;
  channel: Channel;
  orderUniq: string;
  orderNo: string;
  trackingNo: string;
  carrierCode: string;
  message?: string;
  error?: string;
}

export interface BulkInvoiceSendResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failCount: number;
  results: InvoiceSendResult[];
}

export interface InvoiceInput {
  orderUniq: string;
  carrierCode: string;  // 내부 택배사 코드 (예: "cj", "hanjin")
  trackingNo: string;
}

// 주문 정보 (DB에서 조회)
interface OrderInfo {
  id: string;
  uniq: string;
  shop_cd: Channel;
  shop_ord_no: string;
  sol_no?: number;
}

// ============================================================================
// 단건 송장 전송
// ============================================================================

/**
 * 통합 송장 전송 (채널 자동 분기)
 *
 * orderUniq로 주문 정보를 조회하여 해당 채널로 송장을 전송합니다.
 *
 * @param supabase - Supabase 클라이언트
 * @param orderUniq - 주문 고유 ID (orders.uniq)
 * @param carrierCode - 내부 택배사 코드 (예: "cj", "hanjin")
 * @param trackingNo - 송장번호
 */
export async function sendInvoice(
  supabase: SupabaseClient,
  orderUniq: string,
  carrierCode: string,
  trackingNo: string
): Promise<InvoiceSendResult> {
  // 1. 주문 정보 조회
  const { data: order, error: queryError } = await supabase
    .from("orders")
    .select("id, uniq, shop_cd, shop_ord_no, sol_no")
    .eq("uniq", orderUniq)
    .single();

  if (queryError || !order) {
    return {
      success: false,
      channel: "cafe24" as Channel,
      orderUniq,
      orderNo: "",
      trackingNo,
      carrierCode,
      error: `주문을 찾을 수 없습니다: ${queryError?.message || "해당 주문이 존재하지 않습니다"}`,
    };
  }

  const channel = order.shop_cd as Channel;
  const orderNo = order.shop_ord_no || String(order.sol_no);

  // 2. 택배사 코드 변환
  const channelCarrierCode = getChannelCarrierCode(carrierCode, channel);
  if (!channelCarrierCode) {
    return {
      success: false,
      channel,
      orderUniq,
      orderNo,
      trackingNo,
      carrierCode,
      error: `지원하지 않는 택배사입니다: ${carrierCode}`,
    };
  }

  // 3. 채널별 송장 전송
  let result: InvoiceSendResult;

  try {
    switch (channel) {
      case "cafe24":
        result = await sendInvoiceToCafe24Channel(
          order as OrderInfo,
          channelCarrierCode,
          trackingNo
        );
        break;

      case "naver":
        result = await sendInvoiceToNaverChannel(
          order as OrderInfo,
          channelCarrierCode,
          trackingNo
        );
        break;

      case "coupang":
        // 쿠팡 로켓그로스는 자체 물류로 송장 전송 불필요
        result = {
          success: true,
          channel,
          orderUniq,
          orderNo,
          trackingNo,
          carrierCode,
          message: "쿠팡 로켓그로스는 자체 물류로 송장 전송이 필요 없습니다",
        };
        break;

      default:
        result = {
          success: false,
          channel,
          orderUniq,
          orderNo,
          trackingNo,
          carrierCode,
          error: `지원하지 않는 채널입니다: ${channel}`,
        };
    }
  } catch (error) {
    result = {
      success: false,
      channel,
      orderUniq,
      orderNo,
      trackingNo,
      carrierCode,
      error: `송장 전송 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }

  // 4. 성공 시 DB 업데이트
  if (result.success) {
    const carrier = getCarrierByValue(carrierCode);
    await supabase
      .from("orders")
      .update({
        invoice_no: trackingNo,
        carr_name: carrier?.label || carrierCode,
        invoice_sent_at: new Date().toISOString(),
        ord_status: "배송중",
      })
      .eq("uniq", orderUniq);
  }

  return result;
}

// ============================================================================
// 일괄 송장 전송
// ============================================================================

/**
 * 일괄 송장 전송
 *
 * 여러 주문에 대해 송장을 일괄 전송합니다.
 * 부분 성공을 지원하며, 각 전송 결과를 개별적으로 반환합니다.
 *
 * @param supabase - Supabase 클라이언트
 * @param invoices - 송장 정보 목록
 */
export async function sendInvoicesBulk(
  supabase: SupabaseClient,
  invoices: InvoiceInput[]
): Promise<BulkInvoiceSendResult> {
  if (invoices.length === 0) {
    return {
      success: true,
      totalCount: 0,
      successCount: 0,
      failCount: 0,
      results: [],
    };
  }

  // 1. 주문 정보 일괄 조회
  const orderUniqs = invoices.map((inv) => inv.orderUniq);
  const { data: orders, error: queryError } = await supabase
    .from("orders")
    .select("id, uniq, shop_cd, shop_ord_no, sol_no")
    .in("uniq", orderUniqs);

  if (queryError) {
    return {
      success: false,
      totalCount: invoices.length,
      successCount: 0,
      failCount: invoices.length,
      results: invoices.map((inv) => ({
        success: false,
        channel: "cafe24" as Channel,
        orderUniq: inv.orderUniq,
        orderNo: "",
        trackingNo: inv.trackingNo,
        carrierCode: inv.carrierCode,
        error: `주문 조회 실패: ${queryError.message}`,
      })),
    };
  }

  // 주문 정보 맵 생성
  const orderMap = new Map(orders?.map((o) => [o.uniq, o]) || []);

  // 2. 채널별로 그룹핑
  const channelGroups: Record<Channel, { invoice: InvoiceInput; order: OrderInfo }[]> = {
    cafe24: [],
    naver: [],
    coupang: [],
  };

  const notFoundResults: InvoiceSendResult[] = [];

  for (const invoice of invoices) {
    const order = orderMap.get(invoice.orderUniq);
    if (!order) {
      notFoundResults.push({
        success: false,
        channel: "cafe24" as Channel,
        orderUniq: invoice.orderUniq,
        orderNo: "",
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        error: "주문을 찾을 수 없습니다",
      });
      continue;
    }

    const channel = order.shop_cd as Channel;
    if (channelGroups[channel]) {
      channelGroups[channel].push({ invoice, order });
    } else {
      notFoundResults.push({
        success: false,
        channel,
        orderUniq: invoice.orderUniq,
        orderNo: order.shop_ord_no || String(order.sol_no),
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        error: `지원하지 않는 채널입니다: ${channel}`,
      });
    }
  }

  // 3. 채널별 전송 실행
  const results: InvoiceSendResult[] = [...notFoundResults];

  // Cafe24: 개별 전송 (API 제약)
  for (const { invoice, order } of channelGroups.cafe24) {
    const channelCarrierCode = getChannelCarrierCode(invoice.carrierCode, "cafe24");
    if (!channelCarrierCode) {
      results.push({
        success: false,
        channel: "cafe24",
        orderUniq: invoice.orderUniq,
        orderNo: order.shop_ord_no || String(order.sol_no),
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        error: `지원하지 않는 택배사입니다: ${invoice.carrierCode}`,
      });
      continue;
    }

    const result = await sendInvoiceToCafe24Channel(order, channelCarrierCode, invoice.trackingNo);
    results.push({
      ...result,
      carrierCode: invoice.carrierCode,
    });

    // 성공 시 DB 업데이트
    if (result.success) {
      const carrier = getCarrierByValue(invoice.carrierCode);
      await supabase
        .from("orders")
        .update({
          invoice_no: invoice.trackingNo,
          carr_name: carrier?.label || invoice.carrierCode,
          invoice_sent_at: new Date().toISOString(),
          ord_status: "배송중",
        })
        .eq("uniq", invoice.orderUniq);
    }
  }

  // 네이버: 일괄 전송 API 활용
  if (channelGroups.naver.length > 0) {
    const naverResults = await sendInvoicesToNaverBulkChannel(supabase, channelGroups.naver);
    results.push(...naverResults);
  }

  // 쿠팡: 로켓그로스는 자체 물류
  for (const { invoice, order } of channelGroups.coupang) {
    const carrier = getCarrierByValue(invoice.carrierCode);
    results.push({
      success: true,
      channel: "coupang",
      orderUniq: invoice.orderUniq,
      orderNo: order.shop_ord_no || String(order.sol_no),
      trackingNo: invoice.trackingNo,
      carrierCode: invoice.carrierCode,
      message: "쿠팡 로켓그로스는 자체 물류로 송장 전송이 필요 없습니다",
    });

    // DB는 업데이트
    await supabase
      .from("orders")
      .update({
        invoice_no: invoice.trackingNo,
        carr_name: carrier?.label || invoice.carrierCode,
        invoice_sent_at: new Date().toISOString(),
        ord_status: "배송중",
      })
      .eq("uniq", invoice.orderUniq);
  }

  // 4. 결과 집계
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return {
    success: failCount === 0,
    totalCount: invoices.length,
    successCount,
    failCount,
    results,
  };
}

// ============================================================================
// 채널별 전송 함수 (내부용)
// ============================================================================

/**
 * Cafe24 채널 송장 전송
 */
async function sendInvoiceToCafe24Channel(
  order: OrderInfo,
  shippingCompanyCode: string,
  trackingNo: string
): Promise<InvoiceSendResult> {
  const orderNo = order.shop_ord_no || String(order.sol_no);
  const orderItemCode = order.shop_ord_item_no;

  if (!orderItemCode) {
    return {
      success: false,
      channel: "cafe24",
      orderUniq: order.uniq,
      orderNo,
      trackingNo,
      carrierCode: "",
      error: "주문 아이템 코드가 없습니다 (shop_ord_item_no)",
    };
  }

  const result = await sendInvoiceToCafe24WithAuth(
    orderNo,
    orderItemCode,
    shippingCompanyCode,
    trackingNo
  );

  return {
    success: result.success,
    channel: "cafe24",
    orderUniq: order.uniq,
    orderNo,
    trackingNo,
    carrierCode: "",
    message: result.message,
    error: result.error,
  };
}

/**
 * 네이버 채널 송장 전송
 */
async function sendInvoiceToNaverChannel(
  order: OrderInfo,
  deliveryCompanyCode: string,
  trackingNo: string
): Promise<InvoiceSendResult> {
  const orderNo = order.shop_ord_no || String(order.sol_no);

  // 네이버는 productOrderId가 필요 (shop_ord_no에 저장되어 있어야 함)
  const productOrderId = order.shop_ord_no;

  if (!productOrderId) {
    return {
      success: false,
      channel: "naver",
      orderUniq: order.uniq,
      orderNo,
      trackingNo,
      carrierCode: "",
      error: "상품주문번호(productOrderId)가 없습니다",
    };
  }

  const result = await sendInvoiceToNaver(productOrderId, deliveryCompanyCode, trackingNo);

  return {
    success: result.success,
    channel: "naver",
    orderUniq: order.uniq,
    orderNo,
    trackingNo,
    carrierCode: "",
    message: result.message,
    error: result.error,
  };
}

/**
 * 네이버 일괄 송장 전송 (채널 내부용)
 */
async function sendInvoicesToNaverBulkChannel(
  supabase: SupabaseClient,
  items: { invoice: InvoiceInput; order: OrderInfo }[]
): Promise<InvoiceSendResult[]> {
  // 택배사 코드 변환 및 유효성 검사
  const validItems: {
    invoice: InvoiceInput;
    order: OrderInfo;
    naverCarrierCode: string;
  }[] = [];
  const invalidResults: InvoiceSendResult[] = [];

  for (const { invoice, order } of items) {
    const naverCarrierCode = getChannelCarrierCode(invoice.carrierCode, "naver");
    if (!naverCarrierCode) {
      invalidResults.push({
        success: false,
        channel: "naver",
        orderUniq: invoice.orderUniq,
        orderNo: order.shop_ord_no || String(order.sol_no),
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        error: `지원하지 않는 택배사입니다: ${invoice.carrierCode}`,
      });
      continue;
    }

    if (!order.shop_ord_no) {
      invalidResults.push({
        success: false,
        channel: "naver",
        orderUniq: invoice.orderUniq,
        orderNo: order.shop_ord_no || "",
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        error: "상품주문번호(productOrderId)가 없습니다",
      });
      continue;
    }

    validItems.push({ invoice, order, naverCarrierCode });
  }

  if (validItems.length === 0) {
    return invalidResults;
  }

  // 네이버 일괄 API 호출
  const bulkResult = await sendInvoicesToNaverBulk(
    validItems.map(({ invoice, order, naverCarrierCode }) => ({
      productOrderId: order.shop_ord_no,
      deliveryCompanyCode: naverCarrierCode,
      trackingNumber: invoice.trackingNo,
    }))
  );

  // 결과 매핑
  const results: InvoiceSendResult[] = [...invalidResults];

  // productOrderId로 원래 항목 찾기
  const itemMap = new Map(
    validItems.map(({ invoice, order }) => [order.shop_ord_no, { invoice, order }])
  );

  // 성공한 항목 처리
  for (const item of validItems) {
    const { invoice, order } = item;
    const errorInfo = bulkResult.errors.find(
      (e) => e.productOrderId === order.shop_ord_no
    );

    if (errorInfo) {
      results.push({
        success: false,
        channel: "naver",
        orderUniq: invoice.orderUniq,
        orderNo: order.shop_ord_no || String(order.sol_no),
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        error: errorInfo.error,
      });
    } else {
      results.push({
        success: true,
        channel: "naver",
        orderUniq: invoice.orderUniq,
        orderNo: order.shop_ord_no || String(order.sol_no),
        trackingNo: invoice.trackingNo,
        carrierCode: invoice.carrierCode,
        message: "발송처리가 성공적으로 완료되었습니다",
      });

      // DB 업데이트
      const carrier = getCarrierByValue(invoice.carrierCode);
      await supabase
        .from("orders")
        .update({
          invoice_no: invoice.trackingNo,
          carr_name: carrier?.label || invoice.carrierCode,
          invoice_sent_at: new Date().toISOString(),
          ord_status: "배송중",
        })
        .eq("uniq", invoice.orderUniq);
    }
  }

  return results;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 송장번호 유효성 검사
 */
export function validateTrackingNo(trackingNo: string): boolean {
  // 기본 검증: 빈 값 체크, 최소 길이
  if (!trackingNo || trackingNo.trim().length < 8) {
    return false;
  }
  // 숫자만 허용 (일부 택배사는 영문 포함)
  return /^[A-Za-z0-9-]+$/.test(trackingNo.trim());
}

/**
 * 송장 전송 가능 여부 확인
 */
export function canSendInvoice(channel: Channel): boolean {
  // 쿠팡은 로켓그로스 전용이므로 자체 물류
  // 추후 일반 마켓플레이스 지원 시 분기 필요
  return channel === "cafe24" || channel === "naver";
}

/**
 * 송장 전송 재시도 (실패 시)
 */
export async function retryFailedInvoices(
  supabase: SupabaseClient,
  failedResults: InvoiceSendResult[],
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<BulkInvoiceSendResult> {
  const retryInvoices: InvoiceInput[] = failedResults.map((r) => ({
    orderUniq: r.orderUniq,
    carrierCode: r.carrierCode,
    trackingNo: r.trackingNo,
  }));

  let lastResult: BulkInvoiceSendResult | null = null;
  let currentRetry = 0;

  while (currentRetry < maxRetries && retryInvoices.length > 0) {
    if (currentRetry > 0) {
      // 지수 백오프 적용
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, currentRetry - 1)));
    }

    lastResult = await sendInvoicesBulk(supabase, retryInvoices);

    // 실패한 항목만 다음 재시도 대상으로
    const stillFailed = lastResult.results.filter((r) => !r.success);
    if (stillFailed.length === 0) {
      break;
    }

    retryInvoices.length = 0;
    for (const failed of stillFailed) {
      retryInvoices.push({
        orderUniq: failed.orderUniq,
        carrierCode: failed.carrierCode,
        trackingNo: failed.trackingNo,
      });
    }

    currentRetry++;
  }

  return lastResult || {
    success: true,
    totalCount: 0,
    successCount: 0,
    failCount: 0,
    results: [],
  };
}
