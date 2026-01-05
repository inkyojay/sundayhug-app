/**
 * 발주 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "react-router";
import {
  type OrderItem,
  type PurchaseOrder,
  type PurchaseOrderStats,
  type Factory,
  type Product,
  ORDER_STATUS_OPTIONS,
  getTodayString,
} from "./purchase-orders.shared";

// =====================
// 쿼리 파라미터 파싱
// =====================

export interface PurchaseOrderQueryParams {
  search: string;
  statusFilter: string;
  factoryFilter: string;
  page: number;
  limit: number;
}

export function parseQueryParams(url: URL): PurchaseOrderQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    statusFilter: url.searchParams.get("status") || "",
    factoryFilter: url.searchParams.get("factory") || "",
    page: parseInt(url.searchParams.get("page") || "1"),
    limit: 20,
  };
}

// =====================
// 조회 함수
// =====================

/**
 * 공장 목록 조회
 */
export async function getFactories(supabase: SupabaseClient): Promise<Factory[]> {
  const { data } = await supabase
    .from("factories")
    .select("id, factory_name, factory_code")
    .eq("is_active", true)
    .order("factory_name");

  return data || [];
}

/**
 * 제품 목록 조회 (SKU 선택용)
 */
export async function getProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select(
      `
      id, sku, product_name, color_kr, sku_6_size, cost_price, parent_sku,
      parent_product:parent_products!fk_parent_product(id, product_name)
    `
    )
    .eq("is_active", true)
    .order("sku");

  return data || [];
}

/**
 * 발주서 상세 조회
 */
export async function getPurchaseOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ order: PurchaseOrder | null; items: OrderItem[] }> {
  const { data: orderData } = await supabase
    .from("purchase_orders")
    .select(
      `
      *,
      factory:factories(id, factory_name, factory_code)
    `
    )
    .eq("id", orderId)
    .single();

  if (!orderData) {
    return { order: null, items: [] };
  }

  const { data: itemsData } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", orderId)
    .order("created_at");

  return {
    order: orderData as PurchaseOrder,
    items: itemsData || [],
  };
}

/**
 * 새 발주번호 생성
 */
export async function generateOrderNumber(supabase: SupabaseClient): Promise<string> {
  const today = getTodayString();
  const { count } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .ilike("order_number", `PO-${today}%`);

  return `PO-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
}

/**
 * 발주서 목록 조회 결과 타입
 */
export interface PurchaseOrderListResult {
  orders: PurchaseOrder[];
  totalCount: number;
  totalPages: number;
}

/**
 * 발주서 목록 조회
 */
export async function getPurchaseOrders(
  supabase: SupabaseClient,
  params: PurchaseOrderQueryParams
): Promise<PurchaseOrderListResult> {
  const { search, statusFilter, factoryFilter, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("purchase_orders")
    .select(
      `
      *,
      factory:factories(id, factory_name, factory_code),
      items:purchase_order_items(id, sku, product_name, quantity, received_quantity)
    `,
      { count: "exact" }
    )
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("order_number", `%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (factoryFilter && factoryFilter !== "__all__") {
    query = query.eq("factory_id", factoryFilter);
  }

  const { data: orders, count, error } = await query;

  if (error) {
    console.error("Failed to load purchase orders:", error);
  }

  return {
    orders: (orders || []) as PurchaseOrder[],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * 상태별 통계 조회
 */
export async function getOrderStats(supabase: SupabaseClient): Promise<PurchaseOrderStats> {
  const { data: statusCounts } = await supabase.from("purchase_orders").select("status");

  const stats = ORDER_STATUS_OPTIONS.reduce(
    (acc, status) => {
      acc[status.value] = statusCounts?.filter((o) => o.status === status.value).length || 0;
      return acc;
    },
    {} as Record<string, number>
  );

  return stats as PurchaseOrderStats;
}

// =====================
// Action 핸들러
// =====================

export interface ActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * 발주서 저장 데이터 타입
 */
interface SaveOrderData {
  order_number: string;
  factory_id: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  total_quantity: number;
  total_amount: number;
}

/**
 * 발주서 저장 (생성/수정)
 */
export async function savePurchaseOrder(
  supabase: SupabaseClient,
  orderId: string | null,
  orderData: SaveOrderData,
  items: OrderItem[]
): Promise<ActionResult | Response> {
  if (orderId) {
    // 수정
    const { error } = await supabase
      .from("purchase_orders")
      .update({ ...orderData, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) return { error: error.message };

    // 기존 품목 삭제 후 재삽입
    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", orderId);

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        purchase_order_id: orderId,
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      await supabase.from("purchase_order_items").insert(itemsToInsert);
    }

    return { success: true, message: "발주서가 수정되었습니다." };
  } else {
    // 새로 생성
    const { data: newOrder, error } = await supabase
      .from("purchase_orders")
      .insert(orderData)
      .select()
      .single();

    if (error) return { error: error.message };

    if (items.length > 0 && newOrder) {
      const itemsToInsert = items.map((item) => ({
        purchase_order_id: newOrder.id,
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      await supabase.from("purchase_order_items").insert(itemsToInsert);
    }

    return redirect(`/dashboard/purchase-orders/${newOrder?.id}`);
  }
}

/**
 * 발주서 삭제 (폼 화면에서)
 */
export async function deletePurchaseOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<Response> {
  await supabase.from("purchase_order_items").delete().eq("purchase_order_id", orderId);
  await supabase.from("purchase_orders").delete().eq("id", orderId);
  return redirect("/dashboard/purchase-orders");
}

/**
 * 발주서 상태 업데이트
 */
export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  status: string
): Promise<ActionResult> {
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * 발주서 소프트 삭제 (목록에서)
 */
export async function softDeleteOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<ActionResult> {
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };
  return { success: true, message: "발주서가 삭제되었습니다." };
}

/**
 * FormData에서 발주서 저장 데이터 파싱
 */
export function parseOrderFormData(formData: FormData): {
  orderData: SaveOrderData;
  items: OrderItem[];
} {
  const orderData: SaveOrderData = {
    order_number: formData.get("order_number") as string,
    factory_id: formData.get("factory_id") as string,
    status: (formData.get("status") as string) || "draft",
    order_date: formData.get("order_date") as string,
    expected_date: (formData.get("expected_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
    total_quantity: parseInt(formData.get("total_quantity") as string) || 0,
    total_amount: parseFloat(formData.get("total_amount") as string) || 0,
  };

  const items = JSON.parse((formData.get("items") as string) || "[]");

  return { orderData, items };
}
