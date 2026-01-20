/**
 * 정산 상세 정보 슬라이드 패널
 */

import { Label } from "~/core/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/core/components/ui/sheet";

import { SettlementStatusBadge } from "./SettlementStatusBadge";

interface NaverSettlement {
  settlementTargetId: string;
  productOrderId?: string;
  orderId?: string;
  productName?: string;
  productOption?: string;
  quantity?: number;
  baseAmount?: number;
  commissionFee?: number;
  deliveryFee?: number;
  pointSettlement?: number;
  discountAmount?: number;
  settlementAmount?: number;
  settleDate?: string;
  settlementStatus?: string;
  paymentMethod?: string;
  orderDate?: string;
}

interface SettlementDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: NaverSettlement | null;
}

export function SettlementDetailSheet({
  open,
  onOpenChange,
  settlement,
}: SettlementDetailSheetProps) {
  if (!settlement) return null;

  const formatCurrency = (amount?: number, showSign = false) => {
    if (amount === undefined || amount === null) return "-";
    const formatted = Math.abs(amount).toLocaleString("ko-KR") + "원";
    if (showSign && amount < 0) return `-${formatted}`;
    if (showSign && amount > 0) return `+${formatted}`;
    return formatted;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            정산 상세
            {settlement.settlementStatus && (
              <SettlementStatusBadge status={settlement.settlementStatus} />
            )}
          </SheetTitle>
          <SheetDescription>
            정산대상ID: {settlement.settlementTargetId}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 주문 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">주문 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">주문번호</Label>
                <p className="mt-1 text-sm font-mono">
                  {settlement.productOrderId || settlement.orderId || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">주문일</Label>
                <p className="mt-1 text-sm">
                  {settlement.orderDate
                    ? new Date(settlement.orderDate).toLocaleDateString("ko-KR")
                    : "-"}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">상품명</Label>
              <p className="mt-1 text-sm">{settlement.productName || "-"}</p>
            </div>
            {settlement.productOption && (
              <div>
                <Label className="text-xs text-muted-foreground">옵션</Label>
                <p className="mt-1 text-sm">{settlement.productOption}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">수량</Label>
                <p className="mt-1 text-sm">{settlement.quantity || 1}개</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">결제방법</Label>
                <p className="mt-1 text-sm">{settlement.paymentMethod || "-"}</p>
              </div>
            </div>
          </div>

          {/* 정산 금액 상세 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">정산 금액 상세</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">기준금액</span>
                <span className="text-sm font-medium">
                  {formatCurrency(settlement.baseAmount)}
                </span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="text-sm">수수료</span>
                <span className="text-sm">
                  -{formatCurrency(settlement.commissionFee)}
                </span>
              </div>
              {settlement.deliveryFee !== undefined && settlement.deliveryFee !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">배송비</span>
                  <span className="text-sm">
                    {formatCurrency(settlement.deliveryFee, true)}
                  </span>
                </div>
              )}
              {settlement.pointSettlement !== undefined && settlement.pointSettlement !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">포인트 정산</span>
                  <span className="text-sm">
                    {formatCurrency(settlement.pointSettlement, true)}
                  </span>
                </div>
              )}
              {settlement.discountAmount !== undefined && settlement.discountAmount !== 0 && (
                <div className="flex justify-between text-orange-600">
                  <span className="text-sm">할인금액</span>
                  <span className="text-sm">
                    -{formatCurrency(settlement.discountAmount)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">최종 정산액</span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(settlement.settlementAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* 정산 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">정산 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">정산 상태</Label>
                <div className="mt-1">
                  {settlement.settlementStatus && (
                    <SettlementStatusBadge status={settlement.settlementStatus} />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">정산일</Label>
                <p className="mt-1 text-sm">
                  {settlement.settleDate
                    ? new Date(settlement.settleDate).toLocaleDateString("ko-KR")
                    : "예정"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
