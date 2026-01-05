/**
 * 쿠팡 로켓그로스 API - 주문 관련
 */

import {
  coupangFetch,
  type CoupangApiResponse,
  type CoupangCredentials,
  type CoupangOrder,
} from "./coupang-auth.server";

// =====================================================
// 주문 API
// =====================================================

/**
 * 주문 목록 조회 (페이징)
 *
 * @param dateFrom - 시작일 (yyyyMMdd 형식)
 * @param dateTo - 종료일 (yyyyMMdd 형식)
 * @param nextToken - 다음 페이지 토큰
 */
export async function getCoupangOrders(
  credentials: CoupangCredentials,
  dateFrom: string,
  dateTo: string,
  nextToken?: string
): Promise<CoupangApiResponse<CoupangOrder[]>> {
  let path = `/v2/providers/rg_open_api/apis/api/v1/vendors/${credentials.vendor_id}/rg/orders`;
  path += `?paidDateFrom=${dateFrom}&paidDateTo=${dateTo}`;
  if (nextToken) path += `&nextToken=${nextToken}`;

  return coupangFetch<CoupangOrder[]>("GET", path, credentials);
}

/**
 * 모든 주문 조회 (전체 페이지)
 */
export async function getAllCoupangOrders(
  credentials: CoupangCredentials,
  dateFrom: string,
  dateTo: string
): Promise<CoupangOrder[]> {
  const allOrders: CoupangOrder[] = [];
  let nextToken: string | undefined;
  let pageCount = 0;

  do {
    const response = await getCoupangOrders(
      credentials,
      dateFrom,
      dateTo,
      nextToken
    );

    if (response.data && Array.isArray(response.data)) {
      allOrders.push(...response.data);
    }

    nextToken = response.nextToken;
    pageCount++;

    console.log(
      `[Coupang] Orders page ${pageCount}: ${response.data?.length || 0} orders`
    );
  } while (nextToken);

  console.log(`[Coupang] Total orders fetched: ${allOrders.length}`);
  return allOrders;
}

/**
 * 개별 주문 조회
 */
export async function getCoupangOrder(
  credentials: CoupangCredentials,
  orderId: number
): Promise<CoupangApiResponse<CoupangOrder>> {
  const path = `/v2/providers/rg_open_api/apis/api/v1/vendors/${credentials.vendor_id}/rg/order/${orderId}`;
  return coupangFetch<CoupangOrder>("GET", path, credentials);
}
