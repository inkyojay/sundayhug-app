/**
 * A/S 관리 - 목록 (관리자용)
 */
import type { Route } from "./+types/as-list";

import {
  WrenchIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
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

import { getAsRequestList, getAsStats } from "../lib/warranty.server";
import { AS_STATUS_CONFIG, AS_TYPE_CONFIG, buildAsListUrl } from "../lib/warranty.shared";

export const meta: Route.MetaFunction = () => {
  return [{ title: `A/S 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";
  const typeFilter = url.searchParams.get("type") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;

  // A/S 신청 목록 조회
  const { asRequests, totalCount, currentPage, totalPages } = await getAsRequestList(
    supabase,
    {
      statusFilter,
      typeFilter,
      page,
      limit,
    }
  );

  // 통계 조회
  const stats = await getAsStats(supabase);

  return {
    asRequests,
    stats,
    totalCount,
    currentPage,
    totalPages,
    statusFilter,
    typeFilter,
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "접수", variant: "outline" },
  processing: { label: "처리중", variant: "secondary" },
  completed: { label: "완료", variant: "default" },
  cancelled: { label: "취소", variant: "destructive" },
};

const typeConfig: Record<string, string> = {
  repair: "수리",
  exchange: "교환",
  refund: "환불",
  inquiry: "문의",
};

export default function ASList({ loaderData }: Route.ComponentProps) {
  const { asRequests, stats, totalCount, currentPage, totalPages, statusFilter, typeFilter } = loaderData;

  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newStatus = overrides.status !== undefined ? overrides.status : statusFilter;
    const newType = overrides.type !== undefined ? overrides.type : typeFilter;
    const newPage = overrides.page !== undefined ? overrides.page : "1";

    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newType && newType !== "all") params.set("type", newType);
    if (newPage && newPage !== "1") params.set("page", newPage);
    
    const queryString = params.toString();
    return `/dashboard/warranty/as${queryString ? `?${queryString}` : ""}`;
  };

  const handleFilterChange = (filterType: string, value: string) => {
    window.location.href = buildUrl({ [filterType]: value === "all" ? null : value });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WrenchIcon className="h-6 w-6" />
            A/S 관리
          </h1>
          <p className="text-muted-foreground">A/S 신청 현황</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/dashboard/warranty">← 보증서 목록</a>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "received")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
              접수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.received}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "processing")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-blue-500" />
              처리중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "completed")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange("status", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="received">접수</SelectItem>
                <SelectItem value="processing">처리중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => handleFilterChange("type", v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="repair">수리</SelectItem>
                <SelectItem value="exchange">교환</SelectItem>
                <SelectItem value="refund">환불</SelectItem>
                <SelectItem value="inquiry">문의</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* A/S 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>A/S 신청 목록</CardTitle>
          <CardDescription>총 {totalCount}건</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>보증서번호</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>제품</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>신청일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asRequests.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">
                    {item.warranties?.warranty_number || "-"}
                  </TableCell>
                  <TableCell>
                    {item.contact_name || item.warranties?.customers?.name || "-"}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {item.warranties?.product_name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeConfig[item.request_type] || item.request_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {item.issue_description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[item.status]?.variant || "outline"}>
                      {statusConfig[item.status]?.label || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                </TableRow>
              ))}
              {asRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    A/S 신청 내역이 없습니다
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

