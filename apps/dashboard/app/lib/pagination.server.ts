/**
 * 페이지네이션 서버 유틸리티
 *
 * Supabase 쿼리와 함께 사용할 수 있는 페이지네이션 헬퍼 함수들
 */

import type { SupabaseClient, PostgrestFilterBuilder } from "@supabase/supabase-js";

/**
 * 페이지네이션 파라미터 타입
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * 페이지네이션 결과 타입
 */
export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * 페이지네이션 기본값
 */
export interface PaginationDefaults {
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

/**
 * URL에서 페이지네이션 파라미터 파싱
 *
 * @param url - 파싱할 URL 객체
 * @param defaults - 기본값 (선택적)
 * @returns 페이지네이션 파라미터 객체
 *
 * @example
 * ```ts
 * const url = new URL(request.url);
 * const params = parsePaginationParams(url, { page: 1, limit: 20 });
 * // { page: 1, limit: 20, offset: 0 }
 * ```
 */
export function parsePaginationParams(
  url: URL,
  defaults?: PaginationDefaults
): PaginationParams {
  const defaultPage = defaults?.page ?? DEFAULT_PAGE;
  const defaultLimit = defaults?.limit ?? DEFAULT_LIMIT;

  const page = Math.max(1, parseInt(url.searchParams.get("page") || String(defaultPage)));
  const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get("limit") || String(defaultLimit))));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Supabase 쿼리에 페이지네이션 적용
 *
 * @param query - Supabase PostgrestFilterBuilder 쿼리
 * @param params - 페이지네이션 파라미터
 * @returns 페이지네이션이 적용된 쿼리
 *
 * @example
 * ```ts
 * let query = supabase.from('products').select('*');
 * query = applyPagination(query, { page: 2, limit: 20, offset: 20 });
 * ```
 */
export function applyPagination<T extends PostgrestFilterBuilder<any, any, any>>(
  query: T,
  params: PaginationParams
): T {
  return query.range(params.offset, params.offset + params.limit - 1) as T;
}

/**
 * 페이지네이션 결과 계산
 *
 * @param totalCount - 전체 레코드 수
 * @param params - 페이지네이션 파라미터
 * @returns 페이지네이션 결과 정보
 *
 * @example
 * ```ts
 * const result = calculatePagination(150, { page: 2, limit: 20, offset: 20 });
 * // { currentPage: 2, totalPages: 8, totalCount: 150, limit: 20, hasNextPage: true, hasPrevPage: true }
 * ```
 */
export function calculatePagination(
  totalCount: number,
  params: PaginationParams
): PaginationResult {
  const totalPages = Math.ceil(totalCount / params.limit) || 1;

  return {
    currentPage: params.page,
    totalPages,
    totalCount,
    limit: params.limit,
    hasNextPage: params.page < totalPages,
    hasPrevPage: params.page > 1,
  };
}

/**
 * 전체 개수와 함께 페이지네이션된 데이터 조회
 *
 * @param supabase - Supabase 클라이언트
 * @param table - 테이블 이름
 * @param selectColumns - 조회할 컬럼 (기본값: "*")
 * @param params - 페이지네이션 파라미터
 * @param buildQuery - 쿼리 빌더 함수 (필터, 정렬 등 적용)
 * @returns 데이터, 전체 개수, 페이지네이션 결과
 *
 * @example
 * ```ts
 * const result = await fetchPaginatedData(
 *   supabase,
 *   'products',
 *   'id, name, price',
 *   paginationParams,
 *   (query) => query.eq('status', 'active').order('created_at', { ascending: false })
 * );
 * ```
 */
export async function fetchPaginatedData<T>(
  supabase: SupabaseClient,
  table: string,
  selectColumns: string,
  params: PaginationParams,
  buildQuery?: (query: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
): Promise<{
  data: T[];
  totalCount: number;
  pagination: PaginationResult;
}> {
  // 데이터 쿼리
  let dataQuery = supabase.from(table).select(selectColumns);
  if (buildQuery) {
    dataQuery = buildQuery(dataQuery);
  }
  dataQuery = applyPagination(dataQuery, params);

  // 카운트 쿼리
  let countQuery = supabase.from(table).select("*", { count: "exact", head: true });
  if (buildQuery) {
    countQuery = buildQuery(countQuery);
  }

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  const data = (dataResult.data as T[]) || [];
  const totalCount = countResult.count || 0;
  const pagination = calculatePagination(totalCount, params);

  return { data, totalCount, pagination };
}
