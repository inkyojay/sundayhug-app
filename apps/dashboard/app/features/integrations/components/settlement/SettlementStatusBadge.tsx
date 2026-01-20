import { Badge } from "~/core/components/ui/badge";

const SETTLEMENT_STATUS_CONFIG = {
  SETTLEMENT_EXPECTED: {
    label: "정산예정",
    className: "bg-blue-100 text-blue-700",
  },
  SETTLEMENT_IN_PROGRESS: {
    label: "정산중",
    className: "bg-amber-100 text-amber-700",
  },
  SETTLEMENT_DONE: {
    label: "정산완료",
    className: "bg-green-100 text-green-700",
  },
  SETTLEMENT_HOLD: {
    label: "정산보류",
    className: "bg-red-100 text-red-700",
  },
  SETTLEMENT_DEFERRED: {
    label: "정산연기",
    className: "bg-purple-100 text-purple-700",
  },
} as const;

interface SettlementStatusBadgeProps {
  status: string;
}

export function SettlementStatusBadge({ status }: SettlementStatusBadgeProps) {
  const config = SETTLEMENT_STATUS_CONFIG[status as keyof typeof SETTLEMENT_STATUS_CONFIG] || {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
