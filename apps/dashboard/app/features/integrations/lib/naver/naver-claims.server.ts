/**
 * 네이버 커머스 API - 클레임 관련
 *
 * 취소/반품/교환 조회 및 처리 API
 */

import { naverFetch } from "./naver-auth.server";
import type {
  NaverClaim,
  GetClaimsParams,
  ClaimApproveParams,
  ClaimRejectParams,
  ClaimHoldParams,
  ClaimExchangeDispatchParams,
  ClaimWithdrawParams,
} from "./naver-types.server";
import { toKSTString } from "./naver-auth.server";

// ============================================================================
// 클레임 조회
// ============================================================================

/**
 * 클레임 목록 조회
 * POST /external/v1/pay-order/seller/claims
 */
export async function getClaims(params: GetClaimsParams = {}): Promise<{
  success: boolean;
  claims?: NaverClaim[];
  count?: number;
  error?: string;
}> {
  const endDate = params.claimRequestDateTo || new Date().toISOString();
  const startDate =
    params.claimRequestDateFrom ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    })();

  const body: Record<string, any> = {
    claimRequestDateFrom: startDate,
    claimRequestDateTo: endDate,
  };

  if (params.claimType) {
    body.claimType = params.claimType;
  }

  const result = await naverFetch<{ data: { contents: NaverClaim[] } }>(
    "/external/v1/pay-order/seller/claims",
    {
      method: "POST",
      body,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    claims: result.data?.data?.contents || [],
    count: result.data?.data?.contents?.length || 0,
  };
}

// ============================================================================
// 취소 처리
// ============================================================================

/**
 * 취소 승인
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/cancel/approve
 */
export async function approveCancelClaim(params: ClaimApproveParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, memo } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/cancel/approve`;

  console.log(`📝 취소 승인 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: memo ? { memo } : undefined,
  });

  if (!result.success) {
    console.error(`❌ 취소 승인 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 취소 승인 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 취소 거부
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/cancel/reject
 */
export async function rejectCancelClaim(params: ClaimRejectParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, rejectReason, rejectDetailedReason } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/cancel/reject`;

  console.log(`📝 취소 거부 요청: productOrderId=${productOrderId}, reason=${rejectReason}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: {
      rejectReason,
      rejectDetailedReason,
    },
  });

  if (!result.success) {
    console.error(`❌ 취소 거부 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 취소 거부 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 취소 철회 (판매자가 직접 요청한 취소를 철회)
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/cancel/withdraw
 */
export async function withdrawCancelClaim(params: ClaimWithdrawParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/cancel/withdraw`;

  console.log(`📝 취소 철회 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, { method: "POST" });

  if (!result.success) {
    console.error(`❌ 취소 철회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 취소 철회 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

// ============================================================================
// 반품 처리
// ============================================================================

/**
 * 반품 승인
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/return/approve
 */
export async function approveReturnClaim(params: ClaimApproveParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, memo } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/return/approve`;

  console.log(`📝 반품 승인 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: memo ? { memo } : undefined,
  });

  if (!result.success) {
    console.error(`❌ 반품 승인 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 반품 승인 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 반품 거부
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/return/reject
 */
export async function rejectReturnClaim(params: ClaimRejectParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, rejectReason, rejectDetailedReason } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/return/reject`;

  console.log(`📝 반품 거부 요청: productOrderId=${productOrderId}, reason=${rejectReason}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: {
      rejectReason,
      rejectDetailedReason,
    },
  });

  if (!result.success) {
    console.error(`❌ 반품 거부 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 반품 거부 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 반품 보류
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/return/hold
 */
export async function holdReturnClaim(params: ClaimHoldParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, holdReason, holdDetailedReason } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/return/hold`;

  console.log(`📝 반품 보류 요청: productOrderId=${productOrderId}, reason=${holdReason}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: {
      holdReason,
      holdDetailedReason,
    },
  });

  if (!result.success) {
    console.error(`❌ 반품 보류 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 반품 보류 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 반품 보류 해제
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/return/hold-release
 */
export async function releaseReturnClaimHold(productOrderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/return/hold-release`;

  console.log(`📝 반품 보류 해제 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, { method: "POST" });

  if (!result.success) {
    console.error(`❌ 반품 보류 해제 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 반품 보류 해제 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 반품 철회
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/return/withdraw
 */
export async function withdrawReturnClaim(params: ClaimWithdrawParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/return/withdraw`;

  console.log(`📝 반품 철회 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, { method: "POST" });

  if (!result.success) {
    console.error(`❌ 반품 철회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 반품 철회 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

// ============================================================================
// 교환 처리
// ============================================================================

/**
 * 교환 수거 완료
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/exchange/collect-done
 */
export async function completeExchangeCollect(productOrderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/exchange/collect-done`;

  console.log(`📝 교환 수거 완료 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, { method: "POST" });

  if (!result.success) {
    console.error(`❌ 교환 수거 완료 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 교환 수거 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 교환 재배송 처리
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/exchange/re-dispatch
 */
export async function dispatchExchange(params: ClaimExchangeDispatchParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, deliveryCompanyCode, trackingNumber, dispatchDate } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/exchange/re-dispatch`;

  // dispatchDate 기본값: 현재 시간 (KST)
  const defaultDispatchDate = dispatchDate || toKSTString(new Date());

  console.log(
    `📝 교환 재배송 요청: productOrderId=${productOrderId}, 택배사=${deliveryCompanyCode}, 송장=${trackingNumber}`
  );

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: {
      dispatchDate: defaultDispatchDate,
      deliveryMethod: "DELIVERY",
      deliveryCompanyCode,
      trackingNumber,
    },
  });

  if (!result.success) {
    console.error(`❌ 교환 재배송 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 교환 재배송 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 교환 보류
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/exchange/hold
 */
export async function holdExchangeClaim(params: ClaimHoldParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, holdReason, holdDetailedReason } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/exchange/hold`;

  console.log(`📝 교환 보류 요청: productOrderId=${productOrderId}, reason=${holdReason}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: {
      holdReason,
      holdDetailedReason,
    },
  });

  if (!result.success) {
    console.error(`❌ 교환 보류 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 교환 보류 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 교환 보류 해제
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/exchange/hold-release
 */
export async function releaseExchangeClaimHold(productOrderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/exchange/hold-release`;

  console.log(`📝 교환 보류 해제 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, { method: "POST" });

  if (!result.success) {
    console.error(`❌ 교환 보류 해제 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 교환 보류 해제 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 교환 거부
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/exchange/reject
 */
export async function rejectExchangeClaim(params: ClaimRejectParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId, rejectReason, rejectDetailedReason } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/exchange/reject`;

  console.log(`📝 교환 거부 요청: productOrderId=${productOrderId}, reason=${rejectReason}`);

  const result = await naverFetch<any>(endpoint, {
    method: "POST",
    body: {
      rejectReason,
      rejectDetailedReason,
    },
  });

  if (!result.success) {
    console.error(`❌ 교환 거부 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 교환 거부 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 교환 철회
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/claim/exchange/withdraw
 */
export async function withdrawExchangeClaim(params: ClaimWithdrawParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId } = params;
  const endpoint = `/external/v1/pay-order/seller/product-orders/${productOrderId}/claim/exchange/withdraw`;

  console.log(`📝 교환 철회 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(endpoint, { method: "POST" });

  if (!result.success) {
    console.error(`❌ 교환 철회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 교환 철회 완료: productOrderId=${productOrderId}`);
  return { success: true };
}
