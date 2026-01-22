/**
 * 통합 주문 관리 - 서버 로직
 *
 * Cafe24, 네이버, 쿠팡 3개 몰 통합 조회
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Channel, UnifiedOrder, OrderStats, OrderItem } from "./orders-unified.shared";
import { parseOrderKey } from "./orders-unified.shared";
import { deductInventoryForOrders, rollbackInventoryDeduction } from "./inventory-deduction.server";

// ===== 쿼리 파라미터 =====
export interface UnifiedOrderQueryParams {
  page: number;
  limit: number;
  statusFilter: string;
  channelFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: string;
}

// ===== 조회 결과 =====
export interface UnifiedOrdersResult {
  orders: UnifiedOrder[];
  totalCount: number;
  uniqueOrderCount: number;
  totalItemCount: number;
  stats: OrderStats;
}

// ===== 지원 채널 =====
const SUPPORTED_CHANNELS: Channel[] = ["cafe24", "naver", "coupang"];

/**
 * 통합 주문 목록 조회 (Cafe24 + 네이버 + 쿠팡)
 */
export async function getUnifiedOrders(
  adminClient: SupabaseClient,
  params: UnifiedOrderQueryParams
): Promise<UnifiedOrdersResult> {
  const {
    page,
    limit,
    statusFilter,
    channelFilter,
    searchQuery,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  } = params;

  // 통계 조회
  const stats = await getOrderStats(adminClient);

  // 채널 필터 결정
  const channels = channelFilter === "all" ? SUPPORTED_CHANNELS : [channelFilter as Channel];

  // 주문 목록 조회
  let query = adminClient
    .from("orders")
    .select(`
      id,
      uniq,
      shop_ord_no,
      sol_no,
      ord_status,
      shop_cd,
      shop_name,
      shop_sale_name,
      shop_opt_name,
      shop_sku_cd,
      pay_amt,
      sales,
      sale_cnt,
      to_name,
      to_tel,
      to_htel,
      to_addr1,
      to_addr2,
      ord_time,
      invoice_no,
      carr_name,
      customer_id
    `, { count: "exact" })
    .in("shop_cd", channels);

  // 정렬
  const ascending = sortOrder === "asc";
  query = query.order(sortBy, { ascending });
  if (sortBy !== "shop_ord_no" && sortBy !== "sol_no") {
    query = query.order("ord_time", { ascending: false });
  }

  // 필터 적용
  if (statusFilter !== "all") {
    query = query.eq("ord_status", statusFilter);
  }

  if (searchQuery) {
    query = query.or(
      `to_name.ilike.%${searchQuery}%,shop_ord_no.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,invoice_no.ilike.%${searchQuery}%`
    );
  }

  if (dateFrom) {
    query = query.gte("ord_time", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    query = query.lte("ord_time", `${dateTo}T23:59:59`);
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: rawOrders, count } = await query;

  // 주문번호별로 그룹핑
  const orders = groupOrdersByOrderNo(rawOrders || []);

  return {
    orders,
    totalCount: count || 0,
    uniqueOrderCount: orders.length,
    totalItemCount: rawOrders?.length || 0,
    stats,
  };
}

/**
 * 주문 통계 조회
 */
export async function getOrderStats(
  adminClient: SupabaseClient
): Promise<OrderStats> {
  const { data } = await adminClient
    .from("orders")
    .select("ord_status, shop_cd")
    .in("shop_cd", SUPPORTED_CHANNELS);

  const byStatus: Record<string, number> = {};
  const byChannel: Record<Channel, number> = {
    cafe24: 0,
    naver: 0,
    coupang: 0,
  };

  data?.forEach((order: any) => {
    // 상태별 집계
    byStatus[order.ord_status] = (byStatus[order.ord_status] || 0) + 1;

    // 채널별 집계
    if (order.shop_cd && SUPPORTED_CHANNELS.includes(order.shop_cd)) {
      byChannel[order.shop_cd as Channel]++;
    }
  });

  return {
    total: data?.length || 0,
    byStatus,
    byChannel,
  };
}

/**
 * 주문번호별 그룹핑
 */
function groupOrdersByOrderNo(rawOrders: any[]): UnifiedOrder[] {
  const ordersMap = new Map<string, UnifiedOrder>();

  for (const row of rawOrders) {
    // 주문번호: shop_ord_no 사용
    const orderNo = row.shop_ord_no || String(row.sol_no);
    const key = `${row.shop_cd}_${orderNo}`;

    if (!ordersMap.has(key)) {
      ordersMap.set(key, {
        key,
        orderNo,
        channel: row.shop_cd as Channel,
        ordStatus: row.ord_status,
        toName: row.to_name,
        toTel: row.to_tel,
        toHtel: row.to_htel,
        toAddr1: row.to_addr1,
        toAddr2: row.to_addr2,
        ordTime: row.ord_time,
        invoiceNo: row.invoice_no,
        carrName: row.carr_name,
        customerId: row.customer_id,
        totalAmount: 0,
        totalQty: 0,
        items: [],
      });
    }

    const order = ordersMap.get(key)!;
    const itemAmt = parseFloat(row.pay_amt || 0) || parseFloat(row.sales || 0);
    order.totalAmount += itemAmt;
    order.totalQty += row.sale_cnt || 1;
    order.items.push({
      id: row.id,
      saleName: row.shop_sale_name,
      optName: row.shop_opt_name,
      skuCd: row.shop_sku_cd,
      qty: row.sale_cnt || 1,
      amt: itemAmt,
    });
  }

  return Array.from(ordersMap.values());
}

/**
 * 송장번호 업데이트
 */
export async function updateInvoice(
  adminClient: SupabaseClient,
  orderNo: string,
  channel: Channel,
  invoiceNo: string,
  carrName: string
): Promise<{ success: boolean; error?: string }> {
  // 주문번호 필드: shop_ord_no 사용
  const { error } = await adminClient
    .from("orders")
    .update({
      invoice_no: invoiceNo || null,
      carr_name: carrName || null,
      ord_status: invoiceNo ? "배송중" : undefined,
    })
    .eq("shop_cd", channel)
    .eq("shop_ord_no", orderNo);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * 상태 일괄 변경
 * - "상품준비중"으로 변경 시 네이버 발주 확인 API 호출
 * - "배송중"으로 변경 시 재고 자동 차감
 * - 취소 상태로 변경 시 재고 자동 복원
 */
export async function bulkUpdateStatus(
  adminClient: SupabaseClient,
  orderKeys: string[],
  newStatus: string
): Promise<{ success: boolean; count: number; deductionErrors?: string[]; apiErrors?: string[] }> {
  let successCount = 0;
  const deductionErrors: string[] = [];
  const apiErrors: string[] = [];

  // 취소 관련 상태 목록
  const cancelStatuses = ["취소", "환불", "반품완료", "주문취소"];
  const isShippingStatus = newStatus === "배송중";
  const isPrepareStatus = newStatus === "상품준비중";
  const isCancelStatus = cancelStatuses.includes(newStatus);

  // 네이버 주문의 productOrderId 수집 (발주 확인용)
  const naverProductOrderIds: string[] = [];

  for (const key of orderKeys) {
    const parsed = parseOrderKey(key);
    if (!parsed) {
      continue; // 유효하지 않은 key는 건너뛰기
    }
    const { channel, orderNo } = parsed;

    // 1. 해당 주문의 uniq, shop_ord_no_real (productOrderId) 조회
    const { data: orderRows } = await adminClient
      .from("orders")
      .select("uniq, inventory_deducted, shop_ord_no_real")
      .eq("shop_cd", channel)
      .eq("shop_ord_no", orderNo);

    if (!orderRows || orderRows.length === 0) {
      continue;
    }

    // 중복 제거된 uniq 목록
    const orderUniqs = [...new Set(orderRows.map((row: any) => row.uniq))];
    const alreadyDeducted = orderRows.some((row: any) => row.inventory_deducted === true);

    // 2. 네이버 주문이고 "상품준비중"으로 변경 시 productOrderId 수집
    if (channel === "naver" && isPrepareStatus) {
      const productOrderIds = orderRows
        .map((row: any) => row.shop_ord_no_real)
        .filter((id: string | null) => id && id.length > 0);
      naverProductOrderIds.push(...productOrderIds);
    }

    // 3. "배송중" 상태로 변경 시 재고 차감
    if (isShippingStatus && !alreadyDeducted) {
      const deductionResult = await deductInventoryForOrders(adminClient, orderUniqs);

      if (!deductionResult.success) {
        // 재고 차감 실패 시 해당 주문은 상태 변경하지 않음
        deductionErrors.push(
          `${orderNo}: ${deductionResult.errors.join(", ") || "재고 차감 실패"}`
        );
        continue;
      }
    }

    // 4. 취소 상태로 변경 시 재고 복원
    if (isCancelStatus && alreadyDeducted) {
      for (const uniq of orderUniqs) {
        await rollbackInventoryDeduction(adminClient, uniq);
      }
    }

    // 5. 상태 업데이트
    const { error } = await adminClient
      .from("orders")
      .update({ ord_status: newStatus })
      .eq("shop_cd", channel)
      .eq("shop_ord_no", orderNo);

    if (!error) successCount++;
  }

  // 6. 네이버 발주 확인 API 일괄 호출 (상품준비중으로 변경 시)
  if (isPrepareStatus && naverProductOrderIds.length > 0) {
    try {
      const { placeOrdersBulk } = await import("~/features/integrations/lib/naver/naver-orders.server");
      const uniqueProductOrderIds = [...new Set(naverProductOrderIds)];

      console.log(`📤 [bulkUpdateStatus] 네이버 발주 확인 API 호출: ${uniqueProductOrderIds.length}건`);

      const result = await placeOrdersBulk(uniqueProductOrderIds);

      if (result.failCount > 0) {
        apiErrors.push(
          ...result.errors.map((e) => `네이버 발주확인 실패: ${e.productOrderId} - ${e.error}`)
        );
      }

      console.log(`✅ [bulkUpdateStatus] 네이버 발주 확인 완료: 성공 ${result.successCount}건, 실패 ${result.failCount}건`);
    } catch (error) {
      console.error(`❌ [bulkUpdateStatus] 네이버 발주 확인 API 호출 오류:`, error);
      apiErrors.push(`네이버 API 호출 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    }
  }

  return {
    success: true,
    count: successCount,
    deductionErrors: deductionErrors.length > 0 ? deductionErrors : undefined,
    apiErrors: apiErrors.length > 0 ? apiErrors : undefined,
  };
}

/**
 * 일괄 삭제
 */
export async function bulkDeleteOrders(
  adminClient: SupabaseClient,
  orderKeys: string[]
): Promise<{ success: boolean; count: number }> {
  let successCount = 0;

  for (const key of orderKeys) {
    const parsed = parseOrderKey(key);
    if (!parsed) {
      continue; // 유효하지 않은 key는 건너뛰기
    }
    const { channel, orderNo } = parsed;

    const { error } = await adminClient
      .from("orders")
      .delete()
      .eq("shop_cd", channel)
      .eq("shop_ord_no", orderNo);

    if (!error) successCount++;
  }

  return { success: true, count: successCount };
}

/**
 * URL 파라미터 파싱
 */
export function parseUnifiedOrderQueryParams(url: URL): UnifiedOrderQueryParams {
  return {
    page: parseInt(url.searchParams.get("page") || "1"),
    limit: parseInt(url.searchParams.get("limit") || "50"),
    statusFilter: url.searchParams.get("status") || "all",
    channelFilter: url.searchParams.get("channel") || "all",
    searchQuery: url.searchParams.get("q") || "",
    dateFrom: url.searchParams.get("dateFrom") || "",
    dateTo: url.searchParams.get("dateTo") || "",
    sortBy: url.searchParams.get("sortBy") || "ord_time",
    sortOrder: url.searchParams.get("sortOrder") || "desc",
  };
}
