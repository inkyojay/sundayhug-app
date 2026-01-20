/**
 * 클레임 액션 버튼 컴포넌트
 *
 * 클레임 유형과 상태에 따라 적절한 액션 버튼 표시
 */

import { Check, Clock, Package, Send, X } from "lucide-react";

import { Button } from "~/core/components/ui/button";

interface ClaimActionButtonsProps {
  claimType: string;
  claimStatus: string;
  productOrderId: string;
  onApprove?: () => void;
  onReject?: () => void;
  onHold?: () => void;
  onReleaseHold?: () => void;
  onCollectDone?: () => void;
  onDispatch?: () => void;
  isLoading?: boolean;
  size?: "sm" | "default";
}

export function ClaimActionButtons({
  claimType,
  claimStatus,
  onApprove,
  onReject,
  onHold,
  onReleaseHold,
  onCollectDone,
  onDispatch,
  isLoading = false,
  size = "sm",
}: ClaimActionButtonsProps) {
  // 취소 요청 상태
  if (claimStatus === "CANCEL_REQUEST") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={onApprove}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-3 w-3 mr-1" />
          승인
        </Button>
        <Button
          size={size}
          variant="destructive"
          onClick={onReject}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" />
          거부
        </Button>
      </div>
    );
  }

  // 반품 요청 상태
  if (claimStatus === "RETURN_REQUEST") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={onApprove}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-3 w-3 mr-1" />
          승인
        </Button>
        <Button
          size={size}
          variant="outline"
          onClick={onHold}
          disabled={isLoading}
        >
          <Clock className="h-3 w-3 mr-1" />
          보류
        </Button>
        <Button
          size={size}
          variant="destructive"
          onClick={onReject}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" />
          거부
        </Button>
      </div>
    );
  }

  // 반품 보류 상태
  if (claimStatus === "HOLDING" && claimType === "RETURN") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={onReleaseHold}
          disabled={isLoading}
        >
          보류해제
        </Button>
      </div>
    );
  }

  // 교환 요청 상태
  if (claimStatus === "EXCHANGE_REQUEST") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={onCollectDone}
          disabled={isLoading}
        >
          <Package className="h-3 w-3 mr-1" />
          수거완료
        </Button>
        <Button
          size={size}
          variant="outline"
          onClick={onHold}
          disabled={isLoading}
        >
          <Clock className="h-3 w-3 mr-1" />
          보류
        </Button>
        <Button
          size={size}
          variant="destructive"
          onClick={onReject}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" />
          거부
        </Button>
      </div>
    );
  }

  // 교환 수거 완료 상태
  if (claimStatus === "COLLECT_DONE") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={onDispatch}
          disabled={isLoading}
        >
          <Send className="h-3 w-3 mr-1" />
          재배송
        </Button>
      </div>
    );
  }

  // 교환 보류 상태
  if (claimStatus === "HOLDING" && claimType === "EXCHANGE") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={onReleaseHold}
          disabled={isLoading}
        >
          보류해제
        </Button>
      </div>
    );
  }

  // 처리 완료 또는 거부 상태 - 액션 없음
  return null;
}
