/**
 * 네이버 스마트스토어 제품 동기화 API
 * 
 * 네이버에서 제품 데이터(옵션 포함)를 가져와 DB에 저장합니다.
 * 
 * 최적화:
 * - 병렬 처리: 원상품 상세 조회를 5개씩 동시 호출
 * - 배치 저장: 옵션을 일괄 upsert
 */
import type { ActionFunctionArgs } from "react-router";

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    productsSynced: number;
    optionsSynced: number;
    durationMs: number;
  };
}

interface InventoryUpdateResult {
  success: boolean;
  message?: string;
  error?: string;
}

// 병렬 처리 설정
const PARALLEL_BATCH_SIZE = 5;  // 동시에 처리할 원상품 수

/**
 * POST /api/integrations/naver/sync-products
 * 네이버 제품 동기화
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
 * 배열을 청크로 분할
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 제품 동기화 처리
 * 1단계: 상품 목록 조회 (POST /v1/products/search) - 기본 정보만
 * 2단계: 각 상품별 원상품 상세 조회 (GET /v2/products/origin-products/{originProductNo}) - 옵션 정보 포함 (병렬)
 */
async function handleProductSync(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // 동적 import로 서버 전용 모듈 로드
    const { getProductListDetailed, getOriginProduct } = await import("../lib/naver.server");
    
    // 1단계: 네이버에서 전체 제품 목록 조회 (페이지네이션)
    let allProducts: any[] = [];
    let page = 1;
    const size = 100;
    let hasMore = true;

    console.log(`📦 [1단계] 상품 목록 조회 시작...`);

    while (hasMore) {
      const result = await getProductListDetailed({ page, size });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || "네이버 제품 조회 실패",
        };
      }

      const products = result.products || [];
      allProducts = [...allProducts, ...products];
      
      // 다음 페이지 체크
      if (products.length < size) {
        hasMore = false;
      } else {
        page++;
      }

      // 안전장치: 최대 1000개
      if (allProducts.length >= 1000) {
        hasMore = false;
      }
    }

    console.log(`📦 네이버에서 ${allProducts.length}개 제품 조회됨`);

    if (allProducts.length === 0) {
      return {
        success: true,
        message: "동기화할 제품이 없습니다",
        data: {
          productsSynced: 0,
          optionsSynced: 0,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // Supabase에 제품 저장
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    let productsSynced = 0;
    let optionsSynced = 0;

    // 중복 제거: originProductNo 기준으로 유니크하게
    const uniqueOriginProductNos = [...new Set(allProducts.map(p => p.originProductNo))];
    console.log(`📦 유니크 원상품 수: ${uniqueOriginProductNos.length}개`);

    // 1단계: 제품 배치 저장
    const productDataList = allProducts.map(product => ({
      origin_product_no: product.originProductNo,
      channel_product_no: product.channelProductNo || null,
      product_name: product.name,
      seller_management_code: product.sellerManagementCode || null,
      sale_price: product.salePrice || 0,
      stock_quantity: product.stockQuantity || 0,
      product_status: product.productStatusType || null,
      channel_product_display_status: product.channelProductDisplayStatusType || null,
      status_type: product.productStatusType || null,
      sale_start_date: product.saleStartDate || null,
      sale_end_date: product.saleEndDate || null,
      represent_image: product.representativeImage?.url || null,
      category_id: product.detailAttribute?.naverShoppingSearchInfo?.categoryId || null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // 배치 upsert (100개씩)
    const productChunks = chunkArray(productDataList, 100);
    for (const chunk of productChunks) {
      const { error } = await adminClient
        .from("naver_products")
        .upsert(chunk, { onConflict: "origin_product_no" });
      
      if (!error) {
        productsSynced += chunk.length;
      } else {
        console.error("❌ 제품 배치 저장 실패:", error);
      }
    }

    console.log(`✅ [1단계 완료] ${productsSynced}개 제품 저장됨 (${Date.now() - startTime}ms)`);

    // 2단계: 원상품 상세 조회 (병렬 처리)
    console.log(`📦 [2단계] 원상품 상세 조회 시작 (${uniqueOriginProductNos.length}개, ${PARALLEL_BATCH_SIZE}개씩 병렬)...`);

    const originChunks = chunkArray(uniqueOriginProductNos, PARALLEL_BATCH_SIZE);
    let processedOrigins = 0;
    const allOptionData: any[] = [];

    for (const chunk of originChunks) {
      // 병렬로 원상품 상세 조회
      const detailPromises = chunk.map(originProductNo => 
        getOriginProduct(originProductNo)
          .then(result => ({ originProductNo, result }))
          .catch(error => ({ originProductNo, result: { success: false as const, error: error.message, product: undefined } }))
      );

      const detailResults = await Promise.all(detailPromises);

      for (const { originProductNo, result: detailResult } of detailResults) {
        processedOrigins++;

        if (!detailResult.success || !detailResult.product) {
          continue;
        }

        // API 응답 구조: { groupProduct: {...}, originProduct: {...} }
        const responseData = detailResult.product as any;
        const originProduct = responseData.originProduct || responseData;
        
        // 옵션 정보 추출
        const optionInfo = originProduct?.detailAttribute?.optionInfo;
        const optionCombinations = optionInfo?.optionCombinations || [];
        const optionStandards = optionInfo?.optionStandards || [];
        const options = optionCombinations.length > 0 ? optionCombinations : optionStandards;

        // 옵션 데이터 수집
        for (const option of options) {
          allOptionData.push({
            origin_product_no: originProductNo,
            option_combination_id: option.id,
            option_name1: option.optionName1 || null,
            option_value1: option.optionValue1 || null,
            option_name2: option.optionName2 || null,
            option_value2: option.optionValue2 || null,
            stock_quantity: option.stockQuantity || 0,
            price: option.price || 0,
            seller_management_code: option.sellerManagerCode || null,
            use_yn: option.usable !== false ? "Y" : "N",
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      // 진행률 로그 (10개 처리마다)
      if (processedOrigins % 10 === 0 || processedOrigins === uniqueOriginProductNos.length) {
        console.log(`🔄 원상품 상세 조회 진행: ${processedOrigins}/${uniqueOriginProductNos.length} (옵션 ${allOptionData.length}개 수집)`);
      }
    }

    // 옵션 배치 저장 (50개씩)
    if (allOptionData.length > 0) {
      console.log(`📦 옵션 배치 저장 시작: ${allOptionData.length}개`);
      const optionChunks = chunkArray(allOptionData, 50);
      
      for (const chunk of optionChunks) {
        const { error } = await adminClient
          .from("naver_product_options")
          .upsert(chunk, { onConflict: "origin_product_no,option_combination_id" });

        if (!error) {
          optionsSynced += chunk.length;
        } else {
          console.error("❌ 옵션 배치 저장 실패:", error);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`✅ 네이버 제품 동기화 완료: ${productsSynced}개 제품, ${optionsSynced}개 옵션 (${durationMs}ms)`);

    return {
      success: true,
      message: `${productsSynced}개 제품, ${optionsSynced}개 옵션 동기화 완료`,
      data: {
        productsSynced,
        optionsSynced,
        durationMs,
      },
    };

  } catch (error) {
    console.error("❌ 네이버 제품 동기화 중 오류:", error);
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
  const originProductNo = Number(formData.get("originProductNo"));
  const optionCombinationId = Number(formData.get("optionCombinationId"));
  const quantity = Number(formData.get("quantity"));

  if (!originProductNo || !optionCombinationId || isNaN(quantity)) {
    return {
      success: false,
      error: "필수 파라미터가 누락되었습니다 (originProductNo, optionCombinationId, quantity)",
    };
  }

  try {
    // 동적 import로 서버 전용 모듈 로드
    const { updateProductOptionStock } = await import("../lib/naver.server");
    
    // 네이버 API로 재고 업데이트
    const result = await updateProductOptionStock(originProductNo, [
      { optionCombinationId, stockQuantity: quantity }
    ]);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "네이버 재고 업데이트 실패",
      };
    }

    // 로컬 DB도 업데이트
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    await adminClient
      .from("naver_product_options")
      .update({ 
        stock_quantity: quantity,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("origin_product_no", originProductNo)
      .eq("option_combination_id", optionCombinationId);

    console.log(`✅ 재고 업데이트 완료: ${originProductNo}/${optionCombinationId} → ${quantity}개`);

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
