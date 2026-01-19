/**
 * 문의 상태 배지 컴포넌트
 *
 * 상태별 색상 구분
 * - WAITING: 미답변 (빨강)
 * - ANSWERED: 답변완료 (초록)
 * - HOLDING: 보류중 (노랑)
 */

import { Badge } from "~/core/components/ui/badge";

type InquiryStatus = "WAITING" | "ANSWERED" | "HOLDING";

interface InquiryStatusBadgeProps {
  status: InquiryStatus;
}

const STATUS_CONFIG: Record<
  InquiryStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  WAITING: {
    label: "미답변",
    variant: "destructive",
  },
  ANSWERED: {
    label: "답변완료",
    variant: "default",
    className: "bg-green-600 hover:bg-green-700",
  },
  HOLDING: {
    label: "보류중",
    variant: "outline",
    className: "border-yellow-500 text-yellow-600 dark:text-yellow-400",
  },
};

export function InquiryStatusBadge({ status }: InquiryStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "secondary" as const,
  };

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
