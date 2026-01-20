import { Badge } from "~/core/components/ui/badge";

const CLAIM_STATUS_CONFIG = {
  // 취소 상태
  CANCEL_REQUEST: {
    label: "취소요청",
    className: "bg-amber-100 text-amber-700",
  },
  CANCEL_DONE: {
    label: "취소완료",
    className: "bg-gray-100 text-gray-700",
  },
  CANCEL_REJECT: {
    label: "취소거부",
    className: "bg-red-100 text-red-700",
  },

  // 반품 상태
  RETURN_REQUEST: {
    label: "반품요청",
    className: "bg-amber-100 text-amber-700",
  },
  RETURN_DONE: {
    label: "반품완료",
    className: "bg-gray-100 text-gray-700",
  },
  RETURN_REJECT: {
    label: "반품거부",
    className: "bg-red-100 text-red-700",
  },
  RETURN_HOLD: {
    label: "반품보류",
    className: "bg-purple-100 text-purple-700",
  },

  // 교환 상태
  EXCHANGE_REQUEST: {
    label: "교환요청",
    className: "bg-amber-100 text-amber-700",
  },
  EXCHANGE_DONE: {
    label: "교환완료",
    className: "bg-gray-100 text-gray-700",
  },
  EXCHANGE_REJECT: {
    label: "교환거부",
    className: "bg-red-100 text-red-700",
  },
  EXCHANGE_HOLD: {
    label: "교환보류",
    className: "bg-purple-100 text-purple-700",
  },
  COLLECT_DONE: {
    label: "수거완료",
    className: "bg-blue-100 text-blue-700",
  },

  // 공통 상태
  HOLDING: {
    label: "보류중",
    className: "bg-purple-100 text-purple-700",
  },
  PROCESSING: {
    label: "처리중",
    className: "bg-blue-100 text-blue-700",
  },
} as const;

interface ClaimStatusBadgeProps {
  status: string;
}

export function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = CLAIM_STATUS_CONFIG[status as keyof typeof CLAIM_STATUS_CONFIG] || {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
