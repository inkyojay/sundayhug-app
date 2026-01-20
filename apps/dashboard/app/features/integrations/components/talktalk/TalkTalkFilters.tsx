/**
 * 톡톡 필터 컴포넌트
 */

import { Search, X } from "lucide-react";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Button } from "~/core/components/ui/button";

export interface TalkTalkFilterValues {
  status: string;
  search: string;
}

interface TalkTalkFiltersProps {
  filters: TalkTalkFilterValues;
  onFiltersChange: (filters: TalkTalkFilterValues) => void;
}

export function TalkTalkFilters({ filters, onFiltersChange }: TalkTalkFiltersProps) {
  const handleStatusChange = (status: string) => {
    onFiltersChange({ ...filters, status });
  };

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleClearFilters = () => {
    onFiltersChange({ status: "all", search: "" });
  };

  const hasActiveFilters = filters.status !== "all" || filters.search !== "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 검색 */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="사용자 ID 또는 메시지 검색..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 상태 필터 */}
      <Select value={filters.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="active">진행중</SelectItem>
          <SelectItem value="handover">상담원 응대</SelectItem>
          <SelectItem value="completed">완료</SelectItem>
        </SelectContent>
      </Select>

      {/* 필터 초기화 */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="h-4 w-4 mr-1" />
          필터 초기화
        </Button>
      )}
    </div>
  );
}
