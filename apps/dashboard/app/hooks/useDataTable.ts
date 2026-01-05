/**
 * 테이블 상태 관리 훅
 *
 * 정렬, 선택, 확장 상태를 통합 관리합니다.
 *
 * @example
 * ```tsx
 * const {
 *   sortKey, sortOrder, handleSort,
 *   selectedItems, handleSelectAll, handleSelectOne, clearSelection,
 *   expandedRows, toggleRowExpand,
 * } = useDataTable<"sku" | "product_name" | "current_stock">({
 *   items: inventory,
 *   getItemId: (item) => item.id,
 * });
 * ```
 */
import { useState, useCallback, useMemo } from "react";

export type SortOrder = "asc" | "desc";

export interface UseDataTableOptions<TItem, TSortKey extends string = string> {
  /** 테이블에 표시할 아이템 배열 */
  items: TItem[];
  /** 아이템의 고유 ID를 반환하는 함수 */
  getItemId: (item: TItem) => string;
  /** 초기 정렬 키 */
  initialSortKey?: TSortKey | null;
  /** 초기 정렬 순서 */
  initialSortOrder?: SortOrder;
  /** 초기 선택된 아이템 ID 목록 */
  initialSelectedIds?: string[];
  /** 초기 확장된 행 ID 목록 */
  initialExpandedIds?: string[];
}

export interface UseDataTableReturn<TSortKey extends string = string> {
  /** 현재 정렬 키 */
  sortKey: TSortKey | null;
  /** 현재 정렬 순서 */
  sortOrder: SortOrder;
  /** 정렬 핸들러 - 같은 키를 클릭하면 순서 토글, 다른 키면 asc로 시작 */
  handleSort: (key: TSortKey) => void;
  /** 정렬 상태 초기화 */
  resetSort: () => void;

  /** 선택된 아이템 ID Set */
  selectedItems: Set<string>;
  /** 전체 선택/해제 핸들러 */
  handleSelectAll: (checked: boolean) => void;
  /** 개별 아이템 선택/해제 핸들러 */
  handleSelectOne: (id: string, checked: boolean) => void;
  /** 선택 상태 초기화 */
  clearSelection: () => void;
  /** 전체 선택 여부 */
  isAllSelected: boolean;
  /** 일부 선택 여부 (indeterminate) */
  isSomeSelected: boolean;
  /** 선택된 아이템 수 */
  selectedCount: number;

  /** 확장된 행 ID Set */
  expandedRows: Set<string>;
  /** 행 확장/축소 토글 */
  toggleRowExpand: (id: string) => void;
  /** 행이 확장되었는지 확인 */
  isRowExpanded: (id: string) => boolean;
  /** 모든 행 축소 */
  collapseAll: () => void;
  /** 모든 행 확장 */
  expandAll: () => void;
}

export function useDataTable<TItem, TSortKey extends string = string>({
  items,
  getItemId,
  initialSortKey = null,
  initialSortOrder = "asc",
  initialSelectedIds = [],
  initialExpandedIds = [],
}: UseDataTableOptions<TItem, TSortKey>): UseDataTableReturn<TSortKey> {
  // 정렬 상태
  const [sortKey, setSortKey] = useState<TSortKey | null>(initialSortKey);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  // 선택 상태
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );

  // 확장 상태
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    () => new Set(initialExpandedIds)
  );

  // 정렬 핸들러
  const handleSort = useCallback((key: TSortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortOrder("asc");
      return key;
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortKey(initialSortKey);
    setSortOrder(initialSortOrder);
  }, [initialSortKey, initialSortOrder]);

  // 선택 핸들러
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedItems(new Set(items.map(getItemId)));
      } else {
        setSelectedItems(new Set());
      }
    },
    [items, getItemId]
  );

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // 선택 상태 계산
  const isAllSelected = useMemo(
    () => items.length > 0 && selectedItems.size === items.length,
    [items.length, selectedItems.size]
  );

  const isSomeSelected = useMemo(
    () => selectedItems.size > 0 && selectedItems.size < items.length,
    [selectedItems.size, items.length]
  );

  const selectedCount = selectedItems.size;

  // 확장 핸들러
  const toggleRowExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const isRowExpanded = useCallback(
    (id: string) => expandedRows.has(id),
    [expandedRows]
  );

  const collapseAll = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpandedRows(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  return {
    // 정렬
    sortKey,
    sortOrder,
    handleSort,
    resetSort,

    // 선택
    selectedItems,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    selectedCount,

    // 확장
    expandedRows,
    toggleRowExpand,
    isRowExpanded,
    collapseAll,
    expandAll,
  };
}

export default useDataTable;
