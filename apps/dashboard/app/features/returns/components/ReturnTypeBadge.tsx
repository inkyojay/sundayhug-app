/**
 * 교환/반품/AS 유형 배지 컴포넌트
 */
import { getTypeInfo } from "../lib/returns.shared";

interface ReturnTypeBadgeProps {
  type: string;
  showIcon?: boolean;
}

export function ReturnTypeBadge({ type, showIcon = true }: ReturnTypeBadgeProps) {
  const typeInfo = getTypeInfo(type);
  const Icon = typeInfo.icon;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted">
      {showIcon && <Icon className="w-3 h-3" />}
      {typeInfo.label}
    </span>
  );
}
