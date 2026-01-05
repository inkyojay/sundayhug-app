/**
 * 정렬 가능한 테이블 헤더 컴포넌트
 */
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import type { SortKey, SortOrder } from "../lib/inventory.shared";

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentOrder: SortOrder;
  onSort: (key: SortKey) => void;
  className?: string;
}

export function SortableHeader({
  children,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isSorted = currentSort === sortKey;

  return (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isSorted ? (
          currentOrder === "asc" ? (
            <ArrowUpIcon className="w-3 h-3" />
          ) : (
            <ArrowDownIcon className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDownIcon className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );
}
