/**
 * B2B 출고 상태 뱃지 컴포넌트
 */

import { Badge } from "~/core/components/ui/badge";
import { getShipmentStatusInfo } from "../lib/b2b.shared";

interface ShipmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
  const statusInfo = getShipmentStatusInfo(status);

  return (
    <Badge
      variant={
        status === "delivered" || status === "shipped"
          ? "default"
          : status === "cancelled"
          ? "destructive"
          : "secondary"
      }
      className={className}
    >
      {statusInfo.label}
    </Badge>
  );
}
