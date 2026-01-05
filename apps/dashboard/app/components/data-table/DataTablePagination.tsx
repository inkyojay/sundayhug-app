import { Button } from "~/core/components/ui/button";

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: DataTablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex justify-between items-center px-4 py-3 border-t ${className ?? ""}`}>
      <p className="text-sm text-muted-foreground">
        페이지 {currentPage} / {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          이전
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
