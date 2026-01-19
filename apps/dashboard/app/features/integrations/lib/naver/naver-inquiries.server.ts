/**
 * 네이버 커머스 API - 문의 관련
 *
 * 고객 문의 조회 및 답변 API
 */

import { naverFetch } from "./naver-auth.server";
import type { NaverInquiry, GetInquiriesParams, InquiryAnswerParams } from "./naver-types.server";

// ============================================================================
// 문의 조회
// ============================================================================

/**
 * 문의 목록 조회
 * GET /external/v1/seller/inquiries
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function getInquiries(params: GetInquiriesParams = {}): Promise<{
  success: boolean;
  inquiries?: NaverInquiry[];
  totalCount?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();

  // 기본값: 최근 30일
  const endDate = params.endDate || new Date().toISOString();
  const startDate =
    params.startDate ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    })();

  queryParams.set("startDate", startDate);
  queryParams.set("endDate", endDate);

  if (params.inquiryStatus) {
    queryParams.set("inquiryStatus", params.inquiryStatus);
  }
  if (params.answered !== undefined) {
    queryParams.set("answered", String(params.answered));
  }
  if (params.page) {
    queryParams.set("page", String(params.page));
  }
  if (params.size) {
    queryParams.set("size", String(params.size || 100));
  }

  console.log(`💬 문의 목록 조회: ${startDate} ~ ${endDate}`);

  const result = await naverFetch<{ contents: NaverInquiry[]; totalElements: number }>(
    `/external/v1/seller/inquiries?${queryParams.toString()}`
  );

  if (!result.success) {
    console.error(`❌ 문의 목록 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 문의 목록 조회 완료: ${result.data?.totalElements || 0}건`);

  return {
    success: true,
    inquiries: result.data?.contents || [],
    totalCount: result.data?.totalElements || 0,
  };
}

/**
 * 문의 상세 조회
 * GET /external/v1/seller/inquiries/{inquiryNo}
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function getInquiryDetail(inquiryNo: number): Promise<{
  success: boolean;
  inquiry?: NaverInquiry;
  error?: string;
}> {
  console.log(`💬 문의 상세 조회: inquiryNo=${inquiryNo}`);

  const result = await naverFetch<NaverInquiry>(`/external/v1/seller/inquiries/${inquiryNo}`);

  if (!result.success) {
    console.error(`❌ 문의 상세 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 문의 상세 조회 완료: inquiryNo=${inquiryNo}`);

  return {
    success: true,
    inquiry: result.data,
  };
}

// ============================================================================
// 문의 답변
// ============================================================================

/**
 * 문의 답변
 * POST /external/v1/seller/inquiries/{inquiryNo}/answer
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function answerInquiry(params: InquiryAnswerParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { inquiryNo, answerContent } = params;

  if (!answerContent || answerContent.trim().length === 0) {
    return { success: false, error: "답변 내용을 입력해주세요." };
  }

  console.log(`💬 문의 답변 작성: inquiryNo=${inquiryNo}`);

  const result = await naverFetch<any>(`/external/v1/seller/inquiries/${inquiryNo}/answer`, {
    method: "POST",
    body: { answerContent },
  });

  if (!result.success) {
    console.error(`❌ 문의 답변 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 문의 답변 완료: inquiryNo=${inquiryNo}`);
  return { success: true };
}

/**
 * 문의 답변 수정
 * PUT /external/v1/seller/inquiries/{inquiryNo}/answer
 *
 * 참고: 실제 엔드포인트는 네이버 공식 문서에서 확인 필요
 */
export async function updateInquiryAnswer(params: InquiryAnswerParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { inquiryNo, answerContent } = params;

  if (!answerContent || answerContent.trim().length === 0) {
    return { success: false, error: "답변 내용을 입력해주세요." };
  }

  console.log(`💬 문의 답변 수정: inquiryNo=${inquiryNo}`);

  const result = await naverFetch<any>(`/external/v1/seller/inquiries/${inquiryNo}/answer`, {
    method: "PUT",
    body: { answerContent },
  });

  if (!result.success) {
    console.error(`❌ 문의 답변 수정 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 문의 답변 수정 완료: inquiryNo=${inquiryNo}`);
  return { success: true };
}

/**
 * 미답변 문의 개수 조회
 */
export async function getUnansweredInquiryCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const result = await getInquiries({
    inquiryStatus: "WAITING",
    size: 1,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    count: result.totalCount || 0,
  };
}
