/**
 * 결제 내역 없음 상태 컴포넌트
 *
 * 결제 내역이 없을 때 표시되는 UI
 */

import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

interface PaymentEmptyStateProps {
  checkoutUrl?: string;
  message?: string;
}

export function PaymentEmptyState({
  checkoutUrl = "/payments/checkout",
  message = "결제 내역이 없습니다.",
}: PaymentEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-muted-foreground text-lg">{message}</p>
      <Button asChild>
        <Link to={checkoutUrl}>테스트 결제하기 &rarr;</Link>
      </Button>
    </div>
  );
}
