import { Badge } from "~/core/components/ui/badge";
import { ArrowLeftRight, RotateCcw, XCircle } from "lucide-react";

const CLAIM_TYPE_CONFIG = {
  CANCEL: {
    label: "취소",
    icon: XCircle,
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  RETURN: {
    label: "반품",
    icon: RotateCcw,
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  EXCHANGE: {
    label: "교환",
    icon: ArrowLeftRight,
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
} as const;

interface ClaimTypeBadgeProps {
  type: keyof typeof CLAIM_TYPE_CONFIG | string;
  showIcon?: boolean;
}

export function ClaimTypeBadge({ type, showIcon = true }: ClaimTypeBadgeProps) {
  const config = CLAIM_TYPE_CONFIG[type as keyof typeof CLAIM_TYPE_CONFIG] || {
    label: type,
    icon: XCircle,
    className: "bg-gray-100 text-gray-700",
  };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
