/**
 * 네이버 커머스 API - 상품 관련
 *
 * 상품 조회/등록/수정 API
 */

import { naverFetch } from "./naver-auth.server";
import type {
  NaverProduct,
  NaverProductDetailed,
  NaverProductOption,
  GetProductsParams,
  NaverProductCreateParams,
  NaverProductUpdateParams,
} from "./naver-types.server";

// ============================================================================
// 상품 조회
// ============================================================================

/**
 * 상품 목록 조회
 * GET /external/v2/products
 */
export async function getProducts(params: GetProductsParams = {}): Promise<{
  success: boolean;
  products?: NaverProduct[];
  count?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page || 1));
  queryParams.set("size", String(params.size || 100));

  if (params.productStatusType) {
    queryParams.set("productStatusType", params.productStatusType);
  }

  const result = await naverFetch<{ contents: NaverProduct[]; totalElements: number }>(
    `/external/v2/products?${queryParams.toString()}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    products: result.data?.contents || [],
    count: result.data?.totalElements || 0,
  };
}

/**
 * 상품 목록 조회 (상세)
 * POST /v1/products/search
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/상품-목록-조회
 */
export async function getProductListDetailed(params: GetProductsParams = {}): Promise<{
  success: boolean;
  products?: NaverProductDetailed[];
  totalCount?: number;
  error?: string;
}> {
  const page = params.page || 1;
  const size = params.size || 100;

  // 검색 조건 body
  const searchBody: Record<string, any> = {
    page,
    size,
  };

  // 상품 상태 필터 (선택사항)
  if (params.productStatusType) {
    searchBody.productStatusTypes = [params.productStatusType];
  }

  console.log(`📦 네이버 상품 목록 조회: POST /external/v1/products/search`, searchBody);

  // API 응답 구조: { contents: [{ originProductNo, channelProducts: [...] }] }
  interface SearchResponseItem {
    originProductNo: number;
    groupProductNo?: number;
    channelProducts: Array<{
      originProductNo: number;
      channelProductNo: number;
      channelServiceType: string;
      categoryId?: string;
      name: string;
      sellerManagementCode?: string;
      statusType: string;
      channelProductDisplayStatusType: string;
      salePrice: number;
      discountedPrice?: number;
      stockQuantity: number;
      representativeImage?: { url: string };
    }>;
  }

  const result = await naverFetch<{
    contents: SearchResponseItem[];
    totalElements: number;
    totalPages: number;
  }>(`/external/v1/products/search`, {
    method: "POST",
    body: searchBody,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // contents[].channelProducts[]를 플랫하게 변환
  const flatProducts: NaverProductDetailed[] = [];

  for (const item of result.data?.contents || []) {
    const channelProducts = item.channelProducts || [];
    for (const cp of channelProducts) {
      flatProducts.push({
        originProductNo: item.originProductNo || cp.originProductNo,
        channelProductNo: cp.channelProductNo,
        name: cp.name,
        salePrice: cp.salePrice || 0,
        stockQuantity: cp.stockQuantity || 0,
        productStatusType: cp.statusType,
        channelProductDisplayStatusType: cp.channelProductDisplayStatusType,
        sellerManagementCode: cp.sellerManagementCode, // 판매자 상품코드
        representativeImage: cp.representativeImage,
        detailAttribute: cp.categoryId
          ? {
              naverShoppingSearchInfo: { categoryId: cp.categoryId },
            }
          : undefined,
      });
    }
  }

  return {
    success: true,
    products: flatProducts,
    totalCount: result.data?.totalElements || flatProducts.length,
  };
}

/**
 * 채널 상품 단건 조회 (상세 정보 + 옵션)
 * GET /v2/products/channel-products/:channelProductNo
 */
export async function getChannelProduct(channelProductNo: number): Promise<{
  success: boolean;
  product?: NaverProductDetailed;
  error?: string;
}> {
  const result = await naverFetch<NaverProductDetailed>(
    `/external/v2/products/channel-products/${channelProductNo}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    product: result.data,
  };
}

/**
 * 원상품 조회 (옵션 정보 포함)
 * GET /v2/products/origin-products/:originProductNo
 */
export async function getOriginProduct(originProductNo: number): Promise<{
  success: boolean;
  product?: NaverProductDetailed;
  error?: string;
}> {
  const result = await naverFetch<NaverProductDetailed>(
    `/external/v2/products/origin-products/${originProductNo}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    product: result.data,
  };
}

// ============================================================================
// 상품 등록/수정
// ============================================================================

/**
 * 상품 등록
 * POST /external/v2/products
 */
export async function createProduct(params: NaverProductCreateParams): Promise<{
  success: boolean;
  originProductNo?: number;
  smartstoreChannelProductNo?: number;
  error?: string;
}> {
  console.log(`📦 네이버 상품 등록: ${params.originProduct.name}`);

  const result = await naverFetch<{
    originProductNo: number;
    smartstoreChannelProductNo?: number;
  }>(`/external/v2/products`, {
    method: "POST",
    body: params,
  });

  if (!result.success) {
    console.error(`❌ 상품 등록 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 상품 등록 완료: originProductNo=${result.data?.originProductNo}`);

  return {
    success: true,
    originProductNo: result.data?.originProductNo,
    smartstoreChannelProductNo: result.data?.smartstoreChannelProductNo,
  };
}

/**
 * 상품 수정
 * PUT /external/v2/products/origin-products/{originProductNo}
 */
export async function updateProduct(params: NaverProductUpdateParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { originProductNo, ...updateData } = params;

  console.log(`📦 네이버 상품 수정: originProductNo=${originProductNo}`);

  const result = await naverFetch<any>(
    `/external/v2/products/origin-products/${originProductNo}`,
    {
      method: "PUT",
      body: updateData,
    }
  );

  if (!result.success) {
    console.error(`❌ 상품 수정 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 상품 수정 완료: originProductNo=${originProductNo}`);
  return { success: true };
}

/**
 * 상품 삭제
 * DELETE /external/v2/products/origin-products/{originProductNo}
 */
export async function deleteProduct(originProductNo: number): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`📦 네이버 상품 삭제: originProductNo=${originProductNo}`);

  const result = await naverFetch<any>(
    `/external/v2/products/origin-products/${originProductNo}`,
    {
      method: "DELETE",
    }
  );

  if (!result.success) {
    console.error(`❌ 상품 삭제 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 상품 삭제 완료: originProductNo=${originProductNo}`);
  return { success: true };
}

// ============================================================================
// 옵션/재고 관리
// ============================================================================

/**
 * 상품 옵션 재고/가격 변경 (옵션 전용 API)
 * PUT /v1/products/origin-products/:originProductNo/option-stock
 *
 * 옵션 상품의 재고, 가격, 할인가를 전체 상품 조회 없이 직접 변경 가능.
 * 참고: https://apicenter.commerce.naver.com/ko/product/product-api/ko-update-options-product
 *
 * @param originProductNo 원상품번호
 * @param options 옵션 목록 (조합형 또는 표준형)
 * @param salePrice 판매가 정보 (선택)
 */
export async function updateProductOptionStock(
  originProductNo: number,
  options: {
    optionCombinationId: number;
    stockQuantity?: number;
    price?: number;
  }[],
  salePrice?: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  // API 요청 본문 구성
  const body: Record<string, any> = {
    optionInfo: {
      optionCombinations: options.map((opt) => ({
        id: opt.optionCombinationId,
        stockQuantity: opt.stockQuantity,
        price: opt.price,
      })),
    },
  };

  // 판매가 정보가 있으면 추가
  if (salePrice !== undefined) {
    body.productSalePrice = {
      salePrice,
    };
  }

  console.log(`📦 네이버 옵션 재고 변경: originProductNo=${originProductNo}`, JSON.stringify(body, null, 2));

  const result = await naverFetch<any>(
    `/external/v1/products/origin-products/${originProductNo}/option-stock`,
    {
      method: "PUT",
      body,
    }
  );

  if (!result.success) {
    console.error(`❌ 옵션 재고 변경 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 옵션 재고 변경 완료: originProductNo=${originProductNo}`);
  return { success: true };
}

/**
 * 상품 전체 재고 변경 (단일 상품용)
 *
 * - 옵션 상품: 전용 API (PUT /v1/.../option-stock)를 사용하여 모든 옵션 재고를 동일하게 설정
 * - 단일 상품: 상품 수정 API (PUT /v2/.../origin-products/{id})를 사용
 *
 * @param originProductNo 원상품번호
 * @param stockQuantity 설정할 재고 수량
 */
export async function updateProductStock(
  originProductNo: number,
  stockQuantity: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`📦 네이버 재고 변경: originProductNo=${originProductNo}, stock=${stockQuantity}`);

  // 1. 먼저 원상품 전체 정보 조회
  const productResult = await getOriginProduct(originProductNo);

  if (!productResult.success || !productResult.product) {
    console.error(`❌ 상품 정보 조회 실패: ${productResult.error}`);
    return { success: false, error: productResult.error || "상품 정보를 조회할 수 없습니다" };
  }

  const originProduct = productResult.product as any;

  // 2. 옵션 상품인지 확인 (옵션 상품은 옵션별 재고로 관리됨)
  const optionCombinations = originProduct.originProduct?.optionInfo?.optionCombinations;
  const hasOptions = optionCombinations && optionCombinations.length > 0;

  if (hasOptions) {
    // 옵션 상품의 경우: 전용 option-stock API 사용
    console.log(`📦 옵션 상품 감지됨. 전용 API로 전체 옵션 재고를 ${stockQuantity}로 설정합니다.`);

    const options = optionCombinations.map((opt: any) => ({
      optionCombinationId: opt.id,
      stockQuantity,
    }));

    return updateProductOptionStock(originProductNo, options);
  }

  // 3. 단일 상품의 경우: 상품 수정 API 사용
  console.log(`📦 단일 상품. 상품 수정 API로 재고를 ${stockQuantity}로 설정합니다.`);
  originProduct.originProduct.stockQuantity = stockQuantity;

  const result = await naverFetch<any>(
    `/external/v2/products/origin-products/${originProductNo}`,
    {
      method: "PUT",
      body: {
        originProduct: originProduct.originProduct,
      },
    }
  );

  if (!result.success) {
    console.error(`❌ 재고 변경 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 재고 변경 완료: originProductNo=${originProductNo}`);
  return { success: true };
}

// ============================================================================
// 카테고리 조회
// ============================================================================

/**
 * 카테고리 목록 조회
 * GET /external/v1/product-categories
 */
export async function getCategories(): Promise<{
  success: boolean;
  categories?: any[];
  error?: string;
}> {
  const result = await naverFetch<{ contents: any[] }>(`/external/v1/product-categories`);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    categories: result.data?.contents || [],
  };
}

/**
 * 카테고리 상세 조회
 * GET /external/v1/product-categories/{categoryId}
 */
export async function getCategoryDetail(categoryId: string): Promise<{
  success: boolean;
  category?: any;
  error?: string;
}> {
  const result = await naverFetch<any>(`/external/v1/product-categories/${categoryId}`);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    category: result.data,
  };
}

// ============================================================================
// 상태 변경
// ============================================================================

import type {
  ProductStatusType,
  ChangeStatusRequest,
  BulkUpdateRequest,
  BulkOperationResult,
  BulkUpdateResult,
} from "./naver-products-types";

/**
 * 상품 상태 변경
 * PUT /v1/products/origin-products/:originProductNo/change-status
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/update-product-status
 */
export async function changeProductStatus(
  originProductNo: number,
  statusType: ProductStatusType,
  changeReason?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`📦 네이버 상품 상태 변경: originProductNo=${originProductNo}, status=${statusType}`);

  const body: Record<string, unknown> = { statusType };
  if (changeReason) {
    body.changeReason = changeReason;
  }

  const result = await naverFetch<any>(
    `/external/v1/products/origin-products/${originProductNo}/change-status`,
    {
      method: "PUT",
      body,
    }
  );

  if (!result.success) {
    console.error(`❌ 상품 상태 변경 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 상품 상태 변경 완료: originProductNo=${originProductNo}`);
  return { success: true };
}

/**
 * 다중 상품 상태 변경 (순차 처리)
 * 각 상품에 대해 개별적으로 change-status API 호출
 */
export async function changeProductStatusBulk(
  products: ChangeStatusRequest[]
): Promise<BulkOperationResult[]> {
  console.log(`📦 네이버 상품 일괄 상태 변경: ${products.length}개 상품`);

  const results: BulkOperationResult[] = [];

  for (const product of products) {
    const result = await changeProductStatus(
      product.originProductNo,
      product.statusType,
      product.changeReason
    );
    results.push({
      originProductNo: product.originProductNo,
      success: result.success,
      error: result.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`✅ 일괄 상태 변경 완료: ${successCount}/${products.length}개 성공`);

  return results;
}

// ============================================================================
// 대량 상품 수정
// ============================================================================

/**
 * 대량 상품 수정
 * PUT /v1/products/origin-products/bulk-update
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/bulk-update-products
 *
 * 지원 타입:
 * - IMMEDIATE_DISCOUNT: 즉시할인가
 * - SALE_PRICE: 판매가
 * - SALE_PERIOD: 판매기간
 * - DELIVERY: 배송정보
 * - PURCHASE_QUANTITY_LIMIT: 구매수량제한
 */
export async function bulkUpdateProducts(
  request: BulkUpdateRequest
): Promise<BulkUpdateResult> {
  console.log(
    `📦 네이버 대량 상품 수정: type=${request.bulkUpdateType}, products=${request.originProductNos.length}개`
  );

  const result = await naverFetch<{
    successProductNos?: number[];
    failProductNos?: number[];
    failReasons?: { originProductNo: number; reason: string }[];
  }>(`/external/v1/products/origin-products/bulk-update`, {
    method: "PUT",
    body: {
      bulkUpdateType: request.bulkUpdateType,
      originProductNos: request.originProductNos,
      ...request.updateData,
    },
  });

  if (!result.success) {
    console.error(`❌ 대량 상품 수정 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  // 결과 변환
  const successNos = result.data?.successProductNos || [];
  const failReasons = result.data?.failReasons || [];

  const results: BulkOperationResult[] = [
    ...successNos.map((no) => ({
      originProductNo: no,
      success: true,
    })),
    ...failReasons.map((f) => ({
      originProductNo: f.originProductNo,
      success: false,
      error: f.reason,
    })),
  ];

  console.log(
    `✅ 대량 상품 수정 완료: ${successNos.length}개 성공, ${failReasons.length}개 실패`
  );

  return {
    success: true,
    results,
  };
}

/**
 * 다중 상품 재고 일괄 수정
 * 각 상품에 대해 개별적으로 재고 수정 API 호출
 */
export async function updateProductStockBulk(
  products: { originProductNo: number; stockQuantity: number }[]
): Promise<BulkOperationResult[]> {
  console.log(`📦 네이버 재고 일괄 수정: ${products.length}개 상품`);

  const results: BulkOperationResult[] = [];

  for (const product of products) {
    const result = await updateProductStock(product.originProductNo, product.stockQuantity);
    results.push({
      originProductNo: product.originProductNo,
      success: result.success,
      error: result.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`✅ 재고 일괄 수정 완료: ${successCount}/${products.length}개 성공`);

  return results;
}

/**
 * 다중 상품 옵션 재고 일괄 수정
 */
export async function updateProductOptionStockBulk(
  products: {
    originProductNo: number;
    options: { optionCombinationId: number; stockQuantity?: number; price?: number }[];
  }[]
): Promise<BulkOperationResult[]> {
  console.log(`📦 네이버 옵션 재고 일괄 수정: ${products.length}개 상품`);

  const results: BulkOperationResult[] = [];

  for (const product of products) {
    const result = await updateProductOptionStock(product.originProductNo, product.options);
    results.push({
      originProductNo: product.originProductNo,
      success: result.success,
      error: result.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`✅ 옵션 재고 일괄 수정 완료: ${successCount}/${products.length}개 성공`);

  return results;
}
