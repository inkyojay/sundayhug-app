/**
 * 상품 상태 변경 다이얼로그
 *
 * 선택된 상품들의 판매 상태를 일괄 변경
 */

import { useState } from "react";

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
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import { Textarea } from "~/core/components/ui/textarea";

import type { ProductStatusType } from "~/features/integrations/lib/naver/naver-products-types";
import { PRODUCT_STATUS_INFO } from "~/features/integrations/lib/naver/naver-products-types";

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (statusType: ProductStatusType, reason?: string) => Promise<void>;
}

// 사용자가 선택 가능한 상태 (DELETE 제외)
const AVAILABLE_STATUSES: ProductStatusType[] = ["SALE", "OUTOFSTOCK", "SUSPENSION", "CLOSE"];

export function StatusChangeDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: StatusChangeDialogProps) {
  const [status, setStatus] = useState<ProductStatusType>("SALE");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(status, reason || undefined);
      onOpenChange(false);
      setReason("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>상품 상태 변경</DialogTitle>
          <DialogDescription>
            {selectedCount}개 상품의 판매 상태를 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={status}
            onValueChange={(v) => setStatus(v as ProductStatusType)}
            className="space-y-3"
          >
            {AVAILABLE_STATUSES.map((statusType) => {
              const info = PRODUCT_STATUS_INFO[statusType];
              return (
                <div
                  key={statusType}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => setStatus(statusType)}
                >
                  <RadioGroupItem value={statusType} id={statusType} className="mt-0.5" />
                  <Label htmlFor={statusType} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          info.color === "green"
                            ? "bg-green-500"
                            : info.color === "red"
                              ? "bg-red-500"
                              : info.color === "yellow"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium">{info.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {info.description}
                    </p>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="reason">변경 사유 (선택)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="상태 변경 사유를 입력하세요..."
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
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "처리 중..." : `${selectedCount}개 상품 상태 변경`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
