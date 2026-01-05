/**
 * 활성/비활성 상태 뱃지 컴포넌트
 */

import { Badge } from "~/core/components/ui/badge";

interface ActiveBadgeProps {
  isActive: boolean;
  className?: string;
}

export function ActiveBadge({ isActive, className }: ActiveBadgeProps) {
  return (
    <Badge variant={isActive ? "default" : "secondary"} className={className}>
      {isActive ? "활성" : "비활성"}
    </Badge>
  );
}
