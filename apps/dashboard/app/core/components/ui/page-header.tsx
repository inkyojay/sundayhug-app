/**
 * Page Header Components
 * 
 * 페이지 헤더를 위한 공통 컴포넌트
 */
import { cn } from "~/core/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  iconColor = "text-indigo-600",
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1">
          {breadcrumbs.map((item, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <span className="text-slate-300">/</span>}
              {item.href ? (
                <a href={item.href} className="hover:text-slate-700 transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-slate-700">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 text-slate-900">
            {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-4 p-6 bg-slate-50 min-h-screen", className)}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  badge,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium text-slate-700">{title}</h2>
        {badge}
      </div>
      {description && (
        <p className="text-sm text-slate-500">{description}</p>
      )}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

