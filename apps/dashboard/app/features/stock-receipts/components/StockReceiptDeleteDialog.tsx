/**
 * 입고 삭제 확인 다이얼로그
 */

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

import type { StockReceipt } from "../lib/stock-receipts.shared";

interface StockReceiptDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: StockReceipt | null;
  onConfirm: () => void;
}

export function StockReceiptDeleteDialog({
  open,
  onOpenChange,
  receipt,
  onConfirm,
}: StockReceiptDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>입고 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            입고 "{receipt?.receipt_number}"를 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
