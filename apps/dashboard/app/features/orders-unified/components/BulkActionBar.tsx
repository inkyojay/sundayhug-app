/**
 * 일괄 처리 액션 바 컴포넌트
 *
 * 선택된 주문에 대한 일괄 처리 버튼들
 * - 선택된 주문 개수 표시
 * - 일괄 상태 변경 (선택 후 확인)
 * - 일괄 송장 입력 버튼
 * - 일괄 송장 전송 버튼
 * - 일괄 삭제 버튼
 */
import { useFetcher } from "react-router";
import { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  PackageIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/core/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/core/components/ui/alert-dialog";

import { ORDER_STATUSES, type UnifiedOrder } from "../lib/orders-unified.shared";
import { InvoiceInputModal } from "./InvoiceInputModal";
import { InvoiceUploadModal } from "./InvoiceUploadModal";
import { DownloadOptionsModal } from "./DownloadOptionsModal";

interface BulkActionBarProps {
  selectedOrders: Set<string>;
  orders: UnifiedOrder[];
  onClearSelection: () => void;
  onActionComplete?: () => void;
}

export function BulkActionBar({
  selectedOrders,
  orders,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const fetcher = useFetcher();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // 선택된 상태 (아직 실행 안 됨)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [lastChangedStatus, setLastChangedStatus] = useState<string>("");

  const isProcessing = fetcher.state === "submitting";
  const selectedCount = selectedOrders.size;

  // 선택된 주문들만 필터링
  const selectedOrderList = orders.filter((o) => selectedOrders.has(o.key));

  if (selectedCount === 0) {
    return null;
  }

  // 상태 선택 (아직 실행하지 않음)
  const handleSelectStatus = (status: string) => {
    setSelectedStatus(status);
  };

  // 상태 변경 확인 다이얼로그 열기
  const handleOpenStatusConfirm = () => {
    if (!selectedStatus) return;
    setShowStatusConfirmDialog(true);
  };

  // 실제 상태 변경 실행
  const handleConfirmStatusChange = () => {
    if (!selectedStatus) return;

    fetcher.submit(
      {
        actionType: "bulkUpdateStatus",
        orderKeys: JSON.stringify(Array.from(selectedOrders)),
        newStatus: selectedStatus,
      },
      { method: "POST" }
    );

    setLastChangedStatus(selectedStatus);
    setShowStatusConfirmDialog(false);

    // "상품준비중"으로 변경 시 다운로드 모달 표시
    if (selectedStatus === "상품준비중") {
      setTimeout(() => {
        setShowDownloadModal(true);
      }, 500);
    }

    setSelectedStatus(null);
    onActionComplete?.();
  };

  const handleBulkDelete = () => {
    fetcher.submit(
      {
        actionType: "bulkDelete",
        orderKeys: JSON.stringify(Array.from(selectedOrders)),
      },
      { method: "POST" }
    );
    setShowDeleteDialog(false);
    onClearSelection();
    onActionComplete?.();
  };

  const handleBulkSendInvoice = () => {
    fetcher.submit(
      {
        actionType: "bulkSendInvoice",
        orderKeys: JSON.stringify(Array.from(selectedOrders)),
      },
      { method: "POST" }
    );
    onActionComplete?.();
  };

  // 상태 라벨 가져오기
  const getStatusLabel = (value: string) => {
    return ORDER_STATUSES.find((s) => s.value === value)?.label || value;
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
        {/* 선택된 주문 개수 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-800">
            {selectedCount}개 선택됨
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            onClick={onClearSelection}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-px bg-blue-200" />

        {/* 상태 변경: 드롭다운 + 확인 버튼 */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing}>
                {selectedStatus ? (
                  <span className="text-blue-600 font-medium">
                    {getStatusLabel(selectedStatus)}
                  </span>
                ) : (
                  "상태 선택"
                )}
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>변경할 상태 선택</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ORDER_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => handleSelectStatus(status.value)}
                  className={selectedStatus === status.value ? "bg-blue-50" : ""}
                >
                  {selectedStatus === status.value && (
                    <CheckIcon className="h-4 w-4 mr-2 text-blue-600" />
                  )}
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 상태 변경 실행 버튼 */}
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenStatusConfirm}
            disabled={!selectedStatus || isProcessing}
          >
            변경
          </Button>
        </div>

        <div className="h-4 w-px bg-blue-200" />

        {/* 일괄 송장 입력 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInvoiceModal(true)}
          disabled={isProcessing}
        >
          <PackageIcon className="h-4 w-4 mr-1" />
          송장 입력
        </Button>

        {/* 송장 CSV 업로드 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploadModal(true)}
          disabled={isProcessing}
        >
          <UploadIcon className="h-4 w-4 mr-1" />
          송장 업로드
        </Button>

        {/* 일괄 송장 전송 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkSendInvoice}
          disabled={isProcessing}
          title="각 채널로 송장 정보를 전송합니다"
        >
          <SendIcon className="h-4 w-4 mr-1" />
          송장 전송
        </Button>

        <div className="flex-1" />

        {/* 일괄 삭제 */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isProcessing}
        >
          <Trash2Icon className="h-4 w-4 mr-1" />
          삭제
        </Button>
      </div>

      {/* 상태 변경 확인 다이얼로그 */}
      <AlertDialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상태 변경 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 <strong>{selectedCount}개 주문</strong>을{" "}
              <strong className="text-blue-600">"{selectedStatus && getStatusLabel(selectedStatus)}"</strong>
              (으)로 변경하시겠습니까?
              {selectedStatus === "상품준비중" && (
                <>
                  <br /><br />
                  <span className="text-amber-600">
                    * 네이버 주문의 경우 발주 확인 API가 함께 호출됩니다.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>
              {isProcessing ? "처리 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedCount}개 주문을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 송장 입력 모달 */}
      <InvoiceInputModal
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        selectedOrders={selectedOrderList}
        onComplete={() => {
          setShowInvoiceModal(false);
          onClearSelection();
          onActionComplete?.();
        }}
      />

      {/* 송장 업로드 모달 */}
      <InvoiceUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        orders={orders}
        onComplete={() => {
          setShowUploadModal(false);
          onActionComplete?.();
        }}
      />

      {/* 다운로드 옵션 모달 (상품준비중 상태 변경 후) */}
      <DownloadOptionsModal
        open={showDownloadModal}
        onOpenChange={setShowDownloadModal}
        orders={selectedOrderList}
        statusChanged={lastChangedStatus}
      />
    </>
  );
}
