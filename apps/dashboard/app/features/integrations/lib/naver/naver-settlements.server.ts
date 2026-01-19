/**
 * 네이버 커머스 API - 정산 관련
 *
 * 정산 내역 조회 API
 */

import { naverFetch } from "./naver-auth.server";
import type { NaverSettlement, GetSettlementsParams } from "./naver-types.server";

// ============================================================================
// 정산 조회
// ============================================================================

/**
 * 정산 내역 조회
 * GET /external/v1/pay-order/seller/settlements
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function getSettlements(params: GetSettlementsParams = {}): Promise<{
  success: boolean;
  settlements?: NaverSettlement[];
  totalCount?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();

  // 기본값: 최근 30일
  const endDate =
    params.endDate ||
    (() => {
      const d = new Date();
      return d.toISOString().split("T")[0];
    })();
  const startDate =
    params.startDate ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    })();

  queryParams.set("startDate", startDate);
  queryParams.set("endDate", endDate);

  if (params.settlementStatus) {
    queryParams.set("settlementStatus", params.settlementStatus);
  }
  if (params.page) {
    queryParams.set("page", String(params.page));
  }
  if (params.size) {
    queryParams.set("size", String(params.size || 100));
  }

  console.log(`📊 정산 내역 조회: ${startDate} ~ ${endDate}`);

  const result = await naverFetch<{ contents: NaverSettlement[]; totalElements: number }>(
    `/external/v1/pay-order/seller/settlements?${queryParams.toString()}`
  );

  if (!result.success) {
    console.error(`❌ 정산 내역 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 정산 내역 조회 완료: ${result.data?.totalElements || 0}건`);

  return {
    success: true,
    settlements: result.data?.contents || [],
    totalCount: result.data?.totalElements || 0,
  };
}

/**
 * 정산 상세 조회
 * GET /external/v1/pay-order/seller/settlements/{settlementTargetId}
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function getSettlementDetail(settlementTargetId: string): Promise<{
  success: boolean;
  settlement?: NaverSettlement;
  error?: string;
}> {
  console.log(`📊 정산 상세 조회: settlementTargetId=${settlementTargetId}`);

  const result = await naverFetch<NaverSettlement>(
    `/external/v1/pay-order/seller/settlements/${settlementTargetId}`
  );

  if (!result.success) {
    console.error(`❌ 정산 상세 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 정산 상세 조회 완료: settlementTargetId=${settlementTargetId}`);

  return {
    success: true,
    settlement: result.data,
  };
}

/**
 * 정산 예정 금액 조회
 * GET /external/v1/pay-order/seller/settlements/expected
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function getExpectedSettlements(params: GetSettlementsParams = {}): Promise<{
  success: boolean;
  settlements?: NaverSettlement[];
  totalAmount?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();

  // 기본값: 최근 7일
  const endDate =
    params.endDate ||
    (() => {
      const d = new Date();
      return d.toISOString().split("T")[0];
    })();
  const startDate =
    params.startDate ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    })();

  queryParams.set("startDate", startDate);
  queryParams.set("endDate", endDate);

  if (params.page) {
    queryParams.set("page", String(params.page));
  }
  if (params.size) {
    queryParams.set("size", String(params.size || 100));
  }

  console.log(`📊 정산 예정 금액 조회: ${startDate} ~ ${endDate}`);

  const result = await naverFetch<{
    contents: NaverSettlement[];
    totalElements: number;
    totalExpectedAmount?: number;
  }>(`/external/v1/pay-order/seller/settlements/expected?${queryParams.toString()}`);

  if (!result.success) {
    console.error(`❌ 정산 예정 금액 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  // 총 예정 금액 계산
  const totalAmount =
    result.data?.totalExpectedAmount ||
    result.data?.contents?.reduce((sum, s) => sum + (s.expectedSettlementAmount || 0), 0) ||
    0;

  console.log(`✅ 정산 예정 금액 조회 완료: ${result.data?.totalElements || 0}건, 총 ${totalAmount}원`);

  return {
    success: true,
    settlements: result.data?.contents || [],
    totalAmount,
  };
}
