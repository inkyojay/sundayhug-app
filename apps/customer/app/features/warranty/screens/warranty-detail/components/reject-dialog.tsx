/**
 * Reject Dialog Component
 */
import { XCircleIcon, Loader2Icon } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  warrantyNumber: string;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onReject: () => void;
  isSubmitting: boolean;
}

export function RejectDialog({
  open,
  onClose,
  warrantyNumber,
  rejectionReason,
  onReasonChange,
  onReject,
  isSubmitting,
}: RejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>보증서 거절</DialogTitle>
          <DialogDescription>
            {warrantyNumber} 보증서를 거절합니다.
            고객에게 안내할 거절 사유를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="거절 사유를 입력하세요. (예: 제품 사진이 불명확합니다. 제품 전체가 보이는 사진으로 다시 등록해주세요.)"
          value={rejectionReason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isSubmitting || !rejectionReason.trim()}
          >
            {isSubmitting ? (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircleIcon className="h-4 w-4 mr-2" />
            )}
            거절
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
