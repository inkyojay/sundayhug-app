/**
 * 문의 필터 컴포넌트
 *
 * Shopify 스타일의 필터 영역
 * - 기간 선택 (오늘, 7일, 30일, 전체)
 * - 상태 필터
 * - 검색
 * - 새로고침 버튼
 * - 상품 필터 배지 (옵션)
 */

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Calendar, Filter, X } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Badge } from "~/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

export type InquiryStatusFilter = "all" | "WAITING" | "ANSWERED" | "HOLDING";

export interface InquiryFilterValues {
  dateRange: string;
  status: InquiryStatusFilter;
  searchQuery: string;
}

interface InquiryFiltersProps {
  filters: InquiryFilterValues;
  onFilterChange: (filters: InquiryFilterValues) => void;
  onRefresh: () => void;
  isLoading: boolean;
  productId?: string;
  productName?: string;
  onRemoveProductFilter?: () => void;
}

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "오늘" },
  { value: "7days", label: "최근 7일" },
  { value: "30days", label: "최근 30일" },
  { value: "all", label: "전체" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "전체 상태" },
  { value: "WAITING", label: "미답변" },
  { value: "ANSWERED", label: "답변완료" },
  { value: "HOLDING", label: "보류중" },
];

export function InquiryFilters({
  filters,
  onFilterChange,
  onRefresh,
  isLoading,
  productId,
  productName,
  onRemoveProductFilter,
}: InquiryFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  // Debounce 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchQuery) {
        onFilterChange({ ...filters, searchQuery: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters, onFilterChange]);

  const handleDateRangeChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filters, dateRange: value });
    },
    [filters, onFilterChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filters, status: value as InquiryStatusFilter });
    },
    [filters, onFilterChange]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Product Filter Badge */}
      {productId && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-2">
            <span>{productName ? `상품: ${productName}` : `상품 ID: ${productId}`}</span>
            {onRemoveProductFilter && (
              <button
                onClick={onRemoveProductFilter}
                className="hover:bg-secondary-foreground/20 rounded-sm transition-colors"
                aria-label="Remove product filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {/* 기간 선택 */}
      <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="기간" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 상태 필터 */}
      <Select value={filters.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 검색 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="문의번호, 제목, 내용 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 새로고침 */}
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>
      </div>
    </div>
  );
}
