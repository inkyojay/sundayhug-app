/**
 * 공통 서버 유틸리티 모듈
 *
 * 여러 피처에서 공통으로 사용되는 서버 유틸리티들을 제공합니다.
 */

// 페이지네이션 유틸리티
export {
  parsePaginationParams,
  applyPagination,
  calculatePagination,
  fetchPaginatedData,
  type PaginationParams,
  type PaginationResult,
  type PaginationDefaults,
} from "./pagination.server";

// CSV/Excel 내보내기 유틸리티
export {
  generateCSV,
  generateCSVFromObjects,
  createCSVResponse,
  createCSVResponseFromObjects,
  formatDateForCSV,
  formatDateTimeForCSV,
  formatCurrencyForCSV,
  type CSVColumnDef,
} from "./export.server";

// URL 파라미터 처리 유틸리티
export {
  buildUrlWithParams,
  parseSearchParams,
  parseSearchParamsAdvanced,
  urlSearchParamsToObject,
  createUrlBuilder,
  parseDateRangeParams,
  parseSortParams,
  type UrlParamValue,
  type UrlParamsMap,
  type ParamDefault,
} from "./url-params.server";
