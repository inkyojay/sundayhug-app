/**
 * 쿼리 파라미터 파싱 유틸리티
 *
 * URL 쿼리 파라미터를 일관되게 파싱하고 처리하기 위한 공통 유틸리티
 */

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * 정렬 파라미터
 */
export interface SortParams {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * 날짜 범위 파라미터
 */
export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

/**
 * 기본 쿼리 파라미터 (페이지네이션 + 정렬)
 */
export interface BaseQueryParams extends PaginationParams, SortParams {
  search: string;
}

// ===== 파싱 함수 =====

/**
 * 문자열 파라미터 가져오기
 *
 * @param url - URL 객체 또는 URLSearchParams
 * @param key - 파라미터 키
 * @param defaultValue - 기본값
 */
export function getString(
  url: URL | URLSearchParams,
  key: string,
  defaultValue: string = ""
): string {
  const params = url instanceof URL ? url.searchParams : url;
  return params.get(key) || defaultValue;
}

/**
 * 숫자 파라미터 가져오기
 *
 * @param url - URL 객체 또는 URLSearchParams
 * @param key - 파라미터 키
 * @param defaultValue - 기본값
 * @param min - 최소값 (선택)
 * @param max - 최대값 (선택)
 */
export function getNumber(
  url: URL | URLSearchParams,
  key: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const params = url instanceof URL ? url.searchParams : url;
  const value = params.get(key);

  if (!value) return defaultValue;

  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;

  let result = num;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;

  return result;
}

/**
 * 불리언 파라미터 가져오기
 *
 * @param url - URL 객체 또는 URLSearchParams
 * @param key - 파라미터 키
 * @param defaultValue - 기본값
 */
export function getBoolean(
  url: URL | URLSearchParams,
  key: string,
  defaultValue: boolean = false
): boolean {
  const params = url instanceof URL ? url.searchParams : url;
  const value = params.get(key);

  if (value === null) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * 페이지네이션 파라미터 파싱
 *
 * @param url - URL 객체
 * @param defaults - 기본값 (page: 1, limit: 50)
 */
export function getPaginationParams(
  url: URL,
  defaults: Partial<PaginationParams> = {}
): PaginationParams {
  const { page: defaultPage = 1, limit: defaultLimit = 50 } = defaults;

  return {
    page: getNumber(url, "page", defaultPage, 1),
    limit: getNumber(url, "limit", defaultLimit, 1, 500),
  };
}

/**
 * 정렬 파라미터 파싱
 *
 * @param url - URL 객체
 * @param defaults - 기본값 (sortBy, sortOrder)
 */
export function getSortParams(
  url: URL,
  defaults: Partial<SortParams> = {}
): SortParams {
  const { sortBy: defaultSortBy = "created_at", sortOrder: defaultSortOrder = "desc" } = defaults;

  const sortBy = getString(url, "sortBy", defaultSortBy);
  const sortOrderRaw = getString(url, "sortOrder", defaultSortOrder);
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  return { sortBy, sortOrder };
}

/**
 * 날짜 범위 파라미터 파싱
 *
 * @param url - URL 객체
 */
export function getDateRangeParams(url: URL): DateRangeParams {
  return {
    dateFrom: getString(url, "dateFrom", ""),
    dateTo: getString(url, "dateTo", ""),
  };
}

/**
 * 기본 쿼리 파라미터 파싱 (페이지네이션 + 정렬 + 검색)
 *
 * @param url - URL 객체
 * @param defaults - 기본값
 *
 * @example
 * const params = parseBaseQueryParams(new URL(request.url), {
 *   sortBy: 'created_at',
 *   limit: 20
 * });
 */
export function parseBaseQueryParams(
  url: URL,
  defaults: Partial<BaseQueryParams> = {}
): BaseQueryParams {
  return {
    ...getPaginationParams(url, defaults),
    ...getSortParams(url, defaults),
    search: getString(url, "q", defaults.search || ""),
  };
}

// ===== URL 빌더 =====

/**
 * URL 파라미터 빌더 옵션
 */
export interface UrlBuilderOptions {
  /** 기본값과 같은 값은 제외 */
  excludeDefaults?: boolean;
  /** 빈 문자열 제외 */
  excludeEmpty?: boolean;
  /** 제외할 키 목록 */
  excludeKeys?: string[];
}

/**
 * 쿼리 파라미터로 URL 생성
 *
 * @param basePath - 기본 경로
 * @param params - 파라미터 객체
 * @param defaults - 기본값 (이 값과 같으면 URL에서 제외)
 * @param options - 빌더 옵션
 *
 * @example
 * const url = buildUrl('/dashboard/orders', {
 *   page: 1,
 *   status: 'paid',
 *   search: ''
 * }, {
 *   page: 1  // page=1은 URL에서 제외
 * });
 * // => '/dashboard/orders?status=paid'
 */
export function buildUrl(
  basePath: string,
  params: Record<string, string | number | boolean | null | undefined>,
  defaults: Record<string, string | number | boolean | null | undefined> = {},
  options: UrlBuilderOptions = {}
): string {
  const {
    excludeDefaults = true,
    excludeEmpty = true,
    excludeKeys = [],
  } = options;

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    // 제외 대상 확인
    if (excludeKeys.includes(key)) return;
    if (value === null || value === undefined) return;
    if (excludeEmpty && value === "") return;
    if (excludeDefaults && defaults[key] !== undefined && value === defaults[key]) return;

    // 특수 값 처리
    if (value === "all") return;

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

// ===== 날짜 프리셋 =====

/**
 * 날짜 프리셋 생성 (오늘 기준)
 *
 * @param days - 며칠 전부터 오늘까지
 * @returns { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 *
 * @example
 * getDatePreset(7);  // 최근 7일
 * getDatePreset(30); // 최근 30일
 */
export function getDatePreset(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

/**
 * 이번 달 날짜 범위
 */
export function getThisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

/**
 * 지난 달 날짜 범위
 */
export function getLastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}
