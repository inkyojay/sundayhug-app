/**
 * Safe JSON parsing utilities
 *
 * JSON.parse() 호출 시 crash를 방지하기 위한 안전한 파싱 유틸리티
 */

/**
 * 안전한 JSON 파싱 - 실패 시 기본값 반환
 *
 * @param jsonString - 파싱할 JSON 문자열
 * @param defaultValue - 파싱 실패 시 반환할 기본값
 * @returns 파싱된 객체 또는 기본값
 *
 * @example
 * const data = safeJsonParse<string[]>(formData.get("ids"), []);
 * const changes = safeJsonParse<Record<string, any>>(formData.get("changes"), {});
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  defaultValue: T
): T {
  if (!jsonString || typeof jsonString !== "string") {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn("[safeJsonParse] Failed to parse JSON:", error);
    return defaultValue;
  }
}

/**
 * 안전한 JSON 파싱 - 실패 시 에러 정보 반환
 *
 * @param jsonString - 파싱할 JSON 문자열
 * @returns 성공 시 { success: true, data }, 실패 시 { success: false, error }
 *
 * @example
 * const result = safeJsonParseWithError<{ name: string }>(input);
 * if (!result.success) {
 *   return { error: `Invalid JSON: ${result.error}` };
 * }
 * const { data } = result;
 */
export function safeJsonParseWithError<T>(
  jsonString: string | null | undefined
): { success: true; data: T } | { success: false; error: string } {
  if (!jsonString || typeof jsonString !== "string") {
    return {
      success: false,
      error: "Input is empty or not a string",
    };
  }

  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown parsing error",
    };
  }
}

/**
 * FormData에서 JSON 필드를 안전하게 파싱
 *
 * @param formData - FormData 객체
 * @param fieldName - 파싱할 필드명
 * @param defaultValue - 파싱 실패 시 반환할 기본값
 * @returns 파싱된 객체 또는 기본값
 *
 * @example
 * const ids = parseFormDataJson<string[]>(formData, "ids", []);
 * const changes = parseFormDataJson<Record<string, any>>(formData, "changes", {});
 */
export function parseFormDataJson<T>(
  formData: FormData,
  fieldName: string,
  defaultValue: T
): T {
  const value = formData.get(fieldName);
  if (value === null || typeof value !== "string") {
    return defaultValue;
  }
  return safeJsonParse<T>(value, defaultValue);
}
