/**
 * 교환/반품/AS 관리 - 서버 로직
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ReturnExchange,
  ReturnStats,
  ReturnFilters,
  Warehouse,
  Product,
  ReturnItemInput,
  OrderSearchResult,
} from "./returns.shared";
import { ACTIVE_STATUSES } from "./returns.shared";

// 쿼리 파라미터 파싱
export function parseReturnQueryParams(url: URL): ReturnFilters {
  return {
    search: url.searchParams.get("search") || "",
    typeFilter: url.searchParams.get("type") || "",
    statusFilter: url.searchParams.get("status") || "",
    channelFilter: url.searchParams.get("channel") || "",
  };
}

// 새 반품번호 생성
export async function generateReturnNumber(
  supabase: SupabaseClient
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("returns_exchanges")
    .select("*", { count: "exact", head: true })
    .ilike("return_number", `RE-${today}%`);

  return `RE-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
}

// 창고 목록 조회
export async function getWarehouses(
  supabase: SupabaseClient
): Promise<Warehouse[]> {
  const { data } = await supabase
    .from("warehouses")
    .select("id, warehouse_name, warehouse_code")
    .eq("is_active", true)
    .order("warehouse_name");

  return data || [];
}

// 상품 목록 조회
export async function getProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select("id, sku, product_name, color_kr, sku_6_size")
    .eq("is_active", true)
    .order("sku");

  return data || [];
}

// 교환/반품/AS 목록 조회
export interface ReturnsListResult {
  returns: ReturnExchange[];
  stats: ReturnStats;
}

export async function getReturnsList(
  supabase: SupabaseClient,
  filters: ReturnFilters
): Promise<ReturnsListResult> {
  const { search, typeFilter, statusFilter, channelFilter } = filters;

  let query = supabase
    .from("returns_exchanges")
    .select(
      `
      *,
      restock_warehouse:warehouses(id, warehouse_name),
      items:return_exchange_items(id, sku, product_name, option_name, quantity, condition, restock_quantity)
    `
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `return_number.ilike.%${search}%,order_number.ilike.%${search}%,customer_name.ilike.%${search}%`
    );
  }

  if (typeFilter && typeFilter !== "__all__") {
    query = query.eq("return_type", typeFilter);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (channelFilter && channelFilter !== "__all__") {
    query = query.eq("channel", channelFilter);
  }

  const { data: returns, error } = await query;

  if (error) {
    console.error("Failed to load returns:", error);
  }

  const returnsList = returns || [];

  // 통계 계산
  const stats: ReturnStats = {
    received: returnsList.filter((r) => r.status === "received").length,
    processing: returnsList.filter(
      (r) => ACTIVE_STATUSES.includes(r.status) && r.status !== "received"
    ).length,
    exchange: returnsList.filter(
      (r) => r.return_type === "exchange" && ACTIVE_STATUSES.includes(r.status)
    ).length,
    return: returnsList.filter(
      (r) => r.return_type === "return" && ACTIVE_STATUSES.includes(r.status)
    ).length,
    repair: returnsList.filter(
      (r) => r.return_type === "repair" && ACTIVE_STATUSES.includes(r.status)
    ).length,
  };

  return { returns: returnsList, stats };
}

// === Action 핸들러들 ===

// 신규 등록
export interface CreateReturnData {
  return_number: string;
  order_number: string | null;
  channel: string | null;
  return_type: string;
  reason: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  return_date: string;
  restock_warehouse_id: string | null;
  notes: string | null;
}

export async function createReturn(
  supabase: SupabaseClient,
  data: CreateReturnData,
  items: ReturnItemInput[]
) {
  // 헤더 생성
  const { data: newReturn, error } = await supabase
    .from("returns_exchanges")
    .insert({ ...data, status: "received" })
    .select()
    .single();

  if (error) return { error: error.message };

  // 품목 생성
  if (items.length > 0 && newReturn) {
    const itemsToInsert = items.map((item) => ({
      return_exchange_id: newReturn.id,
      product_id: item.product_id || null,
      sku: item.sku,
      product_name: item.product_name,
      option_name: item.option_name || null,
      quantity: item.quantity,
      return_reason: item.return_reason || null,
      condition: item.condition || "good",
    }));

    await supabase.from("return_exchange_items").insert(itemsToInsert);
  }

  return { success: true, message: "등록되었습니다." };
}

// 상태 업데이트
export interface UpdateStatusParams {
  id: string;
  status: string;
  restocked: boolean;
  restockWarehouseId: string | null;
}

export async function updateReturnStatus(
  supabase: SupabaseClient,
  params: UpdateStatusParams
) {
  const { id, status, restocked, restockWarehouseId } = params;

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "completed") {
    updateData.completed_date = new Date().toISOString().slice(0, 10);
  }

  if (restocked && restockWarehouseId) {
    updateData.restocked = true;
    updateData.restock_warehouse_id = restockWarehouseId;

    // 재입고 처리
    const { data: returnData } = await supabase
      .from("returns_exchanges")
      .select("items:return_exchange_items(*)")
      .eq("id", id)
      .single();

    if (returnData?.items) {
      for (const item of returnData.items) {
        if (item.condition === "good") {
          const { data: existing } = await supabase
            .from("inventory_locations")
            .select("id, quantity")
            .eq("warehouse_id", restockWarehouseId)
            .eq("sku", item.sku)
            .single();

          if (existing) {
            await supabase
              .from("inventory_locations")
              .update({
                quantity: existing.quantity + item.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("inventory_locations").insert({
              warehouse_id: restockWarehouseId,
              product_id: item.product_id || null,
              sku: item.sku,
              quantity: item.quantity,
            });
          }

          // 재입고 수량 업데이트
          await supabase
            .from("return_exchange_items")
            .update({ restock_quantity: item.quantity })
            .eq("id", item.id);
        }
      }
    }
  }

  const { error } = await supabase
    .from("returns_exchanges")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// 주문 검색
export async function searchOrders(
  supabase: SupabaseClient,
  searchQuery: string
): Promise<OrderSearchResult[]> {
  if (!searchQuery) {
    return [];
  }

  // orders 테이블에서 검색 (Cafe24, 네이버 통합)
  const { data: ordersData } = await supabase
    .from("orders")
    .select(
      `
      id, shop_ord_no, ord_time, to_name, to_tel, to_htel,
      shop_cd, shop_sale_name, shop_opt_name, shop_sku_cd, sale_cnt
    `
    )
    .in("shop_cd", ["cafe24", "naver"])
    .or(
      `shop_ord_no.ilike.%${searchQuery}%,to_name.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,to_htel.ilike.%${searchQuery}%`
    )
    .order("ord_time", { ascending: false })
    .limit(50);

  // 주문번호별로 그룹핑
  const ordersMap = new Map<
    string,
    {
      channel: string;
      order_number: string;
      order_date: string;
      customer_name: string;
      customer_phone: string;
      items: Array<{
        sku: string;
        product_name: string;
        option_name: string;
        quantity: number;
      }>;
    }
  >();

  for (const row of ordersData || []) {
    const key = `${row.shop_cd}_${row.shop_ord_no}`;

    if (!ordersMap.has(key)) {
      ordersMap.set(key, {
        channel: row.shop_cd || "direct",
        order_number: row.shop_ord_no || "",
        order_date: row.ord_time || "",
        customer_name: row.to_name || "",
        customer_phone: row.to_tel || row.to_htel || "",
        items: [],
      });
    }

    const order = ordersMap.get(key)!;
    order.items.push({
      sku: row.shop_sku_cd || "",
      product_name: row.shop_sale_name || "",
      option_name: row.shop_opt_name || "",
      quantity: row.sale_cnt || 1,
    });
  }

  const orders = Array.from(ordersMap.values())
    .sort(
      (a, b) =>
        new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
    )
    .slice(0, 20);

  return orders;
}
