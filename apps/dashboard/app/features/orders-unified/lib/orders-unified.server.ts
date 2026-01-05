/**
 * 통합 주문 관리 - 서버 로직
 *
 * Cafe24, 네이버, 쿠팡 3개 몰 통합 조회
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Channel, UnifiedOrder, OrderStats, OrderItem } from "./orders-unified.shared";

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
 */
export async function bulkUpdateStatus(
  adminClient: SupabaseClient,
  orderKeys: string[],
  newStatus: string
): Promise<{ success: boolean; count: number }> {
  let successCount = 0;

  for (const key of orderKeys) {
    const [channel, ...orderNoParts] = key.split("_");
    const orderNo = orderNoParts.join("_"); // 주문번호에 _ 포함될 수 있음

    const { error } = await adminClient
      .from("orders")
      .update({ ord_status: newStatus })
      .eq("shop_cd", channel)
      .eq("shop_ord_no", orderNo);

    if (!error) successCount++;
  }

  return { success: true, count: successCount };
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
    const [channel, ...orderNoParts] = key.split("_");
    const orderNo = orderNoParts.join("_");

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
