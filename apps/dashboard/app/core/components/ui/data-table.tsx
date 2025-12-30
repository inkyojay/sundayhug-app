/**
 * Data Table Components
 * 
 * Airtable 스타일의 데이터 테이블 공통 컴포넌트
 */
import { cn } from "~/core/lib/utils";
import { ChevronUpIcon, ChevronDownIcon, SearchIcon, RefreshCwIcon, DownloadIcon, UploadIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import { Checkbox } from "./checkbox";
import { Pagination } from "./pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

// Types
export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  width?: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  
  // 헤더
  title?: string;
  description?: string;
  totalCount?: number;
  
  // 선택
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
  
  // 정렬
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  
  // 페이지네이션
  pagination?: {
    currentPage: number;
    totalPages: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    limitOptions?: number[];
  };
  
  // 검색
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  
  // 액션
  onRefresh?: () => void;
  onExportCSV?: () => void;
  onImportCSV?: () => void;
  isRefreshing?: boolean;
  
  // 커스텀 액션
  headerActions?: React.ReactNode;
  bulkActions?: React.ReactNode;
  
  // 스타일
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowClassName?: (item: T, index: number) => string;
  striped?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  title,
  description,
  totalCount,
  selectable = false,
  selectedIds = new Set(),
  onSelectAll,
  onSelectOne,
  sortBy,
  sortOrder,
  onSort,
  pagination,
  searchPlaceholder = "검색...",
  searchValue,
  onSearch,
  onRefresh,
  onExportCSV,
  onImportCSV,
  isRefreshing = false,
  headerActions,
  bulkActions,
  className,
  emptyMessage = "데이터가 없습니다",
  emptyIcon,
  rowClassName,
  striped = true,
}: DataTableProps<T>) {
  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;
  const hasSelectedItems = selectedIds.size > 0;

  const SortableHeader = ({ column, children }: { column: Column<T>; children: React.ReactNode }) => {
    if (!column.sortable || !onSort) {
      return <>{children}</>;
    }

    return (
      <div 
        className="flex items-center gap-1 cursor-pointer select-none"
        onClick={() => onSort(column.key)}
      >
        {children}
        {sortBy === column.key && (
          sortOrder === "asc" ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
        )}
      </div>
    );
  };

  return (
    <div className={cn("bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* 헤더 영역 */}
      {(title || onSearch || onRefresh || onExportCSV || onImportCSV || headerActions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            {title && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{title}</span>
                {totalCount !== undefined && (
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                    {totalCount.toLocaleString()}건
                  </Badge>
                )}
              </div>
            )}
            {description && (
              <span className="text-xs text-slate-500">{description}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onSearch && (
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue || ""}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-9 h-8 w-[200px] text-sm border-slate-200"
                />
              </div>
            )}
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="h-8 text-xs"
                disabled={isRefreshing}
              >
                <RefreshCwIcon className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")} />
                새로고침
              </Button>
            )}
            {onExportCSV && (
              <Button variant="outline" size="sm" onClick={onExportCSV} className="h-8 text-xs">
                <DownloadIcon className="h-3.5 w-3.5 mr-1" />
                내보내기
              </Button>
            )}
            {onImportCSV && (
              <Button variant="outline" size="sm" onClick={onImportCSV} className="h-8 text-xs">
                <UploadIcon className="h-3.5 w-3.5 mr-1" />
                가져오기
              </Button>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* 일괄 처리 영역 */}
      {hasSelectedItems && bulkActions && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size}개 선택됨
          </span>
          <div className="h-4 w-px bg-blue-200" />
          {bulkActions}
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-b border-slate-200">
              {selectable && (
                <TableHead className="w-[40px] text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => onSelectAll?.(!!checked)}
                    className={isSomeSelected ? "opacity-50" : ""}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    "text-xs font-medium text-slate-600",
                    column.sortable && onSort && "cursor-pointer hover:bg-slate-100/80",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={column.sortable ? () => onSort?.(column.key) : undefined}
                >
                  <SortableHeader column={column}>
                    {column.header}
                  </SortableHeader>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const id = String(item[keyField]);
              const isSelected = selectedIds.has(id);
              
              return (
                <TableRow 
                  key={id}
                  className={cn(
                    "transition-colors",
                    isSelected ? "bg-blue-50/70" : striped && index % 2 !== 0 ? "bg-slate-50/30" : "bg-white",
                    "hover:bg-slate-100/70",
                    rowClassName?.(item, index)
                  )}
                >
                  {selectable && (
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectOne?.(id, !!checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render 
                        ? column.render(item, index) 
                        : String((item as any)[column.key] ?? "-")
                      }
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="text-center py-12 text-slate-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    {emptyIcon && (
                      <div className="text-slate-300">
                        {emptyIcon}
                      </div>
                    )}
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalCount={totalCount || data.length}
          limit={pagination.limit}
          onPageChange={pagination.onPageChange}
          onLimitChange={pagination.onLimitChange}
          limitOptions={pagination.limitOptions}
        />
      )}
    </div>
  );
}

