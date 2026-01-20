/**
 * 클레임 필터 컴포넌트
 *
 * 기간, 유형, 상태, 검색어 필터
 */

import { Search } from "lucide-react";

import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

export type ClaimTypeFilter = "all" | "CANCEL" | "RETURN" | "EXCHANGE";
export type ClaimStatusFilter = "all" | "REQUEST" | "DONE" | "REJECT" | "HOLD";

interface ClaimFiltersProps {
  dateRange: string;
  claimType: ClaimTypeFilter;
  claimStatus: ClaimStatusFilter;
  searchQuery: string;
  onDateRangeChange: (value: string) => void;
  onClaimTypeChange: (value: ClaimTypeFilter) => void;
  onClaimStatusChange: (value: ClaimStatusFilter) => void;
  onSearchChange: (value: string) => void;
}

export function ClaimFilters({
  dateRange,
  claimType,
  claimStatus,
  searchQuery,
  onDateRangeChange,
  onClaimTypeChange,
  onClaimStatusChange,
  onSearchChange,
}: ClaimFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* 기간 필터 */}
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="기간 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">오늘</SelectItem>
          <SelectItem value="7days">최근 7일</SelectItem>
          <SelectItem value="30days">최근 30일</SelectItem>
          <SelectItem value="90days">최근 90일</SelectItem>
          <SelectItem value="all">전체</SelectItem>
        </SelectContent>
      </Select>

      {/* 유형 필터 */}
      <Select value={claimType} onValueChange={onClaimTypeChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="클레임 유형" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 유형</SelectItem>
          <SelectItem value="CANCEL">취소</SelectItem>
          <SelectItem value="RETURN">반품</SelectItem>
          <SelectItem value="EXCHANGE">교환</SelectItem>
        </SelectContent>
      </Select>

      {/* 상태 필터 */}
      <Select value={claimStatus} onValueChange={onClaimStatusChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="처리 상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="REQUEST">요청</SelectItem>
          <SelectItem value="DONE">완료</SelectItem>
          <SelectItem value="REJECT">거부</SelectItem>
          <SelectItem value="HOLD">보류</SelectItem>
        </SelectContent>
      </Select>

      {/* 검색 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="주문번호, 상품명, 고객명 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
