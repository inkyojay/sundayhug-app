/**
 * 결제 상태 배지 컴포넌트
 *
 * 결제 상태를 시각적으로 표시하는 배지 컴포넌트
 */

import { cn } from "~/core/lib/utils";

import {
  getPaymentStatusColor,
  getPaymentStatusLabel,
} from "../lib/payments.shared";

interface PaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  className,
}: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        getPaymentStatusColor(status),
        className
      )}
    >
      {getPaymentStatusLabel(status)}
    </span>
  );
}
