/**
 * 주문 상태 배지 컴포넌트
 *
 * 상태별 색상 구분
 */
import { getStatusConfig } from "../lib/orders-unified.shared";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
