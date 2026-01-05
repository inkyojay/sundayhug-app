/**
 * 재고 이동 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StockTransfer,
  StockTransferItem,
  Warehouse,
  StockTransferActionResult,
} from "./stock-transfers.shared";

// ========== 쿼리 파라미터 ==========

export interface StockTransferQueryParams {
  search: string;
  statusFilter: string;
}

export function parseStockTransferQueryParams(url: URL): StockTransferQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    statusFilter: url.searchParams.get("status") || "",
  };
}

// ========== Loader 함수들 ==========

/**
 * 재고 이동 목록 조회
 */
export async function getStockTransfers(
  supabase: SupabaseClient,
  params: StockTransferQueryParams
): Promise<StockTransfer[]> {
  const { search, statusFilter } = params;

  let query = supabase
    .from("stock_transfers")
    .select(`
      *,
      from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id, warehouse_name),
      to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id, warehouse_name),
      items:stock_transfer_items(id, sku, product_name, quantity)
    `)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("transfer_number", `%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load stock transfers:", error);
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
 * 새 이동번호 생성
 */
export async function generateNewTransferNumber(
  supabase: SupabaseClient
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("stock_transfers")
    .select("*", { count: "exact", head: true })
    .ilike("transfer_number", `ST-${today}%`);

  return `ST-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
}

// ========== Action 함수들 ==========

/**
 * 재고 이동 생성
 */
export async function createStockTransfer(
  supabase: SupabaseClient,
  data: {
    transferNumber: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    transferDate: string;
    notes: string | null;
    totalQuantity: number;
    items: StockTransferItem[];
  }
): Promise<StockTransferActionResult> {
  const transferData = {
    transfer_number: data.transferNumber,
    from_warehouse_id: data.fromWarehouseId,
    to_warehouse_id: data.toWarehouseId,
    transfer_date: data.transferDate,
    status: "completed",
    notes: data.notes || null,
    total_quantity: data.totalQuantity,
  };

  // 출발 창고 재고 확인 및 차감
  for (const item of data.items) {
    const { data: fromStock } = await supabase
      .from("inventory_locations")
      .select("id, quantity")
      .eq("warehouse_id", data.fromWarehouseId)
      .eq("sku", item.sku)
      .single();

    if (!fromStock || fromStock.quantity < item.quantity) {
      return {
        error: `${item.sku} 재고가 부족합니다. (보유: ${fromStock?.quantity || 0}, 요청: ${item.quantity})`,
      };
    }
  }

  // 이동 헤더 생성
  const { data: newTransfer, error: transferError } = await supabase
    .from("stock_transfers")
    .insert(transferData)
    .select()
    .single();

  if (transferError) {
    return { error: transferError.message };
  }

  // 이동 품목 생성
  if (data.items.length > 0 && newTransfer) {
    const itemsToInsert = data.items.map((item) => ({
      stock_transfer_id: newTransfer.id,
      product_id: item.product_id || null,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
    }));

    await supabase.from("stock_transfer_items").insert(itemsToInsert);

    // 출발 창고 재고 차감
    for (const item of data.items) {
      const { data: fromStock } = await supabase
        .from("inventory_locations")
        .select("id, quantity")
        .eq("warehouse_id", data.fromWarehouseId)
        .eq("sku", item.sku)
        .single();

      if (fromStock) {
        await supabase
          .from("inventory_locations")
          .update({
            quantity: fromStock.quantity - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fromStock.id);
      }
    }

    // 도착 창고 재고 증가
    for (const item of data.items) {
      const { data: toStock } = await supabase
        .from("inventory_locations")
        .select("id, quantity")
        .eq("warehouse_id", data.toWarehouseId)
        .eq("sku", item.sku)
        .single();

      if (toStock) {
        await supabase
          .from("inventory_locations")
          .update({
            quantity: toStock.quantity + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", toStock.id);
      } else {
        await supabase.from("inventory_locations").insert({
          warehouse_id: data.toWarehouseId,
          product_id: item.product_id || null,
          sku: item.sku,
          quantity: item.quantity,
        });
      }
    }
  }

  return { success: true, message: "재고 이동이 완료되었습니다." };
}

/**
 * 재고 이동 삭제 (소프트 삭제)
 */
export async function deleteStockTransfer(
  supabase: SupabaseClient,
  id: string
): Promise<StockTransferActionResult> {
  const { error } = await supabase
    .from("stock_transfers")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "재고 이동이 삭제되었습니다." };
}
