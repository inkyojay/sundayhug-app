/**
 * 네이버 상품 일괄 작업 바
 *
 * 선택된 상품에 대한 일괄 작업 버튼 제공
 * - 상태 변경
 * - 재고 수정
 * - 가격 변경
 */

import { X, RefreshCw, Package, DollarSign } from "lucide-react";

import { Button } from "~/core/components/ui/button";

interface NaverProductBulkBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onStatusChange: () => void;
  onInventoryUpdate: () => void;
  onPriceChange: () => void;
  isLoading?: boolean;
}

export function NaverProductBulkBar({
  selectedCount,
  onClearSelection,
  onStatusChange,
  onInventoryUpdate,
  onPriceChange,
  isLoading,
}: NaverProductBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 mx-4 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-lg flex items-center justify-between z-50">
      <span className="text-sm font-medium text-blue-700">
        {selectedCount}개 상품 선택됨
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
          className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
        >
          <X className="h-4 w-4 mr-1" />
          선택 해제
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onStatusChange}
          disabled={isLoading}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          상태 변경
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onInventoryUpdate}
          disabled={isLoading}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <Package className="h-4 w-4 mr-1" />
          재고 수정
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPriceChange}
          disabled={isLoading}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          가격 변경
        </Button>
      </div>
    </div>
  );
}
