/**
 * Stats Card Components
 * 
 * 통계 카드를 위한 공통 컴포넌트
 */
import { cn } from "~/core/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  isActive?: boolean;
  activeColor?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-slate-500",
  trend,
  onClick,
  isActive = false,
  activeColor = "indigo",
  className,
}: StatsCardProps) {
  const activeStyles: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-300 shadow-sm",
    amber: "bg-amber-50 border-amber-300 shadow-sm",
    emerald: "bg-emerald-50 border-emerald-300 shadow-sm",
    red: "bg-red-50 border-red-300 shadow-sm",
    blue: "bg-blue-50 border-blue-300 shadow-sm",
  };

  const valueColors: Record<string, string> = {
    indigo: "text-indigo-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border text-left transition-all",
        onClick && "cursor-pointer",
        isActive 
          ? activeStyles[activeColor]
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
        <span className="text-xs font-medium text-slate-500">{title}</span>
      </div>
      <div className={cn(
        "text-2xl font-bold",
        isActive ? valueColors[activeColor] : "text-slate-900"
      )}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {trend && (
        <div className={cn(
          "text-xs mt-1",
          trend.isPositive ? "text-emerald-600" : "text-red-600"
        )}>
          {trend.isPositive ? "▲" : "▼"} {Math.abs(trend.value)}%
          {trend.label && <span className="text-slate-400 ml-1">{trend.label}</span>}
        </div>
      )}
    </Component>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridCols: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {children}
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  change?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-indigo-600",
  iconBgColor = "bg-indigo-100",
  change,
  className,
}: KPICardProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-slate-200 p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-lg", iconBgColor)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        )}
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn(
            "text-sm font-medium",
            change.value >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            {change.value >= 0 ? "+" : ""}{change.value}%
          </span>
          {change.label && (
            <span className="text-xs text-slate-400">{change.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

