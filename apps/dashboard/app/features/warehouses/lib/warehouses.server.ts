/**
 * 창고 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Warehouse,
  WarehouseFormData,
  WarehouseActionResult,
} from "./warehouses.shared";

// ========== 쿼리 파라미터 ==========

export interface WarehouseQueryParams {
  search: string;
  typeFilter: string;
}

export function parseWarehouseQueryParams(url: URL): WarehouseQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    typeFilter: url.searchParams.get("type") || "",
  };
}

// ========== Loader 함수들 ==========

/**
 * 창고 목록 조회
 */
export async function getWarehouses(
  supabase: SupabaseClient,
  params: WarehouseQueryParams
): Promise<Warehouse[]> {
  const { search, typeFilter } = params;

  let query = supabase
    .from("warehouses")
    .select("*")
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `warehouse_name.ilike.%${search}%,warehouse_code.ilike.%${search}%`
    );
  }

  if (typeFilter) {
    query = query.eq("warehouse_type", typeFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load warehouses:", error);
    return [];
  }

  return data || [];
}

/**
 * 창고별 재고 수량 조회
 */
export async function getWarehouseInventoryCounts(
  supabase: SupabaseClient,
  warehouses: Warehouse[]
): Promise<Record<string, number>> {
  const warehouseIds = warehouses.map((w) => w.id);
  let inventoryCounts: Record<string, number> = {};

  if (warehouseIds.length === 0) {
    return inventoryCounts;
  }

  // inventory_locations에서 재고 조회
  const { data: inventoryData } = await supabase
    .from("inventory_locations")
    .select("warehouse_id, quantity")
    .in("warehouse_id", warehouseIds);

  if (inventoryData) {
    inventoryCounts = inventoryData.reduce(
      (acc: Record<string, number>, item) => {
        acc[item.warehouse_id] = (acc[item.warehouse_id] || 0) + item.quantity;
        return acc;
      },
      {}
    );
  }

  // 쿠팡 창고는 coupang_inventory에서 직접 조회
  const coupangWarehouse = warehouses.find(
    (w) => w.warehouse_code === "WH-COUPANG-RG"
  );
  if (coupangWarehouse) {
    const { data: coupangInventory } = await supabase
      .from("coupang_inventory")
      .select("total_orderable_quantity");

    if (coupangInventory) {
      const totalQty = coupangInventory.reduce((sum, item) => {
        return sum + (item.total_orderable_quantity || 0);
      }, 0);
      inventoryCounts[coupangWarehouse.id] = totalQty;
    }
  }

  return inventoryCounts;
}

// ========== Action 함수들 ==========

/**
 * 창고 생성
 */
export async function createWarehouse(
  supabase: SupabaseClient,
  formData: WarehouseFormData
): Promise<WarehouseActionResult> {
  const warehouseData = {
    warehouse_code: formData.warehouse_code,
    warehouse_name: formData.warehouse_name,
    warehouse_type: formData.warehouse_type,
    location: formData.location || null,
    address: formData.address || null,
    contact_name: formData.contact_name || null,
    contact_phone: formData.contact_phone || null,
    notes: formData.notes || null,
    is_active: formData.is_active,
  };

  const { error } = await supabase.from("warehouses").insert(warehouseData);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "창고가 등록되었습니다." };
}

/**
 * 창고 수정
 */
export async function updateWarehouse(
  supabase: SupabaseClient,
  id: string,
  formData: WarehouseFormData
): Promise<WarehouseActionResult> {
  const warehouseData = {
    warehouse_code: formData.warehouse_code,
    warehouse_name: formData.warehouse_name,
    warehouse_type: formData.warehouse_type,
    location: formData.location || null,
    address: formData.address || null,
    contact_name: formData.contact_name || null,
    contact_phone: formData.contact_phone || null,
    notes: formData.notes || null,
    is_active: formData.is_active,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("warehouses")
    .update(warehouseData)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "창고 정보가 수정되었습니다." };
}

/**
 * 창고 삭제 (소프트 삭제)
 */
export async function deleteWarehouse(
  supabase: SupabaseClient,
  id: string
): Promise<WarehouseActionResult> {
  const { error } = await supabase
    .from("warehouses")
    .update({
      is_deleted: true,
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "창고가 삭제되었습니다." };
}

/**
 * FormData에서 WarehouseFormData 추출
 */
export function extractWarehouseFormData(formData: FormData): WarehouseFormData {
  return {
    warehouse_code: formData.get("warehouse_code") as string,
    warehouse_name: formData.get("warehouse_name") as string,
    warehouse_type: formData.get("warehouse_type") as string,
    location: (formData.get("location") as string) || "",
    address: (formData.get("address") as string) || "",
    contact_name: (formData.get("contact_name") as string) || "",
    contact_phone: (formData.get("contact_phone") as string) || "",
    notes: (formData.get("notes") as string) || "",
    is_active: formData.get("is_active") === "true",
  };
}
