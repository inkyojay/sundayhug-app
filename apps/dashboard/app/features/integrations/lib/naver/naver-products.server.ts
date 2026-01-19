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
 * 상품 옵션 재고/가격 변경
 * PUT /v1/products/origin-products/:originProductNo/option-stock
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/update-options-product
 */
export async function updateProductOptionStock(
  originProductNo: number,
  options: {
    optionCombinationId: number;
    stockQuantity?: number;
    price?: number;
  }[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  const body = {
    optionStockUpdateRequests: options.map((opt) => ({
      id: opt.optionCombinationId,
      stockQuantity: opt.stockQuantity,
      price: opt.price,
    })),
  };

  console.log(`📦 네이버 옵션 재고 변경: originProductNo=${originProductNo}`, body);

  const result = await naverFetch<any>(
    `/external/v1/products/origin-products/${originProductNo}/option-stock`,
    {
      method: "PUT",
      body,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

/**
 * 상품 전체 재고 변경 (단일 상품용)
 * PUT /external/v2/products/origin-products/{originProductNo}
 */
export async function updateProductStock(
  originProductNo: number,
  stockQuantity: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`📦 네이버 재고 변경: originProductNo=${originProductNo}, stock=${stockQuantity}`);

  const result = await naverFetch<any>(
    `/external/v2/products/origin-products/${originProductNo}`,
    {
      method: "PUT",
      body: {
        originProduct: {
          stockQuantity,
        },
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
