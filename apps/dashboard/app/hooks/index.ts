/**
 * 공통 훅 모음
 *
 * @example
 * ```tsx
 * import { useDataTable, useSearchParams, useBulkAction } from "~/hooks";
 * ```
 */

// 테이블 상태 관리 훅
export {
  useDataTable,
  type SortOrder,
  type UseDataTableOptions,
  type UseDataTableReturn,
} from "./useDataTable";

// URL 파라미터 관리 훅
export {
  useSearchParams,
  buildUrlWithParams,
  type FilterValue,
  type UseSearchParamsOptions,
  type UseSearchParamsReturn,
} from "./useSearchParams";

// 대량 선택/처리 훅
export {
  useBulkAction,
  BulkActionPresets,
  type BulkActionConfirmDialog,
  type UseBulkActionOptions,
  type UseBulkActionReturn,
} from "./useBulkAction";
