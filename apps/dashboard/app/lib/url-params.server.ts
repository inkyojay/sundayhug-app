/**
 * URL 파라미터 처리 서버 유틸리티
 *
 * URL 쿼리 파라미터를 파싱하고 빌드하는 헬퍼 함수들
 */

/**
 * URL 파라미터 값 타입
 */
export type UrlParamValue = string | number | boolean | null | undefined;

/**
 * URL 파라미터 맵 타입
 */
export type UrlParamsMap = Record<string, UrlParamValue>;

/**
 * 기본값 정의 인터페이스
 */
export interface ParamDefault<T> {
  key: string;
  defaultValue: T;
  transform?: (value: string) => T;
}

/**
 * URL 빌더 유틸리티
 *
 * 현재 파라미터를 유지하면서 특정 파라미터만 변경하여 URL을 생성합니다.
 * null 값은 해당 파라미터를 제거합니다.
 *
 * @param basePath - 기본 경로 (예: "/dashboard/orders")
 * @param currentParams - 현재 파라미터 객체
 * @param overrides - 변경할 파라미터 객체 (null이면 제거)
 * @param options - 추가 옵션
 * @returns 빌드된 URL 문자열
 *
 * @example
 * ```ts
 * const url = buildUrlWithParams(
 *   '/dashboard/orders',
 *   { status: 'pending', page: '2', limit: '50' },
 *   { status: 'completed', page: null }
 * );
 * // '/dashboard/orders?status=completed&limit=50'
 * ```
 */
export function buildUrlWithParams(
  basePath: string,
  currentParams: UrlParamsMap,
  overrides: UrlParamsMap = {},
  options?: {
    /** 기본값과 같으면 제외할 파라미터와 기본값 */
    excludeDefaults?: Record<string, UrlParamValue>;
    /** 항상 제외할 값들 (예: 'all', 'none') */
    excludeValues?: UrlParamValue[];
  }
): string {
  const params = new URLSearchParams();

  // 현재 파라미터와 오버라이드 병합
  const merged: UrlParamsMap = { ...currentParams };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    merged[key] = value;
  }

  // 파라미터 설정
  for (const [key, value] of Object.entries(merged)) {
    // null, undefined, 빈 문자열 제외
    if (value === null || value === undefined || value === "") continue;

    const stringValue = String(value);

    // 제외할 값 체크
    if (options?.excludeValues?.includes(stringValue)) continue;
    if (options?.excludeValues?.includes(value)) continue;

    // 기본값과 같으면 제외
    if (options?.excludeDefaults && key in options.excludeDefaults) {
      if (options.excludeDefaults[key] === value) continue;
      if (String(options.excludeDefaults[key]) === stringValue) continue;
    }

    params.set(key, stringValue);
  }

  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

/**
 * URL에서 검색 파라미터 파싱
 *
 * 스키마 기반으로 URL 파라미터를 파싱하고 타입 변환합니다.
 *
 * @param url - URL 객체
 * @param schema - 파라미터 스키마 (키: 기본값)
 * @returns 파싱된 파라미터 객체
 *
 * @example
 * ```ts
 * const params = parseSearchParams(url, {
 *   search: '',
 *   status: 'all',
 *   page: 1,
 *   limit: 50,
 * });
 * ```
 */
export function parseSearchParams<T extends Record<string, string | number | boolean>>(
  url: URL,
  schema: T
): T {
  const result = { ...schema };

  for (const key of Object.keys(schema) as Array<keyof T>) {
    const paramValue = url.searchParams.get(key as string);

    if (paramValue === null) continue;

    const defaultValue = schema[key];
    const type = typeof defaultValue;

    if (type === "number") {
      const parsed = parseInt(paramValue);
      if (!isNaN(parsed)) {
        (result as any)[key] = parsed;
      }
    } else if (type === "boolean") {
      (result as any)[key] = paramValue === "true" || paramValue === "1";
    } else {
      (result as any)[key] = paramValue;
    }
  }

  return result;
}

/**
 * 고급 파라미터 파싱 (변환 함수 지원)
 *
 * @param url - URL 객체
 * @param definitions - 파라미터 정의 배열
 * @returns 파싱된 파라미터 객체
 *
 * @example
 * ```ts
 * const params = parseSearchParamsAdvanced(url, [
 *   { key: 'search', defaultValue: '' },
 *   { key: 'status', defaultValue: 'all' },
 *   { key: 'page', defaultValue: 1, transform: (v) => Math.max(1, parseInt(v)) },
 *   { key: 'dateFrom', defaultValue: null, transform: (v) => v || null },
 * ]);
 * ```
 */
export function parseSearchParamsAdvanced<T extends Record<string, any>>(
  url: URL,
  definitions: ParamDefault<any>[]
): T {
  const result: Record<string, any> = {};

  for (const def of definitions) {
    const paramValue = url.searchParams.get(def.key);

    if (paramValue === null || paramValue === "") {
      result[def.key] = def.defaultValue;
      continue;
    }

    if (def.transform) {
      result[def.key] = def.transform(paramValue);
    } else {
      const type = typeof def.defaultValue;
      if (type === "number") {
        const parsed = parseInt(paramValue);
        result[def.key] = isNaN(parsed) ? def.defaultValue : parsed;
      } else if (type === "boolean") {
        result[def.key] = paramValue === "true" || paramValue === "1";
      } else {
        result[def.key] = paramValue;
      }
    }
  }

  return result as T;
}

/**
 * URL 파라미터를 객체로 변환
 *
 * @param url - URL 객체
 * @returns 파라미터 객체
 */
export function urlSearchParamsToObject(url: URL): Record<string, string> {
  const result: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * 필터 URL 빌더 팩토리
 *
 * 특정 페이지에 대한 URL 빌더 함수를 생성합니다.
 *
 * @param basePath - 기본 경로
 * @param defaultParams - 기본 파라미터
 * @param excludeDefaults - 기본값과 같으면 제외할 파라미터
 * @returns URL 빌더 함수
 *
 * @example
 * ```ts
 * const buildOrderUrl = createUrlBuilder(
 *   '/dashboard/orders',
 *   { status: 'all', page: '1', limit: '50' },
 *   { page: '1', limit: '50' }
 * );
 *
 * // 사용
 * const url = buildOrderUrl(currentParams, { status: 'completed' });
 * ```
 */
export function createUrlBuilder(
  basePath: string,
  defaultParams: UrlParamsMap,
  excludeDefaults?: Record<string, UrlParamValue>
) {
  return (
    currentParams: UrlParamsMap,
    overrides: UrlParamsMap = {}
  ): string => {
    return buildUrlWithParams(basePath, currentParams, overrides, {
      excludeDefaults,
      excludeValues: ["all", "none", ""],
    });
  };
}

/**
 * 날짜 범위 파라미터 파싱
 *
 * @param url - URL 객체
 * @param fromKey - 시작일 파라미터 키 (기본: 'dateFrom')
 * @param toKey - 종료일 파라미터 키 (기본: 'dateTo')
 * @returns 날짜 범위 객체
 */
export function parseDateRangeParams(
  url: URL,
  fromKey: string = "dateFrom",
  toKey: string = "dateTo"
): { from: string | null; to: string | null } {
  return {
    from: url.searchParams.get(fromKey) || null,
    to: url.searchParams.get(toKey) || null,
  };
}

/**
 * 정렬 파라미터 파싱
 *
 * @param url - URL 객체
 * @param sortByKey - 정렬 기준 파라미터 키 (기본: 'sortBy')
 * @param sortOrderKey - 정렬 순서 파라미터 키 (기본: 'sortOrder')
 * @param defaults - 기본값
 * @returns 정렬 파라미터 객체
 */
export function parseSortParams(
  url: URL,
  sortByKey: string = "sortBy",
  sortOrderKey: string = "sortOrder",
  defaults?: { sortBy?: string; sortOrder?: "asc" | "desc" }
): { sortBy: string | null; sortOrder: "asc" | "desc" } {
  const sortBy = url.searchParams.get(sortByKey) || defaults?.sortBy || null;
  const sortOrderParam = url.searchParams.get(sortOrderKey);
  const sortOrder: "asc" | "desc" =
    sortOrderParam === "desc" ? "desc" : sortOrderParam === "asc" ? "asc" : defaults?.sortOrder || "asc";

  return { sortBy, sortOrder };
}
