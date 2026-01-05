/**
 * B2B 결제 상태 뱃지 컴포넌트
 */

import { Badge } from "~/core/components/ui/badge";
import { getPaymentStatusInfo } from "../lib/b2b.shared";

interface PaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const statusInfo = getPaymentStatusInfo(status);

  return (
    <Badge
      variant={
        status === "paid"
          ? "default"
          : status === "partial"
          ? "outline"
          : "secondary"
      }
      className={className}
    >
      {statusInfo.label}
    </Badge>
  );
}
