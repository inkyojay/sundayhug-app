/**
 * 정산 필터 컴포넌트
 */

import { Download, Search } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

export type SettlementStatusFilter = "all" | "EXPECTED" | "IN_PROGRESS" | "DONE" | "HOLD";

interface SettlementFiltersProps {
  dateRange: string;
  status: SettlementStatusFilter;
  searchQuery: string;
  onDateRangeChange: (value: string) => void;
  onStatusChange: (value: SettlementStatusFilter) => void;
  onSearchChange: (value: string) => void;
  onExport?: () => void;
}

export function SettlementFilters({
  dateRange,
  status,
  searchQuery,
  onDateRangeChange,
  onStatusChange,
  onSearchChange,
  onExport,
}: SettlementFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* 기간 필터 */}
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="기간 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">최근 7일</SelectItem>
          <SelectItem value="30days">최근 30일</SelectItem>
          <SelectItem value="90days">최근 90일</SelectItem>
          <SelectItem value="thisMonth">이번 달</SelectItem>
          <SelectItem value="lastMonth">지난 달</SelectItem>
          <SelectItem value="all">전체</SelectItem>
        </SelectContent>
      </Select>

      {/* 상태 필터 */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="정산 상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="EXPECTED">정산예정</SelectItem>
          <SelectItem value="IN_PROGRESS">정산중</SelectItem>
          <SelectItem value="DONE">정산완료</SelectItem>
          <SelectItem value="HOLD">정산보류</SelectItem>
        </SelectContent>
      </Select>

      {/* 검색 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="주문번호, 상품명 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* CSV 내보내기 */}
      {onExport && (
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          CSV 내보내기
        </Button>
      )}
    </div>
  );
}
