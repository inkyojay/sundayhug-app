/**
 * 보증서 관리 - 전체 목록 (관리자용)
 */
import type { Route } from "./+types/warranty-list";

import {
  ShieldCheckIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `보증서 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // 통계 데이터
  const { data: statsData } = await supabase
    .from("warranty_stats")
    .select("*")
    .single();

  const stats = statsData || {
    total_warranties: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    this_week: 0,
  };

  // 보증서 목록 쿼리
  let query = supabase
    .from("warranties")
    .select(`
      id,
      warranty_number,
      tracking_number,
      customer_phone,
      product_name,
      product_option,
      warranty_start,
      warranty_end,
      status,
      created_at,
      customers (
        name,
        kakao_nickname
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // 상태 필터
  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  // 검색 (보증서번호, 송장번호, 연락처)
  if (search) {
    query = query.or(`warranty_number.ilike.%${search}%,tracking_number.ilike.%${search}%,customer_phone.ilike.%${search}%`);
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1);

  const { data: warranties, count } = await query;

  return {
    warranties: warranties || [],
    stats,
    totalCount: count || 0,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / limit),
    search,
    statusFilter,
  };
}

// 상태별 배지 스타일
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "승인 대기", variant: "outline" },
  approved: { label: "승인 완료", variant: "default" },
  rejected: { label: "거절", variant: "destructive" },
  expired: { label: "만료", variant: "secondary" },
};

export default function WarrantyList({ loaderData }: Route.ComponentProps) {
  const { warranties, stats, totalCount, currentPage, totalPages, search, statusFilter } = loaderData;
  const [searchInput, setSearchInput] = useState(search);

  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newStatus = overrides.status !== undefined ? overrides.status : statusFilter;
    const newPage = overrides.page !== undefined ? overrides.page : "1";

    if (newSearch) params.set("search", newSearch);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newPage && newPage !== "1") params.set("page", newPage);
    
    const queryString = params.toString();
    return `/dashboard/warranty${queryString ? `?${queryString}` : ""}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleStatusChange = (value: string) => {
    window.location.href = buildUrl({ status: value === "all" ? null : value });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6" />
            보증서 관리
          </h1>
          <p className="text-muted-foreground">디지털 보증서 발급 현황</p>
        </div>
        <Button asChild>
          <a href="/dashboard/warranty/pending">
            <ClockIcon className="h-4 w-4 mr-2" />
            승인 대기 ({stats.pending_count})
          </a>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusChange("all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 보증서</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_warranties}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusChange("pending")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-yellow-500" />
              승인 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending_count}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusChange("approved")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              승인 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.approved_count}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusChange("rejected")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <XCircleIcon className="h-4 w-4 text-destructive" />
              거절
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.rejected_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">이번 주 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.this_week}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="보증서번호, 송장번호, 연락처로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">검색</Button>
            </form>

            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                  <SelectItem value="rejected">거절</SelectItem>
                  <SelectItem value="expired">만료</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보증서 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>보증서 목록</CardTitle>
          <CardDescription>
            총 {totalCount.toLocaleString()}개
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">보증서번호</TableHead>
                <TableHead>고객명</TableHead>
                <TableHead>제품</TableHead>
                <TableHead>송장번호</TableHead>
                <TableHead>보증기간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="w-[80px]">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warranties.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {item.warranty_number}
                  </TableCell>
                  <TableCell>
                    {item.customers?.name || item.customers?.kakao_nickname || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="truncate text-sm">{item.product_name || "-"}</div>
                      {item.product_option && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.product_option}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.tracking_number}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.warranty_start && item.warranty_end ? (
                      <>
                        {new Date(item.warranty_start).toLocaleDateString("ko-KR")}
                        <br />
                        ~ {new Date(item.warranty_end).toLocaleDateString("ko-KR")}
                      </>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[item.status]?.variant || "outline"}>
                      {statusConfig[item.status]?.label || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/dashboard/warranty/${item.id}`}>보기</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {warranties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 보증서가 없습니다"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                페이지 {currentPage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

