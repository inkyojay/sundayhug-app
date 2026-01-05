/**
 * 쿠팡 로켓그로스 재고 동기화 API
 *
 * POST: 재고 데이터 동기화
 */

import type { Route } from "./+types/coupang-sync-inventory";
import { createClient } from "@supabase/supabase-js";
import {
  getCoupangCredentials,
  getCoupangCredentialsByVendorId,
  getAllCoupangInventory,
} from "../lib/coupang.server";

export async function action({ request }: Route.ActionArgs) {
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await request.formData();
  const vendorIdParam = formData.get("vendor_id") as string;

  // 인증 정보 조회 ("auto"인 경우 활성화된 첫 번째 인증정보 사용)
  const credentials = vendorIdParam === "auto"
    ? await getCoupangCredentials()
    : await getCoupangCredentialsByVendorId(vendorIdParam);

  if (!credentials) {
    return { error: "쿠팡 연동 정보가 없습니다. 먼저 연동을 설정해주세요." };
  }

  if (!credentials.is_active) {
    return { error: "쿠팡 연동이 비활성화되어 있습니다." };
  }

  const vendorId = credentials.vendor_id;

  const startTime = Date.now();
  let syncedCount = 0;
  let failedCount = 0;

  try {
    console.log(`[Coupang] Syncing inventory for vendor: ${vendorId}`);

    // 전체 재고 조회 (페이징 자동 처리)
    const inventoryList = await getAllCoupangInventory(credentials);

    if (inventoryList.length === 0) {
      await adminClient.from("coupang_sync_logs").insert({
        sync_type: "inventory",
        status: "success",
        items_synced: 0,
        duration_ms: Date.now() - startTime,
      });

      return {
        success: true,
        synced: 0,
        message: "동기화할 재고 정보가 없습니다.",
      };
    }

    // 재고 데이터 변환
    const inventoryRows = inventoryList.map((inv) => ({
      vendor_id: inv.vendorId,
      vendor_item_id: inv.vendorItemId,
      external_sku_id: inv.externalSkuId || null,
      total_orderable_quantity:
        inv.inventoryDetails?.totalOrderableQuantity || 0,
      sales_count_last_30_days:
        inv.salesCountMap?.SALES_COUNT_LAST_THIRTY_DAYS || 0,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // 배치 upsert
    const batchSize = 500;
    for (let i = 0; i < inventoryRows.length; i += batchSize) {
      const batch = inventoryRows.slice(i, i + batchSize);

      const { error } = await adminClient
        .from("coupang_inventory")
        .upsert(batch, { onConflict: "vendor_item_id" });

      if (error) {
        console.error(`[Coupang] Inventory batch upsert error:`, error);
        failedCount += batch.length;
      } else {
        syncedCount += batch.length;
      }
    }

    // =====================================================
    // 로켓그로스 창고 재고 동기화 (inventory_locations)
    // =====================================================

    // 1. 로켓그로스 창고 조회
    const { data: warehouse } = await adminClient
      .from("warehouses")
      .select("id")
      .eq("warehouse_code", "WH-COUPANG-RG")
      .single();

    if (!warehouse) {
      console.warn("[Coupang] 로켓그로스 창고(WH-COUPANG-RG)가 없습니다. inventory_locations 동기화 건너뜀");
    }

    // 2. SKU 매핑된 옵션 조회 (로켓그로스 + 판매자배송 모두)
    const { data: optionsWithSku } = await adminClient
      .from("coupang_product_options")
      .select("vendor_item_id, external_vendor_sku, sku_id, fulfillment_type")
      .not("sku_id", "is", null);

    // vendor_item_id를 키로 하는 재고 맵 생성
    const inventoryMap: Record<number, typeof inventoryList[0]> = {};
    for (const inv of inventoryList) {
      inventoryMap[inv.vendorItemId] = inv;
    }

    // 3. inventory_locations에 재고 반영 + 이력 기록
    let locationSyncCount = 0;
    if (warehouse && optionsWithSku) {
      for (const opt of optionsWithSku) {
        const inv = inventoryMap[opt.vendor_item_id];
        if (!inv || !opt.external_vendor_sku) continue;

        const newQty = inv.inventoryDetails?.totalOrderableQuantity || 0;

        // 기존 재고 조회 (이력 기록용)
        const { data: existing } = await adminClient
          .from("inventory_locations")
          .select("quantity")
          .eq("warehouse_id", warehouse.id)
          .eq("sku", opt.external_vendor_sku)
          .single();

        const prevQty = existing?.quantity || 0;

        // inventory_locations upsert (product_id 컬럼 없음)
        const { error: locError } = await adminClient
          .from("inventory_locations")
          .upsert(
            {
              warehouse_id: warehouse.id,
              sku: opt.external_vendor_sku,
              quantity: newQty,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "warehouse_id,sku" }
          );

        if (locError) {
          console.error(`[Coupang] inventory_locations upsert error:`, locError);
        } else {
          locationSyncCount++;

          // 재고 변동이 있을 때만 이력 기록
          if (prevQty !== newQty) {
            await adminClient.from("inventory_history").insert({
              sku: opt.external_vendor_sku,
              warehouse_id: warehouse.id,
              change_type: "sync",
              stock_before: prevQty,
              stock_after: newQty,
              stock_change: newQty - prevQty,
              change_reason: "쿠팡 재고 동기화",
            });
          }
        }
      }
    }

    console.log(`[Coupang] inventory_locations 동기화: ${locationSyncCount}건`);

    // coupang_product_options 테이블에도 재고 연결 (vendor_item_id 기준) - SKU 매핑이 안된 것만
    for (const inv of inventoryList) {
      // 옵션에 external_vendor_sku가 있으면 내부 products 테이블과 매핑 시도
      if (inv.externalSkuId) {
        const { data: option } = await adminClient
          .from("coupang_product_options")
          .select("id, external_vendor_sku, sku_id")
          .eq("vendor_item_id", inv.vendorItemId)
          .single();

        // 이미 SKU 매핑이 되어 있으면 건너뜀
        if (option?.sku_id) continue;

        if (option?.external_vendor_sku) {
          // 내부 SKU와 매핑
          const { data: product } = await adminClient
            .from("products")
            .select("id")
            .eq("sku", option.external_vendor_sku)
            .single();

          if (product) {
            await adminClient
              .from("coupang_product_options")
              .update({ sku_id: product.id })
              .eq("vendor_item_id", inv.vendorItemId);
          }
        }
      }
    }

    // 동기화 로그 저장
    await adminClient.from("coupang_sync_logs").insert({
      sync_type: "inventory",
      status: failedCount > 0 ? "partial" : "success",
      items_synced: syncedCount,
      items_failed: failedCount,
      duration_ms: Date.now() - startTime,
    });

    // 마지막 동기화 시간 업데이트
    await adminClient
      .from("coupang_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("vendor_id", vendorId);

    console.log(
      `[Coupang] Inventory sync completed: ${syncedCount} items synced, ${locationSyncCount} locations updated`
    );

    return {
      success: true,
      synced: syncedCount,
      failed: failedCount,
      locationSynced: locationSyncCount,
      total: inventoryList.length,
      message: `${syncedCount}개 재고 정보가 동기화되었습니다. (창고 재고 ${locationSyncCount}건 반영)`,
    };
  } catch (error: any) {
    console.error("[Coupang] Inventory sync error:", error);

    await adminClient.from("coupang_sync_logs").insert({
      sync_type: "inventory",
      status: "error",
      items_synced: syncedCount,
      items_failed: failedCount,
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    });

    return { error: `동기화 실패: ${error.message}` };
  }
}
