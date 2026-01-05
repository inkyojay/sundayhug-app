import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import { cn } from "~/core/lib/utils";

export type StatCardVariant = "default" | "success" | "warning" | "danger";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: StatCardVariant;
  className?: string;
}

const variantStyles: Record<StatCardVariant, { border: string; text: string; icon: string }> = {
  default: {
    border: "",
    text: "",
    icon: "text-muted-foreground",
  },
  success: {
    border: "border-emerald-200",
    text: "text-emerald-500",
    icon: "text-emerald-500",
  },
  warning: {
    border: "border-amber-200",
    text: "text-amber-500",
    icon: "text-amber-500",
  },
  danger: {
    border: "border-red-200",
    text: "text-red-500",
    icon: "text-red-500",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  onClick,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const formattedValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card
      className={cn(
        styles.border,
        onClick && "cursor-pointer hover:bg-muted/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          {Icon && <Icon className={cn("h-4 w-4", styles.icon)} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", styles.text)}>
          {formattedValue}
        </div>
      </CardContent>
    </Card>
  );
}
