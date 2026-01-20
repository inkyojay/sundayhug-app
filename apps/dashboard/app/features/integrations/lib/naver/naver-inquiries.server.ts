/**
 * 네이버 커머스 API - 문의 관련
 *
 * 고객 문의 (주문 관련) 및 상품 문의 (Q&A) API
 */

import { naverFetch } from "./naver-auth.server";
import type {
  NaverInquiry,
  NaverProductQna,
  GetInquiriesParams,
  GetProductQnasParams,
  InquiryAnswerParams,
  ProductQnaAnswerParams,
} from "./naver-types.server";

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 날짜를 yyyy-MM-dd 형식으로 변환 (고객 문의용)
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 ISO date-time 형식으로 변환 (상품 문의용)
 * 형식: yyyy-MM-dd'T'HH:mm:ss.SSS+09:00 (KST 타임존)
 * 네이버 API 문서: "일시(date-time). 타임존 포함."
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  // KST 타임존 (+09:00) 추가
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

// ============================================================================
// 고객 문의 (Customer Inquiry) - 주문 관련
// ============================================================================

/**
 * 고객 문의 목록 조회
 * GET /external/v1/pay-user/inquiries
 */
export async function getCustomerInquiries(params: GetInquiriesParams = {}): Promise<{
  success: boolean;
  inquiries?: NaverInquiry[];
  totalCount?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();

  // 기본값: 최근 30일, yyyy-MM-dd 형식
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const endSearchDate = params.endDate
    ? formatDateToYYYYMMDD(new Date(params.endDate))
    : formatDateToYYYYMMDD(now);
  const startSearchDate = params.startDate
    ? formatDateToYYYYMMDD(new Date(params.startDate))
    : formatDateToYYYYMMDD(defaultStart);

  // 필수 파라미터
  queryParams.set("startSearchDate", startSearchDate);
  queryParams.set("endSearchDate", endSearchDate);

  // 선택 파라미터
  if (params.answered !== undefined) {
    queryParams.set("answered", String(params.answered));
  }
  if (params.page) {
    queryParams.set("page", String(params.page));
  }
  queryParams.set("size", String(params.size || 100));

  console.log(`💬 고객 문의 목록 조회: ${startSearchDate} ~ ${endSearchDate}`);

  const result = await naverFetch<{ content: NaverInquiry[]; totalElements: number }>(
    `/external/v1/pay-user/inquiries?${queryParams.toString()}`
  );

  if (!result.success) {
    console.error(`❌ 고객 문의 목록 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 고객 문의 목록 조회 완료: ${result.data?.totalElements || 0}건`);

  // API 응답을 UI에서 사용하는 형식으로 매핑 (응답 필드명: content)
  const inquiries = (result.data?.content || []).map((item) => ({
    ...item,
    // 호환성을 위한 필드 매핑
    inquiryTypeName: item.category,
    inquiryStatus: item.answered ? "ANSWERED" : "WAITING",
    content: item.inquiryContent,
    createDate: item.inquiryRegistrationDateTime,
    buyerMemberId: item.customerId,
    answerDate: item.answerRegistrationDateTime,
  })) as NaverInquiry[];

  return {
    success: true,
    inquiries,
    totalCount: result.data?.totalElements || 0,
  };
}

// ============================================================================
// 고객 문의 답변
// ============================================================================

/**
 * 고객 문의 답변
 * POST /external/v1/pay-merchant/inquiries/{inquiryNo}/answer
 */
export async function answerInquiry(params: InquiryAnswerParams): Promise<{
  success: boolean;
  answerContentId?: number;
  error?: string;
}> {
  const { inquiryNo, answerContent, answerTemplateId } = params;

  if (!answerContent || answerContent.trim().length === 0) {
    return { success: false, error: "답변 내용을 입력해주세요." };
  }

  console.log(`💬 고객 문의 답변 작성: inquiryNo=${inquiryNo}`);

  const body: { answerComment: string; answerTemplateId?: number } = {
    answerComment: answerContent,
  };
  if (answerTemplateId) {
    body.answerTemplateId = answerTemplateId;
  }

  const result = await naverFetch<{ answerContentId: number }>(
    `/external/v1/pay-merchant/inquiries/${inquiryNo}/answer`,
    {
      method: "POST",
      body,
    }
  );

  if (!result.success) {
    console.error(`❌ 고객 문의 답변 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 고객 문의 답변 완료: inquiryNo=${inquiryNo}`);
  return { success: true, answerContentId: result.data?.answerContentId };
}

/**
 * 고객 문의 답변 수정
 * PUT /external/v1/pay-merchant/inquiries/{inquiryNo}/answer/{answerContentId}
 */
export async function updateInquiryAnswer(params: InquiryAnswerParams & { answerContentId: number }): Promise<{
  success: boolean;
  error?: string;
}> {
  const { inquiryNo, answerContent, answerContentId, answerTemplateId } = params;

  if (!answerContent || answerContent.trim().length === 0) {
    return { success: false, error: "답변 내용을 입력해주세요." };
  }

  if (!answerContentId) {
    return { success: false, error: "답변 ID가 필요합니다." };
  }

  console.log(`💬 고객 문의 답변 수정: inquiryNo=${inquiryNo}, answerContentId=${answerContentId}`);

  const body: { answerComment: string; answerTemplateId?: number } = {
    answerComment: answerContent,
  };
  if (answerTemplateId) {
    body.answerTemplateId = answerTemplateId;
  }

  const result = await naverFetch<any>(
    `/external/v1/pay-merchant/inquiries/${inquiryNo}/answer/${answerContentId}`,
    {
      method: "PUT",
      body,
    }
  );

  if (!result.success) {
    console.error(`❌ 고객 문의 답변 수정 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 고객 문의 답변 수정 완료: inquiryNo=${inquiryNo}`);
  return { success: true };
}

/**
 * 미답변 고객 문의 개수 조회
 */
export async function getUnansweredCustomerInquiryCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const result = await getCustomerInquiries({
    answered: false,
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

// ============================================================================
// 상품 문의 (Product Q&A) - 상품 페이지
// ============================================================================

/**
 * 상품 문의 목록 조회
 * GET /external/v1/contents/qnas
 */
export async function getProductQnas(params: GetProductQnasParams = {}): Promise<{
  success: boolean;
  qnas?: NaverProductQna[];
  totalCount?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();

  // 기본값: 최근 30일, ISO date-time 형식
  const now = new Date();
  now.setHours(23, 59, 59);
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  defaultStart.setHours(0, 0, 0);

  const toDate = params.toDate
    ? formatDateToISO(new Date(params.toDate))
    : formatDateToISO(now);
  const fromDate = params.fromDate
    ? formatDateToISO(new Date(params.fromDate))
    : formatDateToISO(defaultStart);

  // 필수 파라미터
  queryParams.set("fromDate", fromDate);
  queryParams.set("toDate", toDate);

  // 선택 파라미터
  if (params.answered !== undefined) {
    queryParams.set("answered", String(params.answered));
  }
  if (params.page) {
    queryParams.set("page", String(params.page));
  }
  queryParams.set("size", String(params.size || 100));

  console.log(`📦 상품 문의 목록 조회: ${fromDate} ~ ${toDate}`);

  const result = await naverFetch<{ contents: NaverProductQna[]; totalElements: number }>(
    `/external/v1/contents/qnas?${queryParams.toString()}`
  );

  if (!result.success) {
    console.error(`❌ 상품 문의 목록 조회 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 상품 문의 목록 조회 완료: ${result.data?.totalElements || 0}건`);

  return {
    success: true,
    qnas: result.data?.contents || [],
    totalCount: result.data?.totalElements || 0,
  };
}

// ============================================================================
// 상품 문의 답변
// ============================================================================

/**
 * 상품 문의 답변 (신규 작성 또는 수정)
 * PUT /external/v1/contents/qnas/{questionId}
 *
 * 참고: 상품 문의는 PUT 메서드로 답변 등록/수정 모두 처리
 */
export async function answerProductQna(params: ProductQnaAnswerParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { questionId, commentContent } = params;

  if (!commentContent || commentContent.trim().length === 0) {
    return { success: false, error: "답변 내용을 입력해주세요." };
  }

  console.log(`📦 상품 문의 답변 작성/수정: questionId=${questionId}`);

  const result = await naverFetch<any>(
    `/external/v1/contents/qnas/${questionId}`,
    {
      method: "PUT",
      body: { commentContent },
    }
  );

  if (!result.success) {
    console.error(`❌ 상품 문의 답변 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 상품 문의 답변 완료: questionId=${questionId}`);
  return { success: true };
}

/**
 * 미답변 상품 문의 개수 조회
 */
export async function getUnansweredProductQnaCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const result = await getProductQnas({
    answered: false,
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

// ============================================================================
// 하위 호환성 유지
// ============================================================================

/**
 * @deprecated getCustomerInquiries 사용 권장
 */
export const getInquiries = getCustomerInquiries;

/**
 * @deprecated getUnansweredCustomerInquiryCount 사용 권장
 */
export const getUnansweredInquiryCount = getUnansweredCustomerInquiryCount;
