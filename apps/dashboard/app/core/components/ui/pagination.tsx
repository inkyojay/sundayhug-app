/**
 * Pagination Components
 * 
 * 페이지네이션을 위한 공통 컴포넌트
 */
import { cn } from "~/core/lib/utils";
import { Button } from "./button";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  className?: string;
  showPageNumbers?: boolean;
  showFirstLast?: boolean;
  showItemCount?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [50, 100, 500, 1000],
  className,
  showPageNumbers = true,
  showFirstLast = true,
  showItemCount = true,
}: PaginationProps) {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalCount);

  // 표시할 페이지 번호 계산
  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages: number[] = [];
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1 && !onLimitChange) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50",
      className
    )}>
      <div className="flex items-center gap-4">
        {showItemCount && (
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{startItem.toLocaleString()}</span>
            {" - "}
            <span className="font-medium text-slate-700">{endItem.toLocaleString()}</span>
            {" / "}
            <span>{totalCount.toLocaleString()}</span>
          </p>
        )}
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">표시:</span>
            <Select 
              value={String(limit)} 
              onValueChange={(v) => onLimitChange(parseInt(v))}
            >
              <SelectTrigger className="w-[80px] h-8 text-xs border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map(n => (
                  <SelectItem key={n} value={String(n)}>{n}개</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        {showPageNumbers && getPageNumbers().map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            className={cn(
              "h-8 w-8 p-0 text-xs",
              pageNum === currentPage && "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            {pageNum}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="h-8 w-8 p-0"
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        이전
      </Button>
      <span className="text-sm text-slate-600 min-w-[80px] text-center">
        {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        다음
      </Button>
    </div>
  );
}

