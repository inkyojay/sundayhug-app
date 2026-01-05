/**
 * 색상칩 컴포넌트
 */
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/core/components/ui/tooltip";
import { findColor, isDarkColor } from "../lib/inventory.shared";

interface ColorChipProps {
  colorName: string;
  showLabel?: boolean;
}

export function ColorChip({ colorName, showLabel = true }: ColorChipProps) {
  const bgColor = findColor(colorName);
  const isDark = isDarkColor(colorName);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div
            className="w-4 h-4 rounded-full border flex-shrink-0"
            style={{
              backgroundColor: bgColor,
              borderColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
            }}
          />
          {showLabel && (
            <span className="text-xs truncate max-w-[80px]">{colorName}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{colorName}</TooltipContent>
    </Tooltip>
  );
}
