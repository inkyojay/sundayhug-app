/**
 * B2B 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "react-router";
import {
  type B2BCustomer,
  type B2BOrder,
  type B2BOrderItem,
  type B2BOrderStats,
  type B2BCustomerStats,
  type B2BShipment,
  type B2BShipmentItem,
  ORDER_STATUS_OPTIONS,
  getTodayString,
} from "./b2b.shared";

// =====================
// 쿼리 파라미터 파싱
// =====================

export interface CustomerQueryParams {
  search: string;
  businessType: string;
  status: string;
}

export function parseCustomerQueryParams(url: URL): CustomerQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    businessType: url.searchParams.get("type") || "all",
    status: url.searchParams.get("status") || "active",
  };
}

export interface OrderQueryParams {
  search: string;
  statusFilter: string;
  customerFilter: string;
  page: number;
  limit: number;
}

export function parseOrderQueryParams(url: URL): OrderQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    statusFilter: url.searchParams.get("status") || "",
    customerFilter: url.searchParams.get("customer") || "",
    page: parseInt(url.searchParams.get("page") || "1"),
    limit: 20,
  };
}

// =====================
// 조회 함수 - 업체
// =====================

/**
 * 업체 목록 조회
 */
export async function getCustomers(
  supabase: SupabaseClient,
  params: CustomerQueryParams
): Promise<{ customers: B2BCustomer[]; count: number }> {
  const { search, businessType, status } = params;

  let query = supabase
    .from("b2b_customers")
    .select("*", { count: "exact" })
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,customer_code.ilike.%${search}%,contact_name.ilike.%${search}%`
    );
  }

  if (businessType !== "all") {
    query = query.eq("business_type", businessType);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to load B2B customers:", error);
  }

  return {
    customers: (data || []) as B2BCustomer[],
    count: count || 0,
  };
}

/**
 * 업체 통계 조회
 */
export async function getCustomerStats(supabase: SupabaseClient): Promise<B2BCustomerStats> {
  const { data: allCustomers } = await supabase
    .from("b2b_customers")
    .select("business_type, is_active")
    .eq("is_deleted", false);

  return {
    total: allCustomers?.length || 0,
    domestic: allCustomers?.filter((c) => c.business_type === "domestic").length || 0,
    overseas: allCustomers?.filter((c) => c.business_type === "overseas").length || 0,
    active: allCustomers?.filter((c) => c.is_active).length || 0,
  };
}

/**
 * 업체 상세 조회
 */
export async function getCustomer(
  supabase: SupabaseClient,
  id: string
): Promise<B2BCustomer | null> {
  const { data, error } = await supabase
    .from("b2b_customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as B2BCustomer;
}

/**
 * 새 업체 코드 생성
 */
export async function generateCustomerCode(supabase: SupabaseClient): Promise<string> {
  const { count } = await supabase
    .from("b2b_customers")
    .select("*", { count: "exact", head: true });

  return `B2B-${String((count || 0) + 1).padStart(4, "0")}`;
}

/**
 * 활성 업체 목록 조회 (Select용)
 */
export async function getActiveCustomers(
  supabase: SupabaseClient
): Promise<{ id: string; customer_code: string; company_name: string; business_type: string; currency: string; payment_terms: string | null }[]> {
  const { data } = await supabase
    .from("b2b_customers")
    .select("id, customer_code, company_name, business_type, currency, payment_terms")
    .eq("is_deleted", false)
    .eq("is_active", true)
    .order("company_name");

  return data || [];
}

// =====================
// 조회 함수 - 주문
// =====================

/**
 * 주문 목록 조회 결과 타입
 */
export interface OrderListResult {
  orders: B2BOrder[];
  totalCount: number;
  totalPages: number;
}

/**
 * 주문 목록 조회
 */
export async function getOrders(
  supabase: SupabaseClient,
  params: OrderQueryParams
): Promise<OrderListResult> {
  const { search, statusFilter, customerFilter, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("b2b_orders")
    .select(
      `
      *,
      customer:b2b_customers(id, customer_code, company_name, business_type),
      items:b2b_order_items(id, parent_sku, product_name, quantity, unit_price, line_total)
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`order_number.ilike.%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (customerFilter && customerFilter !== "__all__") {
    query = query.eq("customer_id", customerFilter);
  }

  const { data: orders, count, error } = await query;

  if (error) {
    console.error("Failed to load B2B orders:", error);
  }

  return {
    orders: (orders || []) as B2BOrder[],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * 주문 상태별 통계 조회
 */
export async function getOrderStats(supabase: SupabaseClient): Promise<B2BOrderStats> {
  const { data: allOrders } = await supabase
    .from("b2b_orders")
    .select("status")
    .eq("is_deleted", false);

  const stats = ORDER_STATUS_OPTIONS.reduce(
    (acc, status) => {
      acc[status.value] = allOrders?.filter((o) => o.status === status.value).length || 0;
      return acc;
    },
    {} as Record<string, number>
  );

  return stats as B2BOrderStats;
}

/**
 * 주문 상세 조회
 */
export async function getOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ order: B2BOrder | null; items: B2BOrderItem[] }> {
  const { data: orderData, error } = await supabase
    .from("b2b_orders")
    .select(`
      *,
      customer:b2b_customers(
        id, customer_code, company_name, company_name_en, business_type,
        contact_name, contact_phone, contact_email,
        address, address_en, shipping_address, shipping_address_en,
        payment_terms, currency
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !orderData) {
    return { order: null, items: [] };
  }

  const { data: itemsData } = await supabase
    .from("b2b_order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");

  return {
    order: orderData as B2BOrder,
    items: (itemsData || []) as B2BOrderItem[],
  };
}

/**
 * 새 주문번호 생성
 */
export async function generateOrderNumber(supabase: SupabaseClient): Promise<string> {
  const today = getTodayString();
  const { count } = await supabase
    .from("b2b_orders")
    .select("*", { count: "exact", head: true })
    .ilike("order_number", `B2B-${today}%`);

  return `B2B-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
}

/**
 * 업체별 가격표 조회
 */
export async function getCustomerPrices(
  supabase: SupabaseClient,
  customerId: string
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("b2b_customer_prices")
    .select("parent_sku, unit_price")
    .eq("customer_id", customerId);

  const prices: Record<string, number> = {};
  if (data) {
    data.forEach((p) => {
      prices[p.parent_sku] = p.unit_price;
    });
  }

  return prices;
}

// =====================
// 조회 함수 - 출고
// =====================

/**
 * 주문의 출고 목록 조회
 */
export async function getShipments(
  supabase: SupabaseClient,
  orderId: string
): Promise<B2BShipment[]> {
  const { data } = await supabase
    .from("b2b_shipments")
    .select(`
      *,
      items:b2b_shipment_items(*)
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  return (data || []) as B2BShipment[];
}

/**
 * 주문의 문서 목록 조회
 */
export async function getDocuments(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ id: string; document_type: string; file_url: string; generated_at: string }[]> {
  const { data } = await supabase
    .from("b2b_documents")
    .select("*")
    .eq("order_id", orderId)
    .order("generated_at", { ascending: false });

  return data || [];
}

/**
 * 새 출고번호 생성
 */
export async function generateShipmentNumber(supabase: SupabaseClient): Promise<string> {
  const today = getTodayString();
  const { count } = await supabase
    .from("b2b_shipments")
    .select("*", { count: "exact", head: true })
    .ilike("shipment_number", `SHP-${today}%`);

  return `SHP-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
}

// =====================
// 조회 함수 - 제품/재고
// =====================

/**
 * Parent Products 목록 조회
 */
export async function getParentProducts(
  supabase: SupabaseClient
): Promise<{ parent_sku: string; product_name: string; category: string | null; subcategory: string | null }[]> {
  const { data, error } = await supabase
    .from("parent_products")
    .select("parent_sku, product_name, category, subcategory")
    .order("product_name");

  if (error) {
    console.error("Parent Products 조회 에러:", error);
  }

  return data || [];
}

/**
 * Parent SKU에 해당하는 SKU 목록 조회
 */
export async function getProductsByParentSku(
  supabase: SupabaseClient,
  parentSkus: string[]
): Promise<Record<string, any[]>> {
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, product_name, color_kr, sku_6_size, parent_sku")
    .in("parent_sku", parentSkus)
    .eq("is_active", true)
    .order("sku");

  const productsByParentSku: Record<string, any[]> = {};
  products?.forEach((product) => {
    if (!productsByParentSku[product.parent_sku]) {
      productsByParentSku[product.parent_sku] = [];
    }
    productsByParentSku[product.parent_sku].push(product);
  });

  return productsByParentSku;
}

/**
 * 창고 목록 조회
 */
export async function getWarehouses(
  supabase: SupabaseClient
): Promise<{ id: string; warehouse_code: string; warehouse_name: string; is_default: boolean }[]> {
  const { data } = await supabase
    .from("warehouses")
    .select("id, warehouse_code, warehouse_name, is_default")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("is_default", { ascending: false });

  return data || [];
}

/**
 * SKU별 창고별 재고 조회
 */
export async function getInventoryBySkuWarehouse(
  supabase: SupabaseClient,
  skus: string[]
): Promise<Record<string, Record<string, number>>> {
  const { data: inventoryLocations } = await supabase
    .from("inventory_locations")
    .select("warehouse_id, sku, quantity")
    .in("sku", skus);

  const inventoryBySkuWarehouse: Record<string, Record<string, number>> = {};
  inventoryLocations?.forEach((loc) => {
    if (!inventoryBySkuWarehouse[loc.sku]) {
      inventoryBySkuWarehouse[loc.sku] = {};
    }
    inventoryBySkuWarehouse[loc.sku][loc.warehouse_id] = loc.quantity;
  });

  return inventoryBySkuWarehouse;
}

// =====================
// Action 핸들러
// =====================

export interface ActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  redirect?: boolean;
  prices?: Record<string, number>;
}

/**
 * 업체 저장 (생성/수정)
 */
export async function saveCustomer(
  supabase: SupabaseClient,
  customerId: string | null,
  customerData: Partial<B2BCustomer>
): Promise<ActionResult> {
  const dataToSave = {
    ...customerData,
    updated_at: new Date().toISOString(),
  };

  if (customerId) {
    const { error } = await supabase
      .from("b2b_customers")
      .update(dataToSave)
      .eq("id", customerId);

    if (error) return { success: false, error: error.message };
    return { success: true, message: "업체 정보가 수정되었습니다." };
  } else {
    const { error } = await supabase
      .from("b2b_customers")
      .insert(dataToSave);

    if (error) return { success: false, error: error.message };
    return { success: true, message: "업체가 등록되었습니다.", redirect: true };
  }
}

/**
 * 업체 삭제 (소프트)
 */
export async function deleteCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<ActionResult> {
  const { error } = await supabase
    .from("b2b_customers")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) return { success: false, error: error.message };
  return { success: true, message: "업체가 삭제되었습니다." };
}

/**
 * 업체 상태 토글
 */
export async function toggleCustomerStatus(
  supabase: SupabaseClient,
  customerId: string,
  currentStatus: boolean
): Promise<ActionResult> {
  const { error } = await supabase
    .from("b2b_customers")
    .update({
      is_active: !currentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    message: currentStatus ? "비활성화되었습니다." : "활성화되었습니다.",
  };
}

/**
 * 주문 저장 (생성/수정)
 */
export async function saveOrder(
  supabase: SupabaseClient,
  orderId: string | null,
  orderData: Partial<B2BOrder>,
  items: B2BOrderItem[]
): Promise<ActionResult | Response> {
  if (orderId) {
    // 수정
    const { error } = await supabase
      .from("b2b_orders")
      .update({ ...orderData, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) return { success: false, error: error.message };

    // 기존 품목 삭제 후 재삽입
    await supabase.from("b2b_order_items").delete().eq("order_id", orderId);

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        order_id: orderId,
        parent_sku: item.parent_sku,
        product_name: item.product_name,
        product_name_en: item.product_name_en || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate || 0,
        line_total: item.line_total,
        notes: item.notes || null,
      }));

      await supabase.from("b2b_order_items").insert(itemsToInsert);
    }

    return { success: true, message: "주문이 수정되었습니다." };
  } else {
    // 새로 생성
    const { data: newOrder, error } = await supabase
      .from("b2b_orders")
      .insert(orderData)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (items.length > 0 && newOrder) {
      const itemsToInsert = items.map((item) => ({
        order_id: newOrder.id,
        parent_sku: item.parent_sku,
        product_name: item.product_name,
        product_name_en: item.product_name_en || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate || 0,
        line_total: item.line_total,
        notes: item.notes || null,
      }));

      await supabase.from("b2b_order_items").insert(itemsToInsert);
    }

    return redirect(`/dashboard/b2b/orders/${newOrder?.id}`);
  }
}

/**
 * 주문 삭제
 */
export async function deleteOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<ActionResult | Response> {
  await supabase.from("b2b_order_items").delete().eq("order_id", orderId);
  await supabase.from("b2b_orders").delete().eq("id", orderId);
  return redirect("/dashboard/b2b/orders");
}

/**
 * 주문 상태 업데이트
 */
export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  status: string
): Promise<ActionResult> {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "confirmed") {
    updateData.confirmed_at = new Date().toISOString();
  } else if (status === "shipped") {
    updateData.shipped_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("b2b_orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };
  return { success: true, message: "상태가 변경되었습니다." };
}

/**
 * 주문 소프트 삭제 (목록에서)
 */
export async function softDeleteOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<ActionResult> {
  const { error } = await supabase
    .from("b2b_orders")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };
  return { success: true, message: "주문이 삭제되었습니다." };
}

/**
 * 결제 상태 업데이트
 */
export async function updatePaymentStatus(
  supabase: SupabaseClient,
  orderId: string,
  paymentStatus: string
): Promise<ActionResult> {
  const { error } = await supabase
    .from("b2b_orders")
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };
  return { success: true, message: "결제 상태가 변경되었습니다." };
}

/**
 * 출고 지시 생성
 */
export async function createShipment(
  supabase: SupabaseClient,
  orderId: string,
  shipmentData: Partial<B2BShipment>,
  items: B2BShipmentItem[]
): Promise<ActionResult | Response> {
  if (!shipmentData.warehouse_id) {
    return { success: false, error: "출고 창고를 선택해주세요." };
  }

  // 출고 지시 생성
  const { data: newShipment, error } = await supabase
    .from("b2b_shipments")
    .insert({ ...shipmentData, order_id: orderId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // 출고 품목 생성
  if (items.length > 0 && newShipment) {
    const itemsToInsert = items.map((item) => ({
      shipment_id: newShipment.id,
      order_item_id: item.order_item_id || null,
      sku: item.sku,
      product_id: item.product_id || null,
      product_name: item.product_name,
      color: item.color || null,
      size: item.size || null,
      quantity: item.quantity,
      box_number: item.box_number || null,
    }));

    const { error: itemsError } = await supabase
      .from("b2b_shipment_items")
      .insert(itemsToInsert);

    if (itemsError) {
      // 롤백 - 출고 지시 삭제
      await supabase.from("b2b_shipments").delete().eq("id", newShipment.id);
      return { success: false, error: itemsError.message };
    }
  }

  // 주문 상태 업데이트
  await supabase
    .from("b2b_orders")
    .update({
      status: "shipping",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return redirect(`/dashboard/b2b/orders/${orderId}`);
}

/**
 * 출고 상태 업데이트 (재고 차감/복원 포함)
 */
export async function updateShipmentStatus(
  supabase: SupabaseClient,
  orderId: string,
  shipmentId: string,
  newStatus: string,
  trackingNumber?: string
): Promise<ActionResult> {
  // 현재 출고 정보 조회
  const { data: shipment, error: shipmentError } = await supabase
    .from("b2b_shipments")
    .select("*, items:b2b_shipment_items(*)")
    .eq("id", shipmentId)
    .single();

  if (shipmentError || !shipment) {
    return { success: false, error: "출고 정보를 찾을 수 없습니다." };
  }

  const previousStatus = shipment.status;

  // 출고 완료로 변경 시 재고 차감
  if (newStatus === "shipped" && previousStatus !== "shipped") {
    if (!shipment.warehouse_id) {
      return { success: false, error: "출고 창고가 지정되지 않았습니다." };
    }

    for (const item of shipment.items || []) {
      // 창고별 재고 차감
      const { error: decreaseError } = await supabase.rpc("decrease_inventory_location", {
        p_warehouse_id: shipment.warehouse_id,
        p_sku: item.sku,
        p_quantity: item.quantity,
        p_reason: `B2B 출고: ${shipment.shipment_number}`,
      });

      if (decreaseError) {
        console.error(`재고 차감 실패 (${item.sku}):`, decreaseError);
      }

      // 전체 재고도 차감
      const { error: decreaseMainError } = await supabase.rpc("decrease_inventory", {
        p_sku: item.sku,
        p_quantity: item.quantity,
        p_reason: `B2B 출고: ${shipment.shipment_number}`,
      });

      if (decreaseMainError) {
        console.error(`전체 재고 차감 실패 (${item.sku}):`, decreaseMainError);
      }
    }
  }

  // 출고 취소 시 재고 복원 (이미 출고 완료된 경우에만)
  if (newStatus === "cancelled" && previousStatus === "shipped") {
    for (const item of shipment.items || []) {
      const { error: increaseError } = await supabase.rpc("increase_inventory_location", {
        p_warehouse_id: shipment.warehouse_id,
        p_sku: item.sku,
        p_quantity: item.quantity,
        p_reason: `B2B 출고 취소: ${shipment.shipment_number}`,
      });

      if (increaseError) {
        console.error(`재고 복원 실패 (${item.sku}):`, increaseError);
      }
    }
  }

  // 출고 상태 업데이트
  const updateData: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "shipped") {
    updateData.shipped_date = new Date().toISOString().slice(0, 10);
  }

  if (trackingNumber) {
    updateData.tracking_number = trackingNumber;
  }

  const { error: updateError } = await supabase
    .from("b2b_shipments")
    .update(updateData)
    .eq("id", shipmentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 주문 상태도 업데이트
  if (newStatus === "shipped") {
    await supabase
      .from("b2b_orders")
      .update({ status: "shipped", shipped_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  const statusLabels: Record<string, string> = {
    pending: "대기",
    preparing: "준비중",
    shipped: "출고완료",
    delivered: "배송완료",
    cancelled: "취소",
  };

  return {
    success: true,
    message: `출고 상태가 '${statusLabels[newStatus] || newStatus}'(으)로 변경되었습니다.${
      newStatus === "shipped" ? " 재고가 차감되었습니다." : ""
    }${newStatus === "cancelled" && previousStatus === "shipped" ? " 재고가 복원되었습니다." : ""}`,
  };
}

// =====================
// 가격표 Action 핸들러
// =====================

/**
 * 가격 추가/수정
 */
export async function savePrice(
  supabase: SupabaseClient,
  customerId: string,
  priceData: { parent_sku: string; unit_price: number; currency: string; notes?: string | null },
  priceId?: string
): Promise<ActionResult> {
  const dataToSave = {
    customer_id: customerId,
    ...priceData,
    updated_at: new Date().toISOString(),
  };

  if (priceId) {
    const { error } = await supabase
      .from("b2b_customer_prices")
      .update(dataToSave)
      .eq("id", priceId);

    if (error) return { success: false, error: error.message };
    return { success: true, message: "가격이 수정되었습니다." };
  } else {
    const { error } = await supabase.from("b2b_customer_prices").insert(dataToSave);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "이미 등록된 제품입니다." };
      }
      return { success: false, error: error.message };
    }
    return { success: true, message: "가격이 등록되었습니다." };
  }
}

/**
 * 가격 삭제
 */
export async function deletePrice(
  supabase: SupabaseClient,
  priceId: string
): Promise<ActionResult> {
  const { error } = await supabase.from("b2b_customer_prices").delete().eq("id", priceId);

  if (error) return { success: false, error: error.message };
  return { success: true, message: "삭제되었습니다." };
}

/**
 * 일괄 가격 추가
 */
export async function bulkAddPrices(
  supabase: SupabaseClient,
  customerId: string,
  items: { parent_sku: string; unit_price: string }[],
  currency: string
): Promise<ActionResult> {
  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    if (!item.parent_sku || !item.unit_price) continue;

    const priceData = {
      customer_id: customerId,
      parent_sku: item.parent_sku,
      unit_price: parseFloat(item.unit_price),
      currency: currency,
      notes: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("b2b_customer_prices")
      .upsert(priceData, { onConflict: "customer_id,parent_sku" });

    if (error) {
      errorCount++;
    } else {
      successCount++;
    }
  }

  return {
    success: true,
    message: `${successCount}개 제품 가격 설정 완료${errorCount > 0 ? `, ${errorCount}개 실패` : ""}`,
  };
}

/**
 * CSV 업로드 처리
 */
export async function uploadPricesFromCSV(
  supabase: SupabaseClient,
  customerId: string,
  csvData: { parent_sku: string; unit_price: string; notes?: string }[],
  currency: string
): Promise<ActionResult> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const row of csvData) {
    if (!row.parent_sku || !row.unit_price) continue;

    const priceData = {
      customer_id: customerId,
      parent_sku: row.parent_sku,
      unit_price: parseFloat(row.unit_price),
      currency: currency,
      notes: row.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("b2b_customer_prices")
      .upsert(priceData, { onConflict: "customer_id,parent_sku" });

    if (error) {
      errorCount++;
      errors.push(`${row.parent_sku}: ${error.message}`);
    } else {
      successCount++;
    }
  }

  return {
    success: true,
    message: `CSV 업로드 완료: ${successCount}개 성공${errorCount > 0 ? `, ${errorCount}개 실패` : ""}`,
  };
}

/**
 * FormData에서 업체 데이터 파싱
 */
export function parseCustomerFormData(formData: FormData): Partial<B2BCustomer> {
  return {
    customer_code: formData.get("customer_code") as string,
    company_name: formData.get("company_name") as string,
    company_name_en: (formData.get("company_name_en") as string) || null,
    business_type: formData.get("business_type") as "domestic" | "overseas",
    country_code: formData.get("country_code") as string,
    business_registration_no: (formData.get("business_registration_no") as string) || null,
    representative_name: (formData.get("representative_name") as string) || null,
    contact_name: (formData.get("contact_name") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    contact_position: (formData.get("contact_position") as string) || null,
    address: (formData.get("address") as string) || null,
    address_en: (formData.get("address_en") as string) || null,
    shipping_address: (formData.get("shipping_address") as string) || null,
    shipping_address_en: (formData.get("shipping_address_en") as string) || null,
    payment_terms: (formData.get("payment_terms") as string) || null,
    currency: formData.get("currency") as string,
    notes: (formData.get("notes") as string) || null,
    is_active: formData.get("is_active") === "true",
  };
}

/**
 * FormData에서 주문 데이터 파싱
 */
export function parseOrderFormData(formData: FormData): {
  orderData: Partial<B2BOrder>;
  items: B2BOrderItem[];
} {
  const orderData: Partial<B2BOrder> = {
    order_number: formData.get("order_number") as string,
    customer_id: formData.get("customer_id") as string,
    status: (formData.get("status") as string) as any || "quote_draft",
    order_date: formData.get("order_date") as string,
    quote_valid_until: (formData.get("quote_valid_until") as string) || null,
    currency: (formData.get("currency") as string) || "KRW",
    subtotal: parseFloat(formData.get("subtotal") as string) || 0,
    discount_amount: parseFloat(formData.get("discount_amount") as string) || 0,
    shipping_cost: parseFloat(formData.get("shipping_cost") as string) || 0,
    tax_amount: parseFloat(formData.get("tax_amount") as string) || 0,
    total_amount: parseFloat(formData.get("total_amount") as string) || 0,
    payment_terms: (formData.get("payment_terms") as string) || null,
    shipping_address: (formData.get("shipping_address") as string) || null,
    shipping_address_en: (formData.get("shipping_address_en") as string) || null,
    internal_notes: (formData.get("internal_notes") as string) || null,
    customer_notes: (formData.get("customer_notes") as string) || null,
  };

  const items = JSON.parse((formData.get("items") as string) || "[]");

  return { orderData, items };
}

/**
 * FormData에서 출고 데이터 파싱
 */
export function parseShipmentFormData(formData: FormData): {
  shipmentData: Partial<B2BShipment>;
  items: B2BShipmentItem[];
} {
  const shipmentData: Partial<B2BShipment> = {
    shipment_number: formData.get("shipment_number") as string,
    warehouse_id: (formData.get("warehouse_id") as string) || null,
    status: (formData.get("status") as string) as any || "pending",
    planned_date: (formData.get("planned_date") as string) || null,
    shipping_method: (formData.get("shipping_method") as string) || null,
    carrier_name: (formData.get("carrier_name") as string) || null,
    tracking_number: (formData.get("tracking_number") as string) || null,
    shipping_cost: parseFloat(formData.get("shipping_cost") as string) || 0,
    notes: (formData.get("notes") as string) || null,
  };

  const items = JSON.parse((formData.get("items") as string) || "[]");

  return { shipmentData, items };
}
