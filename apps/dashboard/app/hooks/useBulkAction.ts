/**
 * 대량 선택/처리 훅
 *
 * 아이템 선택, 일괄 처리 상태, 확인 다이얼로그를 관리합니다.
 *
 * @example
 * ```tsx
 * const {
 *   selectedItems,
 *   handleSelectAll,
 *   handleSelectOne,
 *   clearSelection,
 *   isProcessing,
 *   confirmDialog,
 *   openConfirmDialog,
 *   closeConfirmDialog,
 *   executeAction,
 * } = useBulkAction<Order>({
 *   items: orders,
 *   getItemId: (order) => order.key,
 *   onAction: async (action, selectedIds) => {
 *     await fetcher.submit({ actionType: action, ids: JSON.stringify(selectedIds) }, { method: "POST" });
 *   },
 * });
 * ```
 */
import { useState, useCallback, useMemo } from "react";

export interface BulkActionConfirmDialog {
  /** 다이얼로그 열림 상태 */
  open: boolean;
  /** 실행할 액션 타입 */
  action: string | null;
  /** 다이얼로그 제목 */
  title: string;
  /** 다이얼로그 설명 */
  description: string;
  /** 확인 버튼 텍스트 */
  confirmText: string;
  /** 위험한 액션 여부 (삭제 등) */
  destructive: boolean;
}

export interface UseBulkActionOptions<TItem> {
  /** 테이블에 표시할 아이템 배열 */
  items: TItem[];
  /** 아이템의 고유 ID를 반환하는 함수 */
  getItemId: (item: TItem) => string;
  /** 액션 실행 함수 */
  onAction?: (action: string, selectedIds: string[], selectedItems: TItem[]) => Promise<void> | void;
  /** 액션 실행 후 선택 초기화 여부 (기본값: true) */
  clearAfterAction?: boolean;
}

export interface UseBulkActionReturn<TItem> {
  /** 선택된 아이템 ID Set */
  selectedItems: Set<string>;
  /** 선택된 아이템 객체 배열 */
  selectedItemsData: TItem[];
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
  /** 선택된 아이템이 있는지 여부 */
  hasSelection: boolean;

  /** 처리 중 상태 */
  isProcessing: boolean;
  /** 처리 중 상태 설정 */
  setIsProcessing: (processing: boolean) => void;

  /** 확인 다이얼로그 상태 */
  confirmDialog: BulkActionConfirmDialog;
  /** 확인 다이얼로그 열기 */
  openConfirmDialog: (options: {
    action: string;
    title: string;
    description: string;
    confirmText?: string;
    destructive?: boolean;
  }) => void;
  /** 확인 다이얼로그 닫기 */
  closeConfirmDialog: () => void;
  /** 액션 실행 (다이얼로그 없이 직접 실행) */
  executeAction: (action: string) => Promise<void>;
  /** 다이얼로그에서 확인 후 액션 실행 */
  confirmAndExecute: () => Promise<void>;
}

const initialDialogState: BulkActionConfirmDialog = {
  open: false,
  action: null,
  title: "",
  description: "",
  confirmText: "확인",
  destructive: false,
};

export function useBulkAction<TItem>({
  items,
  getItemId,
  onAction,
  clearAfterAction = true,
}: UseBulkActionOptions<TItem>): UseBulkActionReturn<TItem> {
  // 선택 상태
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 처리 중 상태
  const [isProcessing, setIsProcessing] = useState(false);

  // 확인 다이얼로그 상태
  const [confirmDialog, setConfirmDialog] = useState<BulkActionConfirmDialog>(initialDialogState);

  // 선택된 아이템 데이터
  const selectedItemsData = useMemo(
    () => items.filter((item) => selectedItems.has(getItemId(item))),
    [items, selectedItems, getItemId]
  );

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
  const hasSelection = selectedCount > 0;

  // 다이얼로그 핸들러
  const openConfirmDialog = useCallback(
    ({
      action,
      title,
      description,
      confirmText = "확인",
      destructive = false,
    }: {
      action: string;
      title: string;
      description: string;
      confirmText?: string;
      destructive?: boolean;
    }) => {
      setConfirmDialog({
        open: true,
        action,
        title,
        description,
        confirmText,
        destructive,
      });
    },
    []
  );

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(initialDialogState);
  }, []);

  // 액션 실행
  const executeAction = useCallback(
    async (action: string) => {
      if (!onAction || selectedItems.size === 0) return;

      setIsProcessing(true);
      try {
        await onAction(action, Array.from(selectedItems), selectedItemsData);
        if (clearAfterAction) {
          clearSelection();
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [onAction, selectedItems, selectedItemsData, clearAfterAction, clearSelection]
  );

  // 다이얼로그에서 확인 후 액션 실행
  const confirmAndExecute = useCallback(async () => {
    if (!confirmDialog.action) return;

    await executeAction(confirmDialog.action);
    closeConfirmDialog();
  }, [confirmDialog.action, executeAction, closeConfirmDialog]);

  return {
    // 선택
    selectedItems,
    selectedItemsData,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    selectedCount,
    hasSelection,

    // 처리
    isProcessing,
    setIsProcessing,

    // 다이얼로그
    confirmDialog,
    openConfirmDialog,
    closeConfirmDialog,
    executeAction,
    confirmAndExecute,
  };
}

/**
 * 일괄 액션 헬퍼 - 자주 사용되는 다이얼로그 설정
 */
export const BulkActionPresets = {
  delete: (count: number) => ({
    action: "delete",
    title: "삭제 확인",
    description: `선택한 ${count}개 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    confirmText: "삭제",
    destructive: true,
  }),

  updateStatus: (count: number, statusLabel: string) => ({
    action: "updateStatus",
    title: "상태 변경",
    description: `선택한 ${count}개 항목의 상태를 '${statusLabel}'(으)로 변경하시겠습니까?`,
    confirmText: "변경",
    destructive: false,
  }),

  export: (count: number) => ({
    action: "export",
    title: "내보내기",
    description: `선택한 ${count}개 항목을 내보내시겠습니까?`,
    confirmText: "내보내기",
    destructive: false,
  }),

  bulkEdit: (count: number, fieldLabel: string) => ({
    action: "bulkEdit",
    title: "일괄 수정",
    description: `선택한 ${count}개 항목의 ${fieldLabel}을(를) 일괄 수정하시겠습니까?`,
    confirmText: "수정",
    destructive: false,
  }),
};

export default useBulkAction;
