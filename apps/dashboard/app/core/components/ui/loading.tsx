/**
 * Loading Components
 * 
 * 다양한 로딩 상태를 표시하기 위한 공통 컴포넌트
 */
import { cn } from "~/core/lib/utils";
import { Loader2Icon } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2Icon 
      className={cn("animate-spin text-slate-400", sizeClasses[size], className)} 
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "로딩 중..." }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" className="text-indigo-500" />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  message?: string;
  className?: string;
}

export function LoadingCard({ message = "데이터를 불러오는 중...", className }: LoadingCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-slate-500", className)}>
      <LoadingSpinner size="lg" className="text-indigo-500 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 5, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-10 w-10 bg-slate-200 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-6 w-20 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

interface LoadingTableProps {
  columns?: number;
  rows?: number;
}

export function LoadingTable({ columns = 6, rows = 10 }: LoadingTableProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-slate-200 bg-slate-50">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-slate-200 rounded animate-pulse"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 p-4 border-b border-slate-100"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-slate-100 rounded animate-pulse"
              style={{ 
                width: `${100 / columns}%`,
                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

