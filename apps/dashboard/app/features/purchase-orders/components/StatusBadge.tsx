/**
 * 발주 상태 뱃지 컴포넌트
 */

import { Badge } from "~/core/components/ui/badge";
import { getStatusInfo } from "../lib/purchase-orders.shared";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusInfo = getStatusInfo(status);

  return (
    <Badge variant={statusInfo.color as any} className={className}>
      {statusInfo.label}
    </Badge>
  );
}
