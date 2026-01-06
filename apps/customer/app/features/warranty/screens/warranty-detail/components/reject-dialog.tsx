/**
 * Reject Dialog Component
 */
import { XCircleIcon, Loader2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["warranty", "common"]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("warranty:admin.warrantyDetail.rejectDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("warranty:admin.warrantyDetail.rejectDialog.description", { warrantyNumber })}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder={t("warranty:admin.warrantyDetail.rejectDialog.placeholder")}
          value={rejectionReason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common:buttons.cancel")}
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
            {t("warranty:admin.warrantyDetail.adminActions.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
