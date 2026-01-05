/**
 * 발주서 요약 정보 컴포넌트
 */

import { formatCurrency } from "../lib/purchase-orders.shared";

interface OrderSummaryProps {
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export function OrderSummary({ itemCount, totalQuantity, totalAmount }: OrderSummaryProps) {
  return (
    <div className="pt-4 border-t space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">총 품목</span>
        <span className="font-medium">{itemCount}건</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">총 수량</span>
        <span className="font-medium">{totalQuantity.toLocaleString()}개</span>
      </div>
      <div className="flex justify-between text-lg font-bold">
        <span>총 금액</span>
        <span>{formatCurrency(totalAmount)}원</span>
      </div>
    </div>
  );
}
