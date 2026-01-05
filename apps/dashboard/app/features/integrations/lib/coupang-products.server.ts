/**
 * 쿠팡 로켓그로스 API - 상품 관련
 */

import {
  coupangFetch,
  type CoupangApiResponse,
  type CoupangCredentials,
  type CoupangProduct,
  type CoupangProductDetail,
} from "./coupang-auth.server";

// =====================================================
// 상품 API
// =====================================================

/**
 * 상품 목록 조회
 *
 * @param options.businessTypes - 'rocketGrowth' | 'marketplace' | 'all' (기본: all)
 */
export async function getCoupangProducts(
  credentials: CoupangCredentials,
  options?: {
    nextToken?: string;
    maxPerPage?: number;
    status?: string;
    sellerProductName?: string;
    businessTypes?: "rocketGrowth" | "marketplace" | "all";
  }
): Promise<CoupangApiResponse<CoupangProduct[]>> {
  let path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`;

  const params = [`vendorId=${credentials.vendor_id}`];

  // businessTypes 설정 (기본값: 둘 다 조회)
  const businessTypes = options?.businessTypes || "all";
  if (businessTypes === "rocketGrowth") {
    params.push(`businessTypes=rocketGrowth`);
  } else if (businessTypes === "marketplace") {
    params.push(`businessTypes=marketplace`);
  }
  // 'all'인 경우 businessTypes 파라미터 생략 (전체 조회)

  if (options?.nextToken) params.push(`nextToken=${options.nextToken}`);
  if (options?.maxPerPage) params.push(`maxPerPage=${options.maxPerPage}`);
  if (options?.status) params.push(`status=${options.status}`);
  if (options?.sellerProductName)
    params.push(`sellerProductName=${encodeURIComponent(options.sellerProductName)}`);

  path += `?${params.join("&")}`;

  return coupangFetch<CoupangProduct[]>("GET", path, credentials);
}

/**
 * 전체 상품 조회 (페이징)
 *
 * @param options.businessTypes - 'rocketGrowth' | 'marketplace' | 'all' (기본: all)
 */
export async function getAllCoupangProducts(
  credentials: CoupangCredentials,
  options?: {
    status?: string;
    businessTypes?: "rocketGrowth" | "marketplace" | "all";
  }
): Promise<CoupangProduct[]> {
  const allProducts: CoupangProduct[] = [];
  let nextToken: string | undefined;
  let pageCount = 0;

  do {
    const response = await getCoupangProducts(credentials, {
      nextToken,
      maxPerPage: 100,
      status: options?.status,
      businessTypes: options?.businessTypes,
    });

    if (response.data && Array.isArray(response.data)) {
      allProducts.push(...response.data);
    }

    nextToken = response.nextToken;
    pageCount++;

    console.log(
      `[Coupang] Products page ${pageCount}: ${response.data?.length || 0} products`
    );
  } while (nextToken);

  console.log(`[Coupang] Total products fetched: ${allProducts.length}`);
  return allProducts;
}

/**
 * 상품 상세 조회
 */
export async function getCoupangProductDetail(
  credentials: CoupangCredentials,
  sellerProductId: number
): Promise<CoupangApiResponse<CoupangProductDetail>> {
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`;
  return coupangFetch<CoupangProductDetail>("GET", path, credentials);
}
