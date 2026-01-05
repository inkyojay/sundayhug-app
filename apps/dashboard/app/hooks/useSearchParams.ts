/**
 * URL 파라미터 관리 훅
 *
 * URL 파라미터와 상태를 동기화하고 URL 빌더 함수를 제공합니다.
 *
 * @example
 * ```tsx
 * const { buildUrl, navigate, filters, updateFilter } = useSearchParams({
 *   basePath: "/dashboard/inventory",
 *   defaultValues: {
 *     search: "",
 *     stockFilter: "all",
 *     page: "1",
 *     limit: "100",
 *   },
 *   loaderData: {
 *     search: loaderData.search,
 *     stockFilter: loaderData.filters.stockFilter,
 *     page: String(loaderData.currentPage),
 *     limit: String(loaderData.limit),
 *   },
 * });
 *
 * // URL 생성
 * const url = buildUrl({ search: "SKU123", page: "1" });
 *
 * // 네비게이션
 * navigate({ search: "SKU123" });
 * ```
 */
import { useCallback, useMemo } from "react";

export type FilterValue = string | null | undefined;

export interface UseSearchParamsOptions<TFilters extends Record<string, FilterValue>> {
  /** 기본 경로 (예: "/dashboard/inventory") */
  basePath: string;
  /** 기본값 (URL에서 생략될 값) */
  defaultValues: Record<keyof TFilters, string>;
  /** 현재 loader에서 가져온 값 */
  loaderData: TFilters;
  /** 파라미터 이름 매핑 (선택적) - loaderData 키와 URL 파라미터 이름이 다를 때 사용 */
  paramMapping?: Partial<Record<keyof TFilters, string>>;
}

export interface UseSearchParamsReturn<TFilters extends Record<string, FilterValue>> {
  /** 현재 필터 값 */
  filters: TFilters;
  /** URL 빌드 함수 - 현재 값을 유지하면서 일부만 오버라이드 */
  buildUrl: (overrides?: Partial<Record<keyof TFilters | "page", FilterValue>>) => string;
  /** 브라우저 네비게이션 함수 */
  navigate: (overrides?: Partial<Record<keyof TFilters | "page", FilterValue>>) => void;
  /** 개별 필터 업데이트 함수 */
  updateFilter: (key: keyof TFilters, value: FilterValue) => void;
  /** 모든 필터 초기화 */
  resetFilters: () => void;
  /** 활성 필터가 있는지 여부 */
  hasActiveFilters: boolean;
  /** 활성 필터 목록 (기본값과 다른 것들) */
  activeFilters: Array<{ key: keyof TFilters; value: string }>;
}

export function useSearchParams<TFilters extends Record<string, FilterValue>>({
  basePath,
  defaultValues,
  loaderData,
  paramMapping = {},
}: UseSearchParamsOptions<TFilters>): UseSearchParamsReturn<TFilters> {
  // URL 빌드 함수
  const buildUrl = useCallback(
    (overrides: Partial<Record<keyof TFilters | "page", FilterValue>> = {}) => {
      const params = new URLSearchParams();

      // loaderData의 각 키에 대해 처리
      const allKeys = Object.keys(defaultValues) as Array<keyof TFilters>;

      for (const key of allKeys) {
        // override가 있으면 그 값을, 없으면 loaderData 값을 사용
        const value = key in overrides ? overrides[key] : loaderData[key];

        // URL 파라미터 이름 결정 (매핑이 있으면 매핑된 이름 사용)
        const paramName = (paramMapping[key] as string) || (key as string);

        // 기본값이 아닌 경우에만 URL에 포함
        const defaultValue = defaultValues[key];

        if (value && value !== defaultValue && value !== "all" && value !== "none") {
          params.set(paramName, value);
        }
      }

      // page 파라미터 처리 (특별 케이스)
      if ("page" in overrides && overrides.page && overrides.page !== "1") {
        params.set("page", overrides.page);
      }

      const queryString = params.toString();
      return `${basePath}${queryString ? `?${queryString}` : ""}`;
    },
    [basePath, defaultValues, loaderData, paramMapping]
  );

  // 네비게이션 함수
  const navigate = useCallback(
    (overrides?: Partial<Record<keyof TFilters | "page", FilterValue>>) => {
      window.location.href = buildUrl(overrides);
    },
    [buildUrl]
  );

  // 개별 필터 업데이트
  const updateFilter = useCallback(
    (key: keyof TFilters, value: FilterValue) => {
      // 필터 변경 시 페이지를 1로 리셋
      navigate({ [key]: value, page: "1" } as Partial<Record<keyof TFilters | "page", FilterValue>>);
    },
    [navigate]
  );

  // 필터 리셋
  const resetFilters = useCallback(() => {
    window.location.href = basePath;
  }, [basePath]);

  // 활성 필터 계산
  const activeFilters = useMemo(() => {
    const active: Array<{ key: keyof TFilters; value: string }> = [];

    for (const key of Object.keys(defaultValues) as Array<keyof TFilters>) {
      const value = loaderData[key];
      const defaultValue = defaultValues[key];

      if (value && value !== defaultValue && value !== "all" && value !== "none") {
        active.push({ key, value: value as string });
      }
    }

    return active;
  }, [defaultValues, loaderData]);

  const hasActiveFilters = activeFilters.length > 0;

  return {
    filters: loaderData,
    buildUrl,
    navigate,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    activeFilters,
  };
}

/**
 * URL 빌더 유틸리티 함수
 *
 * 클래스 컴포넌트나 훅 외부에서 사용할 수 있는 순수 함수
 *
 * @example
 * ```ts
 * const url = buildUrlWithParams("/dashboard/orders", {
 *   status: "pending",
 *   shop: "cafe24",
 * }, {
 *   status: currentStatus,
 *   shop: currentShop,
 * }, {
 *   status: "all",
 *   shop: "all",
 * });
 * ```
 */
export function buildUrlWithParams<T extends Record<string, FilterValue>>(
  basePath: string,
  overrides: Partial<T>,
  currentValues: T,
  defaultValues: Partial<T> = {}
): string {
  const params = new URLSearchParams();

  const allKeys = new Set([...Object.keys(currentValues), ...Object.keys(overrides)]);

  for (const key of allKeys) {
    const value = key in overrides ? overrides[key as keyof T] : currentValues[key as keyof T];
    const defaultValue = defaultValues[key as keyof T];

    if (value && value !== defaultValue && value !== "all" && value !== "none") {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

export default useSearchParams;
