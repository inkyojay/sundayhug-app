/**
 * 재고 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryItem,
  InventoryStats,
  InventoryFilters,
  InventoryFilterOptions,
  WarehouseStock,
  Warehouse,
} from "./inventory.shared";

// 쿼리 파라미터 파싱
export interface InventoryQueryParams {
  search: string;
  stockFilter: string;
  parentSku: string;
  color: string;
  size: string;
  warehouseFilter: string;
  groupBy: string;
  page: number;
  limit: number;
}

export function parseInventoryQueryParams(url: URL): InventoryQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    stockFilter: url.searchParams.get("stockFilter") || "all",
    parentSku: url.searchParams.get("parentSku") || "",
    color: url.searchParams.get("color") || "",
    size: url.searchParams.get("size") || "",
    warehouseFilter: url.searchParams.get("warehouse") || "all",
    groupBy: url.searchParams.get("groupBy") || "none",
    page: parseInt(url.searchParams.get("page") || "1"),
    limit: parseInt(url.searchParams.get("limit") || "100"),
  };
}

// 필터 옵션 조회
export async function getFilterOptions(
  supabase: SupabaseClient
): Promise<InventoryFilterOptions> {
  const [parentSkusResult, colorsResult, sizesResult, warehousesResult] =
    await Promise.all([
      supabase
        .from("parent_products")
        .select("parent_sku, product_name")
        .order("product_name", { ascending: true }),
      supabase
        .from("products")
        .select("color_kr")
        .not("color_kr", "is", null)
        .not("color_kr", "eq", ""),
      supabase
        .from("products")
        .select("sku_6_size")
        .not("sku_6_size", "is", null)
        .not("sku_6_size", "eq", ""),
      supabase
        .from("warehouses")
        .select("id, warehouse_code, warehouse_name, warehouse_type, is_default")
        .eq("is_active", true)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("is_default", { ascending: false }),
    ]);

  const parentSkus = parentSkusResult.data || [];
  const colors = [
    ...new Set(colorsResult.data?.map((c: any) => c.color_kr)),
  ].sort() as string[];
  const sizes = [
    ...new Set(sizesResult.data?.map((s: any) => s.sku_6_size)),
  ].sort() as string[];
  const warehouses = warehousesResult.data || [];

  return { parentSkus, colors, sizes, warehouses };
}

// 통계 조회
export async function getInventoryStats(
  supabase: SupabaseClient
): Promise<InventoryStats> {
  const { data: latestInventory } = await supabase
    .from("inventory")
    .select("sku, current_stock, alert_threshold")
    .order("synced_at", { ascending: false });

  const uniqueInventory = new Map();
  latestInventory?.forEach((item: any) => {
    if (!uniqueInventory.has(item.sku)) uniqueInventory.set(item.sku, item);
  });
  const uniqueItems = Array.from(uniqueInventory.values());

  return {
    total: uniqueItems.length,
    totalStock: uniqueItems.reduce(
      (sum, item) => sum + (item.current_stock || 0),
      0
    ),
    lowStock: uniqueItems.filter(
      (item) =>
        item.current_stock <= item.alert_threshold && item.current_stock > 0
    ).length,
    zeroStock: uniqueItems.filter((item) => item.current_stock === 0).length,
    normalStock: uniqueItems.filter(
      (item) => item.current_stock > item.alert_threshold
    ).length,
  };
}

// 재고 목록 조회 (enrichment 전 원시 데이터)
export interface InventoryResult {
  inventory: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export async function getInventory(
  supabase: SupabaseClient,
  params: InventoryQueryParams
): Promise<InventoryResult> {
  const { search, stockFilter, parentSku, color, size, groupBy, page, limit } =
    params;
  const offset = (page - 1) * limit;

  // 재고 목록 조회
  let query = supabase
    .from("inventory")
    .select(
      `
      id, sku, current_stock, previous_stock, stock_change, alert_threshold, synced_at,
      products!inner (id, product_name, parent_sku, color_kr, sku_6_size, priority_warehouse_id)
    `
    )
    .order("synced_at", { ascending: false });

  if (stockFilter === "low")
    query = query.gt("current_stock", 0).lte("current_stock", 10);
  else if (stockFilter === "zero") query = query.eq("current_stock", 0);
  else if (stockFilter === "normal") query = query.gt("current_stock", 10);

  if (search) query = query.ilike("sku", `%${search}%`);
  if (parentSku) query = query.eq("products.parent_sku", parentSku);
  if (color) query = query.eq("products.color_kr", color);
  if (size) query = query.eq("products.sku_6_size", size);

  // 전체 개수
  let countQuery = supabase
    .from("inventory")
    .select("*, products!inner(*)", { count: "exact", head: true });
  if (stockFilter === "low")
    countQuery = countQuery.gt("current_stock", 0).lte("current_stock", 10);
  else if (stockFilter === "zero") countQuery = countQuery.eq("current_stock", 0);
  else if (stockFilter === "normal") countQuery = countQuery.gt("current_stock", 10);
  if (search) countQuery = countQuery.ilike("sku", `%${search}%`);
  if (parentSku) countQuery = countQuery.eq("products.parent_sku", parentSku);
  if (color) countQuery = countQuery.eq("products.color_kr", color);
  if (size) countQuery = countQuery.eq("products.sku_6_size", size);

  const { count: totalCount } = await countQuery;

  // 그룹별 보기일 경우 전체 조회
  const finalQuery =
    groupBy !== "none" ? query : query.range(offset, offset + limit - 1);
  const { data: inventory } = await finalQuery;

  return {
    inventory: inventory || [],
    totalCount: totalCount || 0,
    currentPage: groupBy !== "none" ? 1 : page,
    totalPages: groupBy !== "none" ? 1 : Math.ceil((totalCount || 0) / limit),
  };
}

// 채널 데이터 조회 및 재고 아이템 enrichment
export async function enrichInventoryWithChannelData(
  supabase: SupabaseClient,
  inventory: any[]
): Promise<InventoryItem[]> {
  const skus = inventory.map((i: any) => i.sku);

  const [
    cafe24Result,
    naverResult,
    cafe24ProductsResult,
    naverProductsResult,
    inventoryLocationsResult,
  ] = await Promise.all([
    supabase
      .from("cafe24_product_variants")
      .select(
        "sku, product_no, variant_code, options, stock_quantity, display, selling, synced_at"
      )
      .in("sku", skus),
    supabase
      .from("naver_product_options")
      .select(
        "seller_management_code, origin_product_no, option_combination_id, option_name1, option_value1, option_name2, option_value2, stock_quantity, use_yn, synced_at"
      )
      .in("seller_management_code", skus),
    supabase.from("cafe24_products").select("product_no, product_name"),
    supabase
      .from("naver_products")
      .select("origin_product_no, channel_product_no, product_name"),
    supabase
      .from("inventory_locations")
      .select("warehouse_id, sku, quantity")
      .in("sku", skus),
  ]);

  // SKU별 창고별 재고 맵 생성
  const warehouseStocksBySku = new Map<string, Record<string, number>>();
  (inventoryLocationsResult.data || []).forEach((loc: WarehouseStock) => {
    if (!warehouseStocksBySku.has(loc.sku)) {
      warehouseStocksBySku.set(loc.sku, {});
    }
    warehouseStocksBySku.get(loc.sku)![loc.warehouse_id] = loc.quantity;
  });

  const cafe24ProductMap = new Map(
    (cafe24ProductsResult.data || []).map((p: any) => [
      p.product_no,
      p.product_name,
    ])
  );
  const naverProductMap = new Map(
    (naverProductsResult.data || []).map((p: any) => [
      p.origin_product_no,
      { product_name: p.product_name, channel_product_no: p.channel_product_no },
    ])
  );

  // Cafe24 중복 제거
  const cafe24Unique = new Map<string, any>();
  (cafe24Result.data || []).forEach((v: any) => {
    const optionsKey = JSON.stringify(v.options || []);
    const uniqueKey = `${v.sku}_${v.product_no}_${optionsKey}`;
    const existing = cafe24Unique.get(uniqueKey);
    if (
      !existing ||
      new Date(v.synced_at || 0) > new Date(existing.synced_at || 0)
    ) {
      cafe24Unique.set(uniqueKey, {
        ...v,
        product_name: cafe24ProductMap.get(v.product_no) || "",
      });
    }
  });

  // 네이버 중복 제거
  const naverUnique = new Map<string, any>();
  (naverResult.data || []).forEach((o: any) => {
    const optionsKey = `${o.option_name1}_${o.option_value1}_${o.option_name2}_${o.option_value2}`;
    const uniqueKey = `${o.seller_management_code}_${o.origin_product_no}_${optionsKey}`;
    const existing = naverUnique.get(uniqueKey);
    const naverProduct = naverProductMap.get(o.origin_product_no);
    if (
      !existing ||
      new Date(o.synced_at || 0) > new Date(existing.synced_at || 0)
    ) {
      naverUnique.set(uniqueKey, {
        ...o,
        product_name: naverProduct?.product_name || "",
        channel_product_no: naverProduct?.channel_product_no || null,
      });
    }
  });

  // SKU별로 그룹핑
  const cafe24BySku = new Map<string, any[]>();
  const naverBySku = new Map<string, any[]>();

  cafe24Unique.forEach((v) => {
    const list = cafe24BySku.get(v.sku) || [];
    list.push(v);
    cafe24BySku.set(v.sku, list);
  });

  naverUnique.forEach((o) => {
    const list = naverBySku.get(o.seller_management_code) || [];
    list.push(o);
    naverBySku.set(o.seller_management_code, list);
  });

  return inventory.map((item: any) => {
    const cafe24List = cafe24BySku.get(item.sku) || [];
    const naverList = naverBySku.get(item.sku) || [];
    const latestCafe24 = cafe24List.sort(
      (a, b) =>
        new Date(b.synced_at || 0).getTime() -
        new Date(a.synced_at || 0).getTime()
    )[0];
    const latestNaver = naverList.sort(
      (a, b) =>
        new Date(b.synced_at || 0).getTime() -
        new Date(a.synced_at || 0).getTime()
    )[0];

    return {
      ...item,
      cafe24_stock:
        cafe24List.length > 0
          ? cafe24List.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
          : null,
      cafe24_synced: latestCafe24?.synced_at || null,
      naver_stock:
        naverList.length > 0
          ? naverList.reduce((sum, o) => sum + (o.stock_quantity || 0), 0)
          : null,
      naver_synced: latestNaver?.synced_at || null,
      channel_mapping: { cafe24: cafe24List, naver: naverList },
      warehouse_stocks: warehouseStocksBySku.get(item.sku) || {},
    };
  });
}

// === Action 핸들러들 ===

// 안전재고 업데이트
export async function updateThreshold(
  adminClient: SupabaseClient,
  inventoryId: string,
  alertThreshold: number
) {
  const { error } = await adminClient
    .from("inventory")
    .update({ alert_threshold: alertThreshold })
    .eq("id", inventoryId);

  if (error) return { success: false, error: error.message };
  return { success: true, message: "안전재고가 업데이트되었습니다." };
}

// 일괄 안전재고 업데이트
export async function bulkUpdateThreshold(
  adminClient: SupabaseClient,
  inventoryIds: string[],
  alertThreshold: number
) {
  let successCount = 0;
  for (const id of inventoryIds) {
    const { error } = await adminClient
      .from("inventory")
      .update({ alert_threshold: alertThreshold })
      .eq("id", id);
    if (!error) successCount++;
  }
  return {
    success: true,
    message: `${successCount}개 항목의 안전재고가 ${alertThreshold}로 설정되었습니다.`,
  };
}

// 창고별 재고 수정
export async function updateWarehouseStock(
  adminClient: SupabaseClient,
  sku: string,
  warehouseId: string,
  quantity: number,
  warehouseName: string
) {
  // 기존 재고 조회
  const { data: existing } = await adminClient
    .from("inventory_locations")
    .select("quantity, product_id")
    .eq("sku", sku)
    .eq("warehouse_id", warehouseId)
    .single();

  const previousQty = existing?.quantity || 0;

  // product_id 조회 (없으면)
  let productId = existing?.product_id;
  if (!productId) {
    const { data: product } = await adminClient
      .from("products")
      .select("id")
      .eq("sku", sku)
      .single();
    productId = product?.id;
  }

  // upsert
  const { error } = await adminClient.from("inventory_locations").upsert(
    {
      warehouse_id: warehouseId,
      sku,
      product_id: productId,
      quantity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "warehouse_id,sku" }
  );

  if (error) return { success: false, error: error.message };

  // 재고 이력 기록
  if (productId) {
    await adminClient.from("inventory_history").insert({
      product_id: productId,
      sku,
      stock_before: previousQty,
      stock_after: quantity,
      stock_change: quantity - previousQty,
      change_reason: `창고 재고 수동 조정 (${warehouseName}): ${previousQty} → ${quantity}`,
    });
  }

  return {
    success: true,
    message: `${warehouseName} 재고가 ${quantity}개로 변경되었습니다.`,
  };
}

// 우선 출고 창고 변경
export async function updatePriorityWarehouse(
  adminClient: SupabaseClient,
  sku: string,
  warehouseId: string,
  warehouseName: string
) {
  const { error } = await adminClient
    .from("products")
    .update({ priority_warehouse_id: warehouseId })
    .eq("sku", sku);

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    message: `우선 출고 창고가 ${warehouseName}(으)로 변경되었습니다.`,
  };
}

// 창고 간 재고 이동
export async function transferStock(
  adminClient: SupabaseClient,
  sku: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
  fromWarehouseName: string,
  toWarehouseName: string
) {
  if (fromWarehouseId === toWarehouseId) {
    return { success: false, error: "출발 창고와 도착 창고가 같을 수 없습니다." };
  }

  if (quantity <= 0) {
    return { success: false, error: "이동 수량은 1개 이상이어야 합니다." };
  }

  // 출발 창고 재고 확인
  const { data: fromStock } = await adminClient
    .from("inventory_locations")
    .select("quantity, product_id")
    .eq("warehouse_id", fromWarehouseId)
    .eq("sku", sku)
    .single();

  if (!fromStock || fromStock.quantity < quantity) {
    return {
      success: false,
      error: `출발 창고 재고 부족: 현재 ${fromStock?.quantity || 0}개, 요청 ${quantity}개`,
    };
  }

  const productId = fromStock.product_id;

  // 출발 창고 재고 차감
  await adminClient
    .from("inventory_locations")
    .update({
      quantity: fromStock.quantity - quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("warehouse_id", fromWarehouseId)
    .eq("sku", sku);

  // 도착 창고 재고 증가
  const { data: toStock } = await adminClient
    .from("inventory_locations")
    .select("quantity")
    .eq("warehouse_id", toWarehouseId)
    .eq("sku", sku)
    .single();

  if (toStock) {
    await adminClient
      .from("inventory_locations")
      .update({
        quantity: toStock.quantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("warehouse_id", toWarehouseId)
      .eq("sku", sku);
  } else {
    await adminClient.from("inventory_locations").insert({
      warehouse_id: toWarehouseId,
      sku,
      product_id: productId,
      quantity,
    });
  }

  // 이동 이력 기록
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await adminClient
    .from("stock_transfers")
    .select("*", { count: "exact", head: true })
    .ilike("transfer_number", `TRF-${today}%`);

  const transferNumber = `TRF-${today}-${String((count || 0) + 1).padStart(4, "0")}`;

  await adminClient.from("stock_transfers").insert({
    transfer_number: transferNumber,
    sku,
    product_id: productId,
    from_warehouse_id: fromWarehouseId,
    to_warehouse_id: toWarehouseId,
    quantity,
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  // 재고 이력 기록
  if (productId) {
    await adminClient.from("inventory_history").insert({
      product_id: productId,
      sku,
      stock_before: fromStock.quantity,
      stock_after: fromStock.quantity - quantity,
      stock_change: -quantity,
      change_reason: `창고 이동 출고: ${fromWarehouseName} → ${toWarehouseName} (${transferNumber})`,
    });
  }

  return {
    success: true,
    message: `${quantity}개가 ${fromWarehouseName}에서 ${toWarehouseName}(으)로 이동되었습니다.`,
  };
}

// CSV 일괄 재고 수정
export interface CsvImportItem {
  sku: string;
  warehouseId: string;
  warehouseName: string;
  oldQuantity: number;
  newQuantity: number;
}

export async function csvImport(
  adminClient: SupabaseClient,
  items: CsvImportItem[]
) {
  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    // product_id 조회
    const { data: product } = await adminClient
      .from("products")
      .select("id")
      .eq("sku", item.sku)
      .single();

    // 기존 재고 조회
    const { data: existing } = await adminClient
      .from("inventory_locations")
      .select("quantity")
      .eq("sku", item.sku)
      .eq("warehouse_id", item.warehouseId)
      .single();

    const previousQty = existing?.quantity || 0;

    // upsert
    const { error } = await adminClient.from("inventory_locations").upsert(
      {
        warehouse_id: item.warehouseId,
        sku: item.sku,
        product_id: product?.id || null,
        quantity: item.newQuantity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "warehouse_id,sku" }
    );

    if (error) {
      failCount++;
      continue;
    }

    successCount++;

    // 재고 이력 기록
    if (product?.id && previousQty !== item.newQuantity) {
      await adminClient.from("inventory_history").insert({
        product_id: product.id,
        sku: item.sku,
        warehouse_id: item.warehouseId,
        change_type: "csv_import",
        stock_before: previousQty,
        stock_after: item.newQuantity,
        stock_change: item.newQuantity - previousQty,
        change_reason: `CSV 일괄 수정 (${item.warehouseName}): ${previousQty} → ${item.newQuantity}`,
      });
    }
  }

  return {
    success: failCount === 0,
    message: `${successCount}개 항목 수정 완료${failCount > 0 ? `, ${failCount}개 실패` : ""}`,
  };
}
