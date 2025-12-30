/**
 * Error Display Components
 * 
 * 에러 상태를 표시하기 위한 공통 컴포넌트
 */
import { cn } from "~/core/lib/utils";
import { AlertCircleIcon, AlertTriangleIcon, XCircleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";
import { Button } from "./button";

interface ErrorMessageProps {
  type?: "error" | "warning" | "info";
  title?: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ 
  type = "error", 
  title, 
  message, 
  className,
  onDismiss 
}: ErrorMessageProps) {
  const typeStyles = {
    error: {
      container: "bg-red-50 border-red-200 text-red-700",
      icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
    },
    warning: {
      container: "bg-amber-50 border-amber-200 text-amber-700",
      icon: <AlertTriangleIcon className="h-5 w-5 text-amber-500" />,
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-700",
      icon: <AlertCircleIcon className="h-5 w-5 text-blue-500" />,
    },
  };

  const styles = typeStyles[type];

  return (
    <div className={cn("flex items-start gap-3 p-4 rounded-lg border", styles.container, className)}>
      {styles.icon}
      <div className="flex-1">
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-white/50 rounded transition-colors"
        >
          <XCircleIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorCard({ 
  title = "오류가 발생했습니다", 
  message = "데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  onRetry,
  onGoHome,
  className 
}: ErrorCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangleIcon className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{message}</p>
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="default" size="sm">
            <HomeIcon className="h-4 w-4 mr-2" />
            홈으로 이동
          </Button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon,
  title = "데이터가 없습니다", 
  description = "아직 등록된 데이터가 없습니다.",
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface SuccessMessageProps {
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function SuccessMessage({ message, className, onDismiss }: SuccessMessageProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700",
      className
    )}>
      <div className="p-1 rounded-full bg-emerald-100">
        <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm flex-1">{message}</p>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-emerald-100 rounded transition-colors"
        >
          <XCircleIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

