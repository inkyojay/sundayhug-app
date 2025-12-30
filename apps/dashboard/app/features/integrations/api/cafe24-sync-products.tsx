/**
 * Cafe24 제품 동기화 API
 * 
 * Cafe24에서 제품 데이터(Variants 포함)를 가져와 DB에 저장합니다.
 */
import type { ActionFunctionArgs } from "react-router";

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    productsSynced: number;
    variantsSynced: number;
    durationMs: number;
  };
}

interface InventoryUpdateResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * POST /api/integrations/cafe24/sync-products
 * Cafe24 제품 동기화
 */
export async function action({ request }: ActionFunctionArgs): Promise<SyncResult | InventoryUpdateResult> {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  // 재고 업데이트 액션
  if (actionType === "update_inventory") {
    return handleInventoryUpdate(formData);
  }

  // 제품 동기화 액션 (기본)
  return handleProductSync();
}

/**
 * 제품 동기화 처리
 */
async function handleProductSync(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // 동적 import로 서버 전용 모듈 로드
    const { getProductsDetailed } = await import("../lib/cafe24.server");
    
    // Cafe24에서 전체 제품 조회 (페이지네이션)
    let allProducts: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await getProductsDetailed({ limit, offset });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || "Cafe24 제품 조회 실패",
        };
      }

      const products = result.products || [];
      allProducts = [...allProducts, ...products];
      
      // 다음 페이지 체크
      if (products.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }

      // 안전장치: 최대 1000개
      if (allProducts.length >= 1000) {
        hasMore = false;
      }
    }

    console.log(`📦 Cafe24에서 ${allProducts.length}개 제품 조회됨`);

    if (allProducts.length === 0) {
      return {
        success: true,
        message: "동기화할 제품이 없습니다",
        data: {
          productsSynced: 0,
          variantsSynced: 0,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // Supabase에 제품 저장
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    let productsSynced = 0;
    let variantsSynced = 0;

    for (const product of allProducts) {
      // 메인 제품 upsert
      const productData = {
        product_no: product.product_no,
        product_code: product.product_code,
        product_name: product.product_name,
        price: parseFloat(product.price) || 0,
        retail_price: parseFloat(product.retail_price) || 0,
        supply_price: parseFloat(product.supply_price) || 0,
        display: product.display || "T",
        selling: product.selling || "T",
        detail_image: product.detail_image || null,
        list_image: product.list_image || null,
        small_image: product.small_image || null,
        category: product.category?.length > 0 
          ? JSON.stringify(product.category) 
          : null,
        created_date: product.created_date || null,
        updated_date: product.updated_date || null,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { error: productError } = await adminClient
        .from("cafe24_products")
        .upsert(productData, { onConflict: "product_no" });

      if (productError) {
        console.error("❌ 제품 저장 실패:", productError, product.product_no);
        continue;
      }

      productsSynced++;

      // Variants upsert
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          const variantData = {
            product_no: product.product_no,
            variant_code: variant.variant_code,
            options: variant.options || [],
            sku: variant.custom_variant_code || null,
            additional_price: parseFloat(variant.additional_amount) || 0,
            stock_quantity: variant.quantity || 0,
            safety_stock: variant.safety_inventory || 0,
            display: variant.display || "T",
            selling: variant.selling || "T",
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const { error: variantError } = await adminClient
            .from("cafe24_product_variants")
            .upsert(variantData, { onConflict: "variant_code" });

          if (variantError) {
            console.error("❌ Variant 저장 실패:", variantError, variant.variant_code);
            continue;
          }

          variantsSynced++;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`✅ Cafe24 제품 동기화 완료: ${productsSynced}개 제품, ${variantsSynced}개 Variants (${durationMs}ms)`);

    return {
      success: true,
      message: `${productsSynced}개 제품, ${variantsSynced}개 옵션 동기화 완료`,
      data: {
        productsSynced,
        variantsSynced,
        durationMs,
      },
    };

  } catch (error) {
    console.error("❌ Cafe24 제품 동기화 중 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "동기화 중 오류 발생",
    };
  }
}

/**
 * 재고 업데이트 처리
 */
async function handleInventoryUpdate(formData: FormData): Promise<InventoryUpdateResult> {
  const productNo = Number(formData.get("productNo"));
  const variantCode = formData.get("variantCode") as string;
  const quantity = Number(formData.get("quantity"));

  if (!productNo || !variantCode || isNaN(quantity)) {
    return {
      success: false,
      error: "필수 파라미터가 누락되었습니다 (productNo, variantCode, quantity)",
    };
  }

  try {
    // 동적 import로 서버 전용 모듈 로드
    const { updateVariantInventory } = await import("../lib/cafe24.server");
    
    // Cafe24 API로 재고 업데이트
    const result = await updateVariantInventory(productNo, variantCode, quantity);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Cafe24 재고 업데이트 실패",
      };
    }

    // 로컬 DB도 업데이트
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    await adminClient
      .from("cafe24_product_variants")
      .update({ 
        stock_quantity: quantity,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("variant_code", variantCode);

    console.log(`✅ 재고 업데이트 완료: ${variantCode} → ${quantity}개`);

    return {
      success: true,
      message: `재고가 ${quantity}개로 업데이트되었습니다`,
    };

  } catch (error) {
    console.error("❌ 재고 업데이트 중 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "재고 업데이트 중 오류 발생",
    };
  }
}
