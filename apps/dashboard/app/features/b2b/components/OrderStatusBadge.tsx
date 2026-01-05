/**
 * B2B 주문 상태 뱃지 컴포넌트
 */

import { Badge } from "~/core/components/ui/badge";
import { getOrderStatusInfo, type OrderStatusColor } from "../lib/b2b.shared";

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const statusInfo = getOrderStatusInfo(status);

  return (
    <Badge variant={statusInfo.color as OrderStatusColor} className={className}>
      {statusInfo.label}
    </Badge>
  );
}
