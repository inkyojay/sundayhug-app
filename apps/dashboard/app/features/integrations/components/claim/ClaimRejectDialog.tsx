/**
 * 클레임 거부/보류 사유 입력 다이얼로그
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

type ActionType = "reject" | "hold";

interface ClaimRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: ActionType;
  claimType: string;
  productOrderId: string;
  onConfirm: (reason: string, detailReason?: string) => void;
  isLoading?: boolean;
}

const REJECT_REASONS = {
  CANCEL: [
    { value: "ALREADY_SHIPPED", label: "이미 배송됨" },
    { value: "CUSTOM_PRODUCT", label: "주문제작 상품" },
    { value: "TIME_EXPIRED", label: "취소 가능 기간 경과" },
    { value: "OTHER", label: "기타" },
  ],
  RETURN: [
    { value: "DAMAGED_BY_CUSTOMER", label: "고객 귀책 파손" },
    { value: "USED_PRODUCT", label: "사용 흔적 있음" },
    { value: "MISSING_TAGS", label: "택/라벨 제거됨" },
    { value: "TIME_EXPIRED", label: "반품 가능 기간 경과" },
    { value: "OTHER", label: "기타" },
  ],
  EXCHANGE: [
    { value: "NO_STOCK", label: "교환 상품 재고 없음" },
    { value: "DAMAGED_BY_CUSTOMER", label: "고객 귀책 파손" },
    { value: "TIME_EXPIRED", label: "교환 가능 기간 경과" },
    { value: "OTHER", label: "기타" },
  ],
};

const HOLD_REASONS = [
  { value: "WAITING_INSPECTION", label: "검수 대기" },
  { value: "WAITING_CUSTOMER_RESPONSE", label: "고객 응답 대기" },
  { value: "WAITING_STOCK", label: "재고 확인 중" },
  { value: "OTHER", label: "기타" },
];

export function ClaimRejectDialog({
  open,
  onOpenChange,
  actionType,
  claimType,
  productOrderId,
  onConfirm,
  isLoading = false,
}: ClaimRejectDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [detailReason, setDetailReason] = useState("");

  const reasons = actionType === "reject"
    ? (REJECT_REASONS[claimType as keyof typeof REJECT_REASONS] || REJECT_REASONS.CANCEL)
    : HOLD_REASONS;

  const title = actionType === "reject" ? "클레임 거부" : "클레임 보류";
  const description = actionType === "reject"
    ? "거부 사유를 선택하고 상세 내용을 입력해주세요."
    : "보류 사유를 선택하고 상세 내용을 입력해주세요.";

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason, detailReason || undefined);
    // 초기화
    setSelectedReason("");
    setDetailReason("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReason("");
      setDetailReason("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <br />
            <span className="text-xs text-muted-foreground">
              주문번호: {productOrderId}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">사유 선택</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detail">상세 사유 (선택)</Label>
            <Textarea
              id="detail"
              placeholder="상세 사유를 입력하세요"
              value={detailReason}
              onChange={(e) => setDetailReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant={actionType === "reject" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!selectedReason || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
