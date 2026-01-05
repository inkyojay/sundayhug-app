/**
 * 업체 유형 뱃지 컴포넌트 (국내/해외)
 */

import { MapPinIcon, GlobeIcon } from "lucide-react";
import { Badge } from "~/core/components/ui/badge";
import { getBusinessTypeInfo } from "../lib/b2b.shared";

interface CustomerTypeBadgeProps {
  type: string;
  className?: string;
}

export function CustomerTypeBadge({ type, className }: CustomerTypeBadgeProps) {
  const typeInfo = getBusinessTypeInfo(type);
  const Icon = typeInfo.icon;

  return (
    <Badge
      variant={type === "domestic" ? "default" : "secondary"}
      className={className}
    >
      <Icon className="h-3 w-3 mr-1" />
      {typeInfo.label}
    </Badge>
  );
}
