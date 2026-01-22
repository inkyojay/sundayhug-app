/**
 * 통일된 API 응답 포맷
 *
 * 모든 액션과 API 응답에서 일관된 형식을 사용합니다.
 *
 * 성공 응답:
 * { success: true, data?: T, message?: string }
 *
 * 실패 응답:
 * { success: false, error: string, code?: string }
 */

/**
 * 성공 응답 타입
 */
export interface SuccessResponse<T = undefined> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * 실패 응답 타입
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * 통합 API 응답 타입
 */
export type ApiResponse<T = undefined> = SuccessResponse<T> | ErrorResponse;

/**
 * 카운트가 포함된 응답 (일괄 처리용)
 */
export interface BulkResponse<T = undefined> {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  data?: T;
  errors?: string[];
  message?: string;
}

// ===== 응답 생성 헬퍼 =====

/**
 * 성공 응답 생성
 *
 * @example
 * return success({ products: [...] }, '조회 완료');
 * return success(undefined, '저장되었습니다');
 * return success(); // { success: true }
 */
export function success<T>(data?: T, message?: string): SuccessResponse<T> {
  const response: SuccessResponse<T> = { success: true };
  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  return response;
}

/**
 * 실패 응답 생성
 *
 * @example
 * return error('잘못된 요청입니다', 'BAD_REQUEST');
 * return error('서버 오류가 발생했습니다');
 */
export function error(message: string, code?: string): ErrorResponse {
  const response: ErrorResponse = { success: false, error: message };
  if (code) response.code = code;
  return response;
}

/**
 * 일괄 처리 응답 생성
 *
 * @example
 * return bulkResponse({
 *   total: 100,
 *   success: 95,
 *   failed: 5,
 *   errors: ['주문 123: 재고 부족']
 * });
 */
export function bulkResponse<T>(params: {
  total: number;
  success: number;
  failed: number;
  data?: T;
  errors?: string[];
  message?: string;
}): BulkResponse<T> {
  const { total, success: successCnt, failed, data, errors, message } = params;

  return {
    success: failed === 0,
    totalCount: total,
    successCount: successCnt,
    failedCount: failed,
    data,
    errors: errors && errors.length > 0 ? errors : undefined,
    message: message || (failed === 0
      ? `${successCnt}개 처리 완료`
      : `${successCnt}개 성공, ${failed}개 실패`),
  };
}

// ===== 에러 코드 상수 =====

export const ErrorCodes = {
  // 일반 에러
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // 비즈니스 로직 에러
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  ALREADY_PROCESSED: "ALREADY_PROCESSED",

  // 외부 서비스 에러
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ===== 타입 가드 =====

/**
 * 응답이 성공인지 확인
 */
export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * 응답이 실패인지 확인
 */
export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
  return response.success === false;
}

// ===== 메시지 포맷터 =====

/**
 * 일괄 처리 결과 메시지 생성
 *
 * @example
 * formatBulkMessage(10, 8, 2) // '10개 중 8개 성공, 2개 실패'
 * formatBulkMessage(10, 10, 0) // '10개 처리 완료'
 */
export function formatBulkMessage(
  total: number,
  successCount: number,
  failedCount: number
): string {
  if (failedCount === 0) {
    return `${successCount}개 처리 완료`;
  }
  return `${total}개 중 ${successCount}개 성공, ${failedCount}개 실패`;
}
