/**
 * 쿠팡 로켓그로스 API - 재고 관련
 */

import {
  coupangFetch,
  type CoupangApiResponse,
  type CoupangCredentials,
  type CoupangInventory,
} from "./coupang-auth.server";

// =====================================================
// 재고 API
// =====================================================

/**
 * 재고 요약 조회
 *
 * @param vendorItemId - 특정 옵션만 조회 시 (선택)
 * @param nextToken - 다음 페이지 토큰
 */
export async function getCoupangInventory(
  credentials: CoupangCredentials,
  vendorItemId?: number,
  nextToken?: string
): Promise<CoupangApiResponse<CoupangInventory[]>> {
  let path = `/v2/providers/rg_open_api/apis/api/v1/vendors/${credentials.vendor_id}/rg/inventory/summaries`;

  const params: string[] = [];
  if (vendorItemId) params.push(`vendorItemId=${vendorItemId}`);
  if (nextToken) params.push(`nextToken=${nextToken}`);
  if (params.length) path += `?${params.join("&")}`;

  return coupangFetch<CoupangInventory[]>("GET", path, credentials);
}

/**
 * 전체 재고 조회 (페이징)
 */
export async function getAllCoupangInventory(
  credentials: CoupangCredentials
): Promise<CoupangInventory[]> {
  const allInventory: CoupangInventory[] = [];
  let nextToken: string | undefined;
  let pageCount = 0;

  do {
    const response = await getCoupangInventory(
      credentials,
      undefined,
      nextToken
    );

    if (response.data && Array.isArray(response.data)) {
      allInventory.push(...response.data);
    }

    nextToken = response.nextToken;
    pageCount++;

    console.log(
      `[Coupang] Inventory page ${pageCount}: ${response.data?.length || 0} items`
    );
  } while (nextToken);

  console.log(`[Coupang] Total inventory items fetched: ${allInventory.length}`);
  return allInventory;
}
