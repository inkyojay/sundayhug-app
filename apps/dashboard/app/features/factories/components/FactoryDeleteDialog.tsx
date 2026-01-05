/**
 * 공장 삭제 확인 다이얼로그
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

import type { Factory } from "../lib/factories.shared";

interface FactoryDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factory: Factory | null;
  onConfirm: () => void;
}

export function FactoryDeleteDialog({
  open,
  onOpenChange,
  factory,
  onConfirm,
}: FactoryDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>공장 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            "{factory?.factory_name}" 공장을 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
