/**
 * 로딩 스피너 컴포넌트
 */

import { cn } from "~/core/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  variant?: "default" | "kakao";
}

export function LoadingSpinner({
  message = "로딩 중...",
  className,
  variant = "default",
}: LoadingSpinnerProps) {
  const spinnerColor =
    variant === "kakao" ? "border-[#FF6B35]" : "border-primary";

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        variant === "kakao" && "bg-[#F5F5F0]",
        className
      )}
    >
      <div className="text-center">
        <div
          className={cn(
            "animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4",
            spinnerColor
          )}
        />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
