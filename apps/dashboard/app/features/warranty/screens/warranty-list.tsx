/**
 * 보증서 관리 - 전체 목록 (관리자용)
 * 
 * 기능:
 * - 보증서 목록 조회/검색/필터
 * - 체크박스로 선택 후 일괄 삭제
 */
import type { Route } from "./+types/warranty-list";

import {
  ShieldCheckIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  Trash2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";

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
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

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
      buyer_name,
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

// 삭제 Action (adminClient 사용 - RLS bypass)
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "delete") {
    const idsJson = formData.get("ids") as string;
    const ids = JSON.parse(idsJson) as string[];

    if (ids.length === 0) {
      return { success: false, error: "삭제할 항목을 선택해주세요." };
    }

    try {
      // 1. 먼저 관련 review_submissions 삭제 (외래키 제약조건)
      const { error: reviewError } = await adminClient
        .from("review_submissions")
        .delete()
        .in("warranty_id", ids);

      if (reviewError) {
        console.error("리뷰 삭제 오류:", reviewError);
        // 리뷰가 없어도 에러는 무시하고 진행
      }

      // 2. adminClient 사용 (service_role key로 RLS bypass)
      const { error } = await adminClient
        .from("warranties")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("삭제 오류:", error);
        return { success: false, error: `삭제 중 오류가 발생했습니다: ${error.message}` };
      }

      return { success: true, message: `${ids.length}개 보증서가 삭제되었습니다.` };
    } catch (error: any) {
      console.error("삭제 예외:", error);
      return { success: false, error: error.message || "삭제 중 오류가 발생했습니다." };
    }
  }

  return { success: false, error: "알 수 없는 액션입니다." };
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const isDeleting = fetcher.state === "submitting";
  const hasHandledRef = useRef(false);

  // 삭제 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && !hasHandledRef.current) {
      hasHandledRef.current = true;
      if (fetcher.data.success) {
        setDeleteMessage(`✅ ${fetcher.data.message}`);
        setSelectedIds(new Set());
        setShowDeleteDialog(false);
        revalidator.revalidate();
      } else {
        setDeleteMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setDeleteMessage(null), 5000);
    }
    if (fetcher.state === "submitting") {
      hasHandledRef.current = false;
    }
  }, [fetcher.data, fetcher.state, revalidator]);

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

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(warranties.map((w: any) => w.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 개별 선택
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // 삭제 실행
  const handleDelete = () => {
    fetcher.submit(
      { actionType: "delete", ids: JSON.stringify(Array.from(selectedIds)) },
      { method: "POST" }
    );
  };

  const isAllSelected = warranties.length > 0 && selectedIds.size === warranties.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < warranties.length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 삭제 결과 메시지 */}
      {deleteMessage && (
        <div className={`p-4 rounded-lg ${deleteMessage.startsWith("✅") ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
          {deleteMessage}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon className="h-5 w-5" />
              보증서 삭제
            </DialogTitle>
            <DialogDescription>
              선택한 <strong>{selectedIds.size}개</strong>의 보증서를 삭제하시겠습니까?
              <br />
              <span className="text-destructive">이 작업은 되돌릴 수 없습니다.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6" />
            보증서 관리
          </h1>
          <p className="text-muted-foreground">디지털 보증서 발급 현황</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2Icon className="h-4 w-4 mr-2" />
              선택 삭제 ({selectedIds.size})
            </Button>
          )}
          <Button asChild>
            <a href="/dashboard/warranty/pending">
              <ClockIcon className="h-4 w-4 mr-2" />
              승인 대기 ({stats.pending_count})
            </a>
          </Button>
        </div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>보증서 목록</CardTitle>
              <CardDescription>
                총 {totalCount.toLocaleString()}개
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-primary">
                    ({selectedIds.size}개 선택됨)
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="전체 선택"
                    className={isSomeSelected ? "opacity-50" : ""}
                  />
                </TableHead>
                <TableHead className="w-[180px]">보증서번호</TableHead>
                <TableHead>구매자명</TableHead>
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
                <TableRow 
                  key={item.id}
                  className={selectedIds.has(item.id) ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                      aria-label={`${item.warranty_number} 선택`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.warranty_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.buyer_name || "-"}</div>
                    {item.customers?.name && item.customers.name !== item.buyer_name && (
                      <div className="text-xs text-muted-foreground">회원: {item.customers.name}</div>
                    )}
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
