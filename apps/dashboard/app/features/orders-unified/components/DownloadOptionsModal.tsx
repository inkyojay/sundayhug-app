/**
 * 다운로드 옵션 모달
 *
 * "상품준비중" 상태 변경 완료 후 표시되는 모달
 * - 한진택배 송장 엑셀 다운로드
 * - 주문확인서 PDF 페이지 이동
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  FileSpreadsheetIcon,
  FileTextIcon,
  XIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PackageIcon,
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

import { exportHanjinInvoiceExcel } from "../lib/hanjin-invoice";
import type { UnifiedOrder } from "../lib/orders-unified.shared";

interface DownloadOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: UnifiedOrder[];
  statusChanged: string;
}

export function DownloadOptionsModal({
  open,
  onOpenChange,
  orders,
  statusChanged,
}: DownloadOptionsModalProps) {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadHanjinExcel = async () => {
    if (orders.length === 0) return;

    setIsDownloading(true);
    try {
      await exportHanjinInvoiceExcel(orders);
    } catch (error) {
      console.error("엑셀 생성 오류:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoToPackingSlip = () => {
    const orderKeys = orders.map((o) => o.key).join(",");
    navigate(`/dashboard/orders/packing-slip?orders=${encodeURIComponent(orderKeys)}`);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // "상품준비중"으로 변경된 경우에만 다운로드 옵션 표시
  const showDownloadOptions = statusChanged === "상품준비중";

  if (!showDownloadOptions) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5 text-green-500" />
            상태 변경 완료
          </DialogTitle>
          <DialogDescription>
            {orders.length}개 주문이 "{statusChanged}"으로 변경되었습니다.
            <br />
            필요한 문서를 다운로드하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {/* 한진택배 송장 엑셀 */}
          <button
            onClick={handleDownloadHanjinExcel}
            disabled={isDownloading}
            className="flex items-center gap-4 p-4 rounded-lg border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <FileSpreadsheetIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">한진택배 송장 엑셀</p>
              <p className="text-sm text-gray-500">
                한진택배 운송장 양식에 맞는 엑셀 파일을 다운로드합니다
              </p>
            </div>
            <div className="flex-shrink-0">
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <DownloadIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
              )}
            </div>
          </button>

          {/* 주문확인서 PDF */}
          <button
            onClick={handleGoToPackingSlip}
            className="flex items-center gap-4 p-4 rounded-lg border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <FileTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">주문확인서 PDF</p>
              <p className="text-sm text-gray-500">
                사은품 안내, QR 코드가 포함된 주문확인서를 생성합니다
              </p>
            </div>
            <div className="flex-shrink-0">
              <ExternalLinkIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            <XIcon className="h-4 w-4 mr-2" />
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
