/**
 * 재고 차감 로직 - 주문 출고 시 재고 차감
 *
 * 기능:
 * - 주문 출고 시 재고 차감 (단건/일괄)
 * - 우선출고창고 조회 (products.priority_warehouse_id)
 * - 재고 부족 검사
 * - inventory_history에 기록
 * - orders.inventory_deducted 플래그 업데이트
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ===== 타입 정의 =====

export interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
  is_default: boolean;
}

export interface DeductionItem {
  sku: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string;
  stockBefore: number;
  stockAfter: number;
  success: boolean;
  error?: string;
}

export interface DeductionResult {
  success: boolean;
  orderUniq: string;
  items: DeductionItem[];
  totalDeducted: number;
  failedCount: number;
  error?: string;
}

export interface BulkDeductionResult {
  success: boolean;
  totalOrders: number;
  successCount: number;
  failedCount: number;
  results: DeductionResult[];
  errors: string[];
}

export interface AvailabilityItem {
  sku: string;
  quantity: number;
  available: number;
  warehouseId: string;
  warehouseName?: string;
  sufficient: boolean;
  shortage: number;
}

export interface AvailabilityResult {
  allAvailable: boolean;
  items: AvailabilityItem[];
  insufficientItems: AvailabilityItem[];
}

// ===== 우선출고창고 조회 =====

/**
 * SKU의 우선출고창고 조회
 * products.priority_warehouse_id가 없으면 기본 창고(is_default=true) 반환
 */
export async function getPriorityWarehouse(
  supabase: SupabaseClient,
  sku: string
): Promise<Warehouse | null> {
  // 1. 제품의 우선출고창고 조회
  const { data: product } = await supabase
    .from("products")
    .select("priority_warehouse_id")
    .eq("sku", sku)
    .single();

  if (product?.priority_warehouse_id) {
    const { data: warehouse } = await supabase
      .from("warehouses")
      .select("id, warehouse_code, warehouse_name, warehouse_type, is_default")
      .eq("id", product.priority_warehouse_id)
      .eq("is_active", true)
      .single();

    if (warehouse) return warehouse;
  }

  // 2. 기본 창고 반환
  const { data: defaultWarehouse } = await supabase
    .from("warehouses")
    .select("id, warehouse_code, warehouse_name, warehouse_type, is_default")
    .eq("is_default", true)
    .eq("is_active", true)
    .single();

  return defaultWarehouse || null;
}

/**
 * 기본 창고 조회 (is_default = true)
 */
export async function getDefaultWarehouse(
  supabase: SupabaseClient
): Promise<Warehouse | null> {
  const { data } = await supabase
    .from("warehouses")
    .select("id, warehouse_code, warehouse_name, warehouse_type, is_default")
    .eq("is_default", true)
    .eq("is_active", true)
    .single();

  return data || null;
}

/**
 * 창고 ID로 창고 정보 조회
 */
export async function getWarehouseById(
  supabase: SupabaseClient,
  warehouseId: string
): Promise<Warehouse | null> {
  const { data } = await supabase
    .from("warehouses")
    .select("id, warehouse_code, warehouse_name, warehouse_type, is_default")
    .eq("id", warehouseId)
    .eq("is_active", true)
    .single();

  return data || null;
}

// ===== 재고 부족 검사 =====

/**
 * 재고 부족 검사 (N+1 쿼리 최적화)
 * 지정된 창고(없으면 우선출고창고)에서 해당 SKU들의 재고가 충분한지 확인
 *
 * 최적화: SKU마다 개별 쿼리 대신 일괄 조회
 * - 100개 SKU = 기존 200회 쿼리 → 최적화 후 3~4회 쿼리
 */
export async function checkInventoryAvailability(
  supabase: SupabaseClient,
  items: { sku: string; quantity: number }[],
  warehouseId?: string
): Promise<AvailabilityResult> {
  if (items.length === 0) {
    return { allAvailable: true, items: [], insufficientItems: [] };
  }

  const skus = items.map((item) => item.sku);

  // 1. 지정 창고가 있는 경우 단일 조회
  let fixedWarehouse: Warehouse | null = null;
  if (warehouseId) {
    fixedWarehouse = await getWarehouseById(supabase, warehouseId);
  }

  // 2. SKU별 우선출고창고 일괄 조회 (지정 창고가 없는 경우)
  let productWarehouseMap: Map<string, string> = new Map();
  if (!warehouseId) {
    const { data: products } = await supabase
      .from("products")
      .select("sku, priority_warehouse_id")
      .in("sku", skus);

    if (products) {
      for (const product of products) {
        if (product.priority_warehouse_id) {
          productWarehouseMap.set(product.sku, product.priority_warehouse_id);
        }
      }
    }
  }

  // 3. 기본 창고 조회 (우선출고창고가 없는 SKU들을 위해)
  let defaultWarehouse: Warehouse | null = null;
  if (!warehouseId) {
    defaultWarehouse = await getDefaultWarehouse(supabase);
  }

  // 4. 필요한 창고 ID 목록 수집
  const warehouseIds = new Set<string>();
  if (warehouseId && fixedWarehouse) {
    warehouseIds.add(warehouseId);
  } else {
    productWarehouseMap.forEach((wid) => warehouseIds.add(wid));
    if (defaultWarehouse) {
      warehouseIds.add(defaultWarehouse.id);
    }
  }

  // 5. 창고 정보 일괄 조회
  const warehouseMap = new Map<string, Warehouse>();
  if (warehouseIds.size > 0) {
    const { data: warehouses } = await supabase
      .from("warehouses")
      .select("id, warehouse_code, warehouse_name, warehouse_type, is_default")
      .in("id", Array.from(warehouseIds))
      .eq("is_active", true);

    if (warehouses) {
      for (const wh of warehouses) {
        warehouseMap.set(wh.id, wh);
      }
    }
  }

  // 6. 재고 정보 일괄 조회
  const inventoryMap = new Map<string, { quantity: number; reserved_quantity: number }>();
  const { data: inventoryLocs } = await supabase
    .from("inventory_locations")
    .select("sku, warehouse_id, quantity, reserved_quantity")
    .in("sku", skus)
    .in("warehouse_id", Array.from(warehouseIds));

  if (inventoryLocs) {
    for (const loc of inventoryLocs) {
      // key: "warehouseId_sku"
      const key = `${loc.warehouse_id}_${loc.sku}`;
      inventoryMap.set(key, {
        quantity: loc.quantity || 0,
        reserved_quantity: loc.reserved_quantity || 0,
      });
    }
  }

  // 7. 결과 생성
  const availabilityItems: AvailabilityItem[] = [];

  for (const item of items) {
    // 창고 결정
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      targetWarehouseId = productWarehouseMap.get(item.sku) || defaultWarehouse?.id;
    }

    const warehouse = targetWarehouseId ? warehouseMap.get(targetWarehouseId) : null;

    if (!targetWarehouseId || !warehouse) {
      availabilityItems.push({
        sku: item.sku,
        quantity: item.quantity,
        available: 0,
        warehouseId: "",
        sufficient: false,
        shortage: item.quantity,
      });
      continue;
    }

    // 재고 확인
    const inventoryKey = `${targetWarehouseId}_${item.sku}`;
    const inventoryLoc = inventoryMap.get(inventoryKey);
    const currentQty = inventoryLoc?.quantity || 0;
    const reservedQty = inventoryLoc?.reserved_quantity || 0;
    const availableQty = currentQty - reservedQty;
    const sufficient = availableQty >= item.quantity;

    availabilityItems.push({
      sku: item.sku,
      quantity: item.quantity,
      available: availableQty,
      warehouseId: targetWarehouseId,
      warehouseName: warehouse.warehouse_name,
      sufficient,
      shortage: sufficient ? 0 : item.quantity - availableQty,
    });
  }

  const insufficientItems = availabilityItems.filter((i) => !i.sufficient);

  return {
    allAvailable: insufficientItems.length === 0,
    items: availabilityItems,
    insufficientItems,
  };
}

// ===== 재고 차감 실행 =====

/**
 * 재고 차감 실행 (단일 SKU)
 * inventory_locations에서 차감하고 inventory_history에 기록
 */
async function executeDeduction(
  supabase: SupabaseClient,
  sku: string,
  quantity: number,
  warehouseId: string,
  referenceType: string,
  referenceId: string
): Promise<{ success: boolean; stockBefore: number; stockAfter: number; error?: string }> {
  try {
    // 1. 현재 재고 조회
    const { data: inventoryLoc, error: fetchError } = await supabase
      .from("inventory_locations")
      .select("quantity, product_id")
      .eq("warehouse_id", warehouseId)
      .eq("sku", sku)
      .single();

    if (fetchError || !inventoryLoc) {
      return {
        success: false,
        stockBefore: 0,
        stockAfter: 0,
        error: `재고 정보를 찾을 수 없습니다: ${sku}`,
      };
    }

    const stockBefore = inventoryLoc.quantity;
    const stockAfter = stockBefore - quantity;

    // 2. 재고 부족 검사
    if (stockBefore < quantity) {
      return {
        success: false,
        stockBefore,
        stockAfter: stockBefore,
        error: `재고 부족: 현재 ${stockBefore}개, 요청 ${quantity}개`,
      };
    }

    // 3. 재고 차감 (inventory_locations)
    const { error: updateError } = await supabase
      .from("inventory_locations")
      .update({
        quantity: stockAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("warehouse_id", warehouseId)
      .eq("sku", sku);

    if (updateError) {
      return {
        success: false,
        stockBefore,
        stockAfter: stockBefore,
        error: `재고 차감 실패: ${updateError.message}`,
      };
    }

    // 4. product_id 조회 (inventory_locations에 없으면 products에서 조회)
    let productId = inventoryLoc.product_id;
    if (!productId) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("sku", sku)
        .single();
      productId = product?.id;
    }

    // 5. inventory_history에 기록
    await supabase.from("inventory_history").insert({
      product_id: productId,
      sku,
      warehouse_id: warehouseId,
      change_type: "shipment",
      stock_before: stockBefore,
      stock_after: stockAfter,
      stock_change: -quantity,
      change_reason: `B2C 주문 출고 (${referenceId})`,
      reference_type: referenceType,
      reference_id: referenceId,
    });

    return {
      success: true,
      stockBefore,
      stockAfter,
    };
  } catch (error: any) {
    return {
      success: false,
      stockBefore: 0,
      stockAfter: 0,
      error: error.message || "알 수 없는 오류",
    };
  }
}

// ===== 주문 출고 시 재고 차감 =====

/**
 * 주문 출고 시 재고 차감 (단건)
 *
 * 로직:
 * 1. 주문에서 SKU, 수량 조회 (shop_sku_cd 또는 연결된 products.sku)
 * 2. 우선출고창고 조회 (products.priority_warehouse_id) 또는 기본 창고
 * 3. inventory_locations에서 해당 창고-SKU 재고 차감
 * 4. inventory_history에 기록 (change_type: 'shipment', reference_type: 'b2c_order')
 * 5. orders.inventory_deducted = true 업데이트
 */
export async function deductInventoryForOrder(
  supabase: SupabaseClient,
  orderUniq: string,
  warehouseId?: string
): Promise<DeductionResult> {
  try {
    // 1. 주문 정보 조회
    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select("id, uniq, shop_sku_cd, sale_cnt, inventory_deducted")
      .eq("uniq", orderUniq);

    if (orderError || !orderRows || orderRows.length === 0) {
      return {
        success: false,
        orderUniq,
        items: [],
        totalDeducted: 0,
        failedCount: 0,
        error: `주문을 찾을 수 없습니다: ${orderUniq}`,
      };
    }

    // 이미 차감된 주문 확인
    const alreadyDeducted = orderRows.some((row: any) => row.inventory_deducted === true);
    if (alreadyDeducted) {
      return {
        success: false,
        orderUniq,
        items: [],
        totalDeducted: 0,
        failedCount: 0,
        error: "이미 재고가 차감된 주문입니다.",
      };
    }

    // 2. SKU별로 수량 합산 (같은 주문에 여러 행이 있을 수 있음)
    const skuQuantityMap = new Map<string, { quantity: number; orderIds: string[] }>();

    for (const row of orderRows as any[]) {
      const sku = row.shop_sku_cd;
      if (!sku) continue;

      const qty = row.sale_cnt || 1;
      if (skuQuantityMap.has(sku)) {
        const existing = skuQuantityMap.get(sku)!;
        existing.quantity += qty;
        existing.orderIds.push(row.id);
      } else {
        skuQuantityMap.set(sku, { quantity: qty, orderIds: [row.id] });
      }
    }

    if (skuQuantityMap.size === 0) {
      return {
        success: false,
        orderUniq,
        items: [],
        totalDeducted: 0,
        failedCount: 0,
        error: "차감할 SKU가 없습니다.",
      };
    }

    // 3. 재고 부족 사전 검사
    const itemsToCheck = Array.from(skuQuantityMap.entries()).map(([sku, { quantity }]) => ({
      sku,
      quantity,
    }));

    const availability = await checkInventoryAvailability(supabase, itemsToCheck, warehouseId);

    if (!availability.allAvailable) {
      const shortageDetails = availability.insufficientItems
        .map((i) => `${i.sku}: 필요 ${i.quantity}개, 가용 ${i.available}개`)
        .join(", ");

      return {
        success: false,
        orderUniq,
        items: [],
        totalDeducted: 0,
        failedCount: availability.insufficientItems.length,
        error: `재고 부족: ${shortageDetails}`,
      };
    }

    // 4. 재고 차감 실행 (availability 결과 재사용으로 N+1 최적화)
    const deductionItems: DeductionItem[] = [];
    let totalDeducted = 0;
    let failedCount = 0;

    // availability 결과를 Map으로 변환하여 빠른 조회
    const availabilityMap = new Map<string, AvailabilityItem>();
    for (const item of availability.items) {
      availabilityMap.set(item.sku, item);
    }

    // 주문의 첫 번째 행 ID를 reference로 사용
    const referenceId = (orderRows as any[])[0].id;

    for (const [sku, { quantity }] of skuQuantityMap.entries()) {
      // availability 결과에서 창고 정보 가져오기 (추가 쿼리 없음)
      const availItem = availabilityMap.get(sku);
      const targetWarehouseId = availItem?.warehouseId;
      const warehouseName = availItem?.warehouseName;

      if (!targetWarehouseId) {
        deductionItems.push({
          sku,
          quantity,
          warehouseId: "",
          stockBefore: 0,
          stockAfter: 0,
          success: false,
          error: "창고를 찾을 수 없습니다.",
        });
        failedCount++;
        continue;
      }

      const result = await executeDeduction(
        supabase,
        sku,
        quantity,
        targetWarehouseId,
        "b2c_order",
        referenceId
      );

      deductionItems.push({
        sku,
        quantity,
        warehouseId: targetWarehouseId,
        warehouseName,
        stockBefore: result.stockBefore,
        stockAfter: result.stockAfter,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        totalDeducted += quantity;
      } else {
        failedCount++;
      }
    }

    // 5. 하나라도 실패하면 전체 실패 처리 (롤백은 별도 구현 필요)
    if (failedCount > 0) {
      return {
        success: false,
        orderUniq,
        items: deductionItems,
        totalDeducted,
        failedCount,
        error: "일부 SKU의 재고 차감에 실패했습니다.",
      };
    }

    // 6. orders.inventory_deducted = true 업데이트
    const orderIds = (orderRows as any[]).map((row) => row.id);
    await supabase
      .from("orders")
      .update({ inventory_deducted: true })
      .in("id", orderIds);

    return {
      success: true,
      orderUniq,
      items: deductionItems,
      totalDeducted,
      failedCount: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      orderUniq,
      items: [],
      totalDeducted: 0,
      failedCount: 0,
      error: error.message || "알 수 없는 오류가 발생했습니다.",
    };
  }
}

/**
 * 일괄 재고 차감
 */
export async function deductInventoryForOrders(
  supabase: SupabaseClient,
  orderUniqs: string[],
  warehouseId?: string
): Promise<BulkDeductionResult> {
  const results: DeductionResult[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const orderUniq of orderUniqs) {
    const result = await deductInventoryForOrder(supabase, orderUniq, warehouseId);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
      if (result.error) {
        errors.push(`${orderUniq}: ${result.error}`);
      }
    }
  }

  return {
    success: failedCount === 0,
    totalOrders: orderUniqs.length,
    successCount,
    failedCount,
    results,
    errors,
  };
}

// ===== 재고 차감 취소 (롤백) =====

/**
 * 재고 차감 취소 (주문 취소 시)
 * inventory_locations에 재고 복원하고 inventory_history에 기록
 */
export async function rollbackInventoryDeduction(
  supabase: SupabaseClient,
  orderUniq: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 주문 정보 조회
    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select("id, uniq, shop_sku_cd, sale_cnt, inventory_deducted")
      .eq("uniq", orderUniq);

    if (orderError || !orderRows || orderRows.length === 0) {
      return { success: false, error: `주문을 찾을 수 없습니다: ${orderUniq}` };
    }

    // 차감되지 않은 주문 확인
    const wasDeducted = orderRows.some((row: any) => row.inventory_deducted === true);
    if (!wasDeducted) {
      return { success: false, error: "재고가 차감되지 않은 주문입니다." };
    }

    // 2. SKU별로 수량 합산
    const skuQuantityMap = new Map<string, number>();

    for (const row of orderRows as any[]) {
      const sku = row.shop_sku_cd;
      if (!sku) continue;

      const qty = row.sale_cnt || 1;
      skuQuantityMap.set(sku, (skuQuantityMap.get(sku) || 0) + qty);
    }

    // 3. 재고 복원 (우선출고창고에)
    for (const [sku, quantity] of skuQuantityMap.entries()) {
      const warehouse = await getPriorityWarehouse(supabase, sku);
      if (!warehouse) continue;

      // 현재 재고 조회
      const { data: inventoryLoc } = await supabase
        .from("inventory_locations")
        .select("quantity, product_id")
        .eq("warehouse_id", warehouse.id)
        .eq("sku", sku)
        .single();

      const stockBefore = inventoryLoc?.quantity || 0;
      const stockAfter = stockBefore + quantity;

      // 재고 복원
      if (inventoryLoc) {
        await supabase
          .from("inventory_locations")
          .update({
            quantity: stockAfter,
            updated_at: new Date().toISOString(),
          })
          .eq("warehouse_id", warehouse.id)
          .eq("sku", sku);
      } else {
        // product_id 조회
        const { data: product } = await supabase
          .from("products")
          .select("id")
          .eq("sku", sku)
          .single();

        await supabase.from("inventory_locations").insert({
          warehouse_id: warehouse.id,
          sku,
          product_id: product?.id,
          quantity,
        });
      }

      // inventory_history에 기록
      let productId = inventoryLoc?.product_id;
      if (!productId) {
        const { data: product } = await supabase
          .from("products")
          .select("id")
          .eq("sku", sku)
          .single();
        productId = product?.id;
      }

      const referenceId = (orderRows as any[])[0].id;

      await supabase.from("inventory_history").insert({
        product_id: productId,
        sku,
        warehouse_id: warehouse.id,
        change_type: "return",
        stock_before: stockBefore,
        stock_after: stockAfter,
        stock_change: quantity,
        change_reason: `B2C 주문 취소 복원 (${orderUniq})`,
        reference_type: "b2c_order",
        reference_id: referenceId,
      });
    }

    // 4. orders.inventory_deducted = false 업데이트
    const orderIds = (orderRows as any[]).map((row) => row.id);
    await supabase
      .from("orders")
      .update({ inventory_deducted: false })
      .in("id", orderIds);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "알 수 없는 오류" };
  }
}

// ===== 유틸리티 함수 =====

/**
 * 주문의 재고 차감 상태 조회
 */
export async function getOrderDeductionStatus(
  supabase: SupabaseClient,
  orderUniq: string
): Promise<{ deducted: boolean; error?: string }> {
  const { data, error } = await supabase
    .from("orders")
    .select("inventory_deducted")
    .eq("uniq", orderUniq)
    .single();

  if (error || !data) {
    return { deducted: false, error: "주문을 찾을 수 없습니다." };
  }

  return { deducted: data.inventory_deducted === true };
}

/**
 * SKU별 창고 재고 현황 조회
 */
export async function getSkuInventoryByWarehouse(
  supabase: SupabaseClient,
  sku: string
): Promise<{ warehouseId: string; warehouseName: string; quantity: number; reserved: number }[]> {
  const { data } = await supabase
    .from("inventory_locations")
    .select(`
      warehouse_id,
      quantity,
      reserved_quantity,
      warehouses!inner (
        warehouse_name
      )
    `)
    .eq("sku", sku);

  if (!data) return [];

  return data.map((row: any) => ({
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouses?.warehouse_name || "",
    quantity: row.quantity || 0,
    reserved: row.reserved_quantity || 0,
  }));
}
