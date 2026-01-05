/**
 * 입고 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StockReceipt,
  StockReceiptItem,
  Warehouse,
  PurchaseOrder,
  Product,
  StockReceiptActionResult,
} from "./stock-receipts.shared";

// ========== 쿼리 파라미터 ==========

export interface StockReceiptQueryParams {
  search: string;
  statusFilter: string;
  warehouseFilter: string;
}

export function parseStockReceiptQueryParams(url: URL): StockReceiptQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    statusFilter: url.searchParams.get("status") || "",
    warehouseFilter: url.searchParams.get("warehouse") || "",
  };
}

// ========== Loader 함수들 ==========

/**
 * 입고 목록 조회
 */
export async function getStockReceipts(
  supabase: SupabaseClient,
  params: StockReceiptQueryParams
): Promise<StockReceipt[]> {
  const { search, statusFilter, warehouseFilter } = params;

  let query = supabase
    .from("stock_receipts")
    .select(`
      *,
      warehouse:warehouses(id, warehouse_name, warehouse_code),
      purchase_order:purchase_orders(id, order_number),
      items:stock_receipt_items(id, sku, product_name, received_quantity)
    `)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("receipt_number", `%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (warehouseFilter && warehouseFilter !== "__all__") {
    query = query.eq("warehouse_id", warehouseFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load stock receipts:", error);
    return [];
  }

  return data || [];
}

/**
 * 창고 목록 조회
 */
export async function getActiveWarehouses(
  supabase: SupabaseClient
): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, warehouse_name, warehouse_code")
    .eq("is_active", true)
    .order("warehouse_name");

  if (error) {
    console.error("Failed to load warehouses:", error);
    return [];
  }

  return data || [];
}

/**
 * 입고 가능한 발주서 목록 조회
 */
export async function getReceivablePurchaseOrders(
  supabase: SupabaseClient
): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(`
      id, order_number, factory_id, status, order_date, total_quantity,
      factory:factories(factory_name),
      items:purchase_order_items(id, sku, product_name, quantity, received_quantity)
    `)
    .in("status", ["sent", "in_production", "shipping"])
    .order("order_date", { ascending: false });

  if (error) {
    console.error("Failed to load purchase orders:", error);
    return [];
  }

  return data || [];
}

/**
 * 제품 목록 조회
 */
export async function getActiveProducts(
  supabase: SupabaseClient
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, sku, product_name, color_kr, sku_6_size, parent_sku,
      parent_product:parent_products!fk_parent_product(id, product_name)
    `)
    .eq("is_active", true)
    .order("sku");

  if (error) {
    console.error("Failed to load products:", error);
    return [];
  }

  return data || [];
}

/**
 * 새 입고번호 생성
 */
export async function generateNewReceiptNumber(
  supabase: SupabaseClient
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("stock_receipts")
    .select("*", { count: "exact", head: true })
    .ilike("receipt_number", `SR-${today}%`);

  return `SR-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
}

// ========== Action 함수들 ==========

/**
 * 입고 생성
 */
export async function createStockReceipt(
  supabase: SupabaseClient,
  data: {
    receiptNumber: string;
    purchaseOrderId: string | null;
    warehouseId: string;
    receiptDate: string;
    notes: string | null;
    totalQuantity: number;
    items: StockReceiptItem[];
  }
): Promise<StockReceiptActionResult> {
  const receiptData = {
    receipt_number: data.receiptNumber,
    purchase_order_id: data.purchaseOrderId || null,
    warehouse_id: data.warehouseId,
    receipt_date: data.receiptDate,
    status: "completed",
    notes: data.notes || null,
    total_quantity: data.totalQuantity,
  };

  // 입고 헤더 생성
  const { data: newReceipt, error: receiptError } = await supabase
    .from("stock_receipts")
    .insert(receiptData)
    .select()
    .single();

  if (receiptError) {
    return { error: receiptError.message };
  }

  // 입고 품목 생성
  if (data.items.length > 0 && newReceipt) {
    const itemsToInsert = data.items.map((item) => ({
      stock_receipt_id: newReceipt.id,
      purchase_order_item_id: item.purchase_order_item_id || null,
      product_id: item.product_id || null,
      sku: item.sku,
      product_name: item.product_name,
      expected_quantity: item.expected_quantity || 0,
      received_quantity: item.received_quantity,
      damaged_quantity: item.damaged_quantity || 0,
    }));

    await supabase.from("stock_receipt_items").insert(itemsToInsert);

    // 창고 재고 업데이트
    for (const item of data.items) {
      const { data: existing } = await supabase
        .from("inventory_locations")
        .select("id, quantity")
        .eq("warehouse_id", data.warehouseId)
        .eq("sku", item.sku)
        .single();

      if (existing) {
        await supabase
          .from("inventory_locations")
          .update({
            quantity: existing.quantity + item.received_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("inventory_locations").insert({
          warehouse_id: data.warehouseId,
          product_id: item.product_id || null,
          sku: item.sku,
          quantity: item.received_quantity,
        });
      }
    }

    // 발주서 품목 입고수량 업데이트
    if (data.purchaseOrderId) {
      for (const item of data.items) {
        if (item.purchase_order_item_id) {
          const { data: poItem } = await supabase
            .from("purchase_order_items")
            .select("received_quantity")
            .eq("id", item.purchase_order_item_id)
            .single();

          if (poItem) {
            await supabase
              .from("purchase_order_items")
              .update({
                received_quantity: (poItem.received_quantity || 0) + item.received_quantity,
              })
              .eq("id", item.purchase_order_item_id);
          }
        }
      }
    }
  }

  return { success: true, message: "입고가 완료되었습니다." };
}

/**
 * 입고 삭제 (소프트 삭제)
 */
export async function deleteStockReceipt(
  supabase: SupabaseClient,
  id: string
): Promise<StockReceiptActionResult> {
  const { error } = await supabase
    .from("stock_receipts")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "입고가 삭제되었습니다." };
}
