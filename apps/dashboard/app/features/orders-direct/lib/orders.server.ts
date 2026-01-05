/**
 * 주문 관리 서버 로직
 *
 * DB 쿼리 및 비즈니스 로직을 담당
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface OrderQueryParams {
  page: number;
  limit: number;
  statusFilter: string;
  shopFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: string;
}

export interface OrderItem {
  id: string;
  saleName: string;
  optName: string;
  skuCd: string;
  qty: number;
  amt: number;
}

export interface Order {
  key: string;
  orderNo: string;
  shopCd: string;
  ordStatus: string;
  toName: string;
  toTel: string;
  toHtel: string;
  toAddr1: string;
  toAddr2: string;
  ordTime: string;
  invoiceNo: string | null;
  carrName: string | null;
  customerId: string | null;
  totalAmount: number;
  totalQty: number;
  items: OrderItem[];
}

export interface OrdersResult {
  orders: Order[];
  totalCount: number;
  uniqueOrderCount: number;
  totalItemCount: number;
  statusStats: Record<string, number>;
  shopStats: Record<string, number>;
}

/**
 * 주문 목록 조회 (카페24/네이버)
 */
export async function getOrders(
  adminClient: SupabaseClient,
  params: OrderQueryParams
): Promise<OrdersResult> {
  const {
    page,
    limit,
    statusFilter,
    shopFilter,
    searchQuery,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  } = params;

  // 통계 조회 (카페24/네이버만)
  const [statusStats, shopStats] = await Promise.all([
    getStatusStats(adminClient),
    getShopStats(adminClient),
  ]);

  // 주문 목록 조회
  let query = adminClient
    .from("orders")
    .select(`
      id,
      uniq,
      shop_ord_no,
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
    .in("shop_cd", ["cafe24", "naver"]);

  // 정렬
  const ascending = sortOrder === "asc";
  query = query.order(sortBy, { ascending });
  if (sortBy !== "shop_ord_no") {
    query = query.order("shop_ord_no", { ascending: false });
  }

  // 필터 적용
  if (statusFilter !== "all") {
    query = query.eq("ord_status", statusFilter);
  }
  if (shopFilter !== "all") {
    query = query.eq("shop_cd", shopFilter);
  }
  if (searchQuery) {
    query = query.or(`to_name.ilike.%${searchQuery}%,shop_ord_no.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,invoice_no.ilike.%${searchQuery}%`);
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
    statusStats,
    shopStats,
  };
}

/**
 * 주문 상태별 통계
 */
async function getStatusStats(
  adminClient: SupabaseClient
): Promise<Record<string, number>> {
  const { data } = await adminClient
    .from("orders")
    .select("ord_status")
    .in("shop_cd", ["cafe24", "naver"]);

  const stats: Record<string, number> = {};
  data?.forEach((order: any) => {
    stats[order.ord_status] = (stats[order.ord_status] || 0) + 1;
  });
  return stats;
}

/**
 * 쇼핑몰별 통계
 */
async function getShopStats(
  adminClient: SupabaseClient
): Promise<Record<string, number>> {
  const { data } = await adminClient
    .from("orders")
    .select("shop_cd")
    .in("shop_cd", ["cafe24", "naver"]);

  const shops: Record<string, number> = {};
  data?.forEach((order: any) => {
    if (order.shop_cd) {
      shops[order.shop_cd] = (shops[order.shop_cd] || 0) + 1;
    }
  });
  return shops;
}

/**
 * 주문번호별 그룹핑
 */
function groupOrdersByOrderNo(rawOrders: any[]): Order[] {
  const ordersMap = new Map<string, Order>();

  for (const row of rawOrders) {
    const key = `${row.shop_cd}_${row.shop_ord_no}`;

    if (!ordersMap.has(key)) {
      ordersMap.set(key, {
        key,
        orderNo: row.shop_ord_no,
        shopCd: row.shop_cd,
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
    order.totalQty += row.sale_cnt || 0;
    order.items.push({
      id: row.id,
      saleName: row.shop_sale_name,
      optName: row.shop_opt_name,
      skuCd: row.shop_sku_cd,
      qty: row.sale_cnt,
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
  shopCd: string,
  invoiceNo: string,
  carrName: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await adminClient
    .from("orders")
    .update({
      invoice_no: invoiceNo || null,
      carr_name: carrName || null,
      ord_status: invoiceNo ? "배송중" : undefined,
    })
    .eq("shop_ord_no", orderNo)
    .eq("shop_cd", shopCd);

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
    const [shopCd, orderNo] = key.split("_");
    const { error } = await adminClient
      .from("orders")
      .update({ ord_status: newStatus })
      .eq("shop_ord_no", orderNo)
      .eq("shop_cd", shopCd);

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
    const [shopCd, orderNo] = key.split("_");
    const { error } = await adminClient
      .from("orders")
      .delete()
      .eq("shop_ord_no", orderNo)
      .eq("shop_cd", shopCd);

    if (!error) successCount++;
  }

  return { success: true, count: successCount };
}

/**
 * URL 파라미터 파싱
 */
export function parseOrderQueryParams(url: URL): OrderQueryParams {
  return {
    page: parseInt(url.searchParams.get("page") || "1"),
    limit: parseInt(url.searchParams.get("limit") || "50"),
    statusFilter: url.searchParams.get("status") || "all",
    shopFilter: url.searchParams.get("shop") || "all",
    searchQuery: url.searchParams.get("q") || "",
    dateFrom: url.searchParams.get("dateFrom") || "",
    dateTo: url.searchParams.get("dateTo") || "",
    sortBy: url.searchParams.get("sortBy") || "ord_time",
    sortOrder: url.searchParams.get("sortOrder") || "desc",
  };
}
