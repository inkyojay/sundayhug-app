import { Badge } from "~/core/components/ui/badge";
import { getColorCode, getContrastColor } from "../lib/products.shared";

interface ColorBadgeProps {
  colorName: string;
}

export function ColorBadge({ colorName }: ColorBadgeProps) {
  const bgColor = getColorCode(colorName);

  if (bgColor) {
    const textColor = getContrastColor(bgColor);
    const borderColor =
      bgColor === "#FFFFFF" || bgColor === "#FFFFF0" || bgColor === "#FFFDD0"
        ? "border border-gray-300"
        : "";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${borderColor}`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {colorName}
      </span>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      {colorName}
    </Badge>
  );
}
