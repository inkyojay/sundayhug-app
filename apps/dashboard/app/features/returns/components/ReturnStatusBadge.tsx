/**
 * 교환/반품/AS 상태 배지 컴포넌트
 */
import { Badge } from "~/core/components/ui/badge";
import { getStatusInfo } from "../lib/returns.shared";

interface ReturnStatusBadgeProps {
  status: string;
}

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  const statusInfo = getStatusInfo(status);

  const variantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    default: "default",
    secondary: "secondary",
    outline: "outline",
    destructive: "destructive",
  };

  return (
    <Badge variant={variantMap[statusInfo.color] || "default"}>
      {statusInfo.label}
    </Badge>
  );
}
