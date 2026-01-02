/**
 * 쿠팡 로켓그로스 상품 동기화 API
 *
 * POST: 상품 데이터 동기화
 */

import type { Route } from "./+types/coupang-sync-products";
import { createClient } from "@supabase/supabase-js";
import {
  getCoupangCredentials,
  getCoupangCredentialsByVendorId,
  getAllCoupangProducts,
  getCoupangProductDetail,
  type CoupangProduct,
  type CoupangProductDetail,
} from "../lib/coupang.server";

export async function action({ request }: Route.ActionArgs) {
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await request.formData();
  const vendorIdParam = formData.get("vendor_id") as string;
  const status = formData.get("status") as string | null; // APPROVED, IN_REVIEW 등
  const fetchDetails = formData.get("fetch_details") === "true"; // 상세 정보 조회 여부

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
  let syncedProducts = 0;
  let syncedOptions = 0;
  let failedCount = 0;

  try {
    console.log(`[Coupang] Syncing products for vendor: ${vendorId}`);

    // 전체 상품 조회 (로켓그로스 + 마켓플레이스 모두)
    const products = await getAllCoupangProducts(credentials, {
      status: status || undefined,
      businessTypes: "all", // 둘 다 조회
    });

    if (products.length === 0) {
      await adminClient.from("coupang_sync_logs").insert({
        sync_type: "products",
        status: "success",
        items_synced: 0,
        duration_ms: Date.now() - startTime,
      });

      return {
        success: true,
        synced: 0,
        message: "동기화할 상품이 없습니다.",
      };
    }

    // 상품 기본 정보 저장
    for (const product of products) {
      try {
        // 상품 upsert
        const productData = {
          seller_product_id: product.sellerProductId,
          product_id: product.productId,
          vendor_id: product.vendorId,
          seller_product_name: product.sellerProductName,
          display_category_code: product.displayCategoryCode,
          category_id: product.categoryId,
          brand: product.brand || null,
          status_name: product.statusName,
          registration_type: product.registrationType,
          sale_started_at: product.saleStartedAt
            ? new Date(product.saleStartedAt).toISOString()
            : null,
          sale_ended_at: product.saleEndedAt
            ? new Date(product.saleEndedAt).toISOString()
            : null,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: upsertedProduct, error: productError } = await adminClient
          .from("coupang_products")
          .upsert(productData, { onConflict: "seller_product_id" })
          .select("id")
          .single();

        if (productError) {
          console.error(
            `[Coupang] Product upsert error for ${product.sellerProductId}:`,
            productError
          );
          failedCount++;
          continue;
        }

        syncedProducts++;

        // 상품 목록 API는 items 배열을 반환하지 않으므로 상세 API에서만 옵션 처리
        // 상세 정보 조회 (옵션)
        if (fetchDetails) {
          try {
            const detailResult = await getCoupangProductDetail(
              credentials,
              product.sellerProductId
            );
            const detail = detailResult.data;

            if (detail) {
              // 상품 추가 정보 업데이트
              await adminClient
                .from("coupang_products")
                .update({
                  display_product_name: detail.displayProductName,
                  manufacture: detail.manufacture || null,
                })
                .eq("id", upsertedProduct.id);

              // 옵션 상세 정보 upsert (로켓그로스 + 마켓플레이스)
              // 주의: 상품 목록 API는 items 배열이 비어있을 수 있으므로 상세 API에서 upsert 필요
              const detailItems = detail.items || [];
              for (const detailItem of detailItems) {
                // 로켓그로스 옵션 상세
                if (detailItem.rocketGrowthItemData) {
                  const rgData = detailItem.rocketGrowthItemData;

                  // 자동 SKU 매핑 시도
                  let skuId: string | null = null;
                  if (rgData.externalVendorSku) {
                    const { data: matchedProduct } = await adminClient
                      .from("products")
                      .select("id")
                      .eq("sku", rgData.externalVendorSku)
                      .single();
                    if (matchedProduct) {
                      skuId = matchedProduct.id;
                    }
                  }

                  const { error: rgError } = await adminClient
                    .from("coupang_product_options")
                    .upsert({
                      coupang_product_id: upsertedProduct.id,
                      vendor_item_id: rgData.vendorItemId,
                      item_id: rgData.itemId,
                      item_name: detailItem.itemName,
                      fulfillment_type: "ROCKET_GROWTH",
                      external_vendor_sku: rgData.externalVendorSku || null,
                      model_no: rgData.modelNo || null,
                      barcode: rgData.barcode || null,
                      original_price: rgData.priceData?.originalPrice || null,
                      sale_price: rgData.priceData?.salePrice || null,
                      sku_fragile: rgData.skuInfo?.fragile || false,
                      sku_height: rgData.skuInfo?.height || null,
                      sku_length: rgData.skuInfo?.length || null,
                      sku_width: rgData.skuInfo?.width || null,
                      sku_weight: rgData.skuInfo?.weight || null,
                      quantity_per_box: rgData.skuInfo?.quantityPerBox || null,
                      distribution_period:
                        rgData.skuInfo?.distributionPeriod || null,
                      sku_id: skuId, // 자동 매핑된 SKU
                      updated_at: new Date().toISOString(),
                    }, { onConflict: "vendor_item_id" });

                  if (!rgError) {
                    syncedOptions++;
                  }
                }

                // 마켓플레이스 옵션 상세
                if (detailItem.marketplaceItemData) {
                  const mpData = detailItem.marketplaceItemData;

                  // 자동 SKU 매핑 시도
                  let skuId: string | null = null;
                  if (mpData.externalVendorSku) {
                    const { data: matchedProduct } = await adminClient
                      .from("products")
                      .select("id")
                      .eq("sku", mpData.externalVendorSku)
                      .single();
                    if (matchedProduct) {
                      skuId = matchedProduct.id;
                    }
                  }

                  const { error: mpError } = await adminClient
                    .from("coupang_product_options")
                    .upsert({
                      coupang_product_id: upsertedProduct.id,
                      vendor_item_id: mpData.vendorItemId,
                      item_id: mpData.itemId,
                      item_name: detailItem.itemName,
                      fulfillment_type: "MARKETPLACE",
                      external_vendor_sku: mpData.externalVendorSku || null,
                      model_no: mpData.modelNo || null,
                      barcode: mpData.barcode || null,
                      original_price: mpData.priceData?.originalPrice || null,
                      sale_price: mpData.priceData?.salePrice || null,
                      sku_id: skuId, // 자동 매핑된 SKU
                      updated_at: new Date().toISOString(),
                    }, { onConflict: "vendor_item_id" });

                  if (!mpError) {
                    syncedOptions++;
                  }
                }
              }
            }
          } catch (detailError: any) {
            console.error(
              `[Coupang] Detail fetch error for ${product.sellerProductId}:`,
              detailError.message
            );
            // 상세 조회 실패는 무시하고 계속 진행
          }
        }
      } catch (error: any) {
        console.error(
          `[Coupang] Product sync error for ${product.sellerProductId}:`,
          error
        );
        failedCount++;
      }
    }

    // 동기화 로그 저장
    await adminClient.from("coupang_sync_logs").insert({
      sync_type: "products",
      status: failedCount > 0 ? "partial" : "success",
      items_synced: syncedProducts,
      items_failed: failedCount,
      duration_ms: Date.now() - startTime,
    });

    // 마지막 동기화 시간 업데이트
    await adminClient
      .from("coupang_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("vendor_id", vendorId);

    console.log(
      `[Coupang] Product sync completed: ${syncedProducts} products, ${syncedOptions} options`
    );

    return {
      success: true,
      syncedProducts,
      syncedOptions,
      failed: failedCount,
      total: products.length,
      message: `${syncedProducts}개 상품, ${syncedOptions}개 옵션이 동기화되었습니다.`,
    };
  } catch (error: any) {
    console.error("[Coupang] Product sync error:", error);

    await adminClient.from("coupang_sync_logs").insert({
      sync_type: "products",
      status: "error",
      items_synced: syncedProducts,
      items_failed: failedCount,
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    });

    return { error: `동기화 실패: ${error.message}` };
  }
}
