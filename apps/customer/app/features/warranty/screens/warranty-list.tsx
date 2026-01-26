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
import { useTranslation } from "react-i18next";
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
      // adminClient 사용 (service_role key로 RLS bypass)
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

export default function WarrantyList({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation(["warranty", "common"]);
  const { warranties, stats, totalCount, currentPage, totalPages, search, statusFilter } = loaderData;
  const [searchInput, setSearchInput] = useState(search);

  // 상태별 배지 스타일
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: t("warranty:admin.warrantyManagement.status.pending"), variant: "outline" },
    approved: { label: t("warranty:admin.warrantyManagement.status.approved"), variant: "default" },
    rejected: { label: t("warranty:admin.warrantyManagement.status.rejected"), variant: "destructive" },
    expired: { label: t("warranty:admin.warrantyManagement.status.expired"), variant: "secondary" },
  };
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
              {t("warranty:admin.warrantyManagement.deleteDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("warranty:admin.warrantyManagement.deleteDialog.description", { count: selectedIds.size })}
              <br />
              <span className="text-destructive">{t("warranty:admin.warrantyManagement.deleteDialog.warning")}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              {t("common:buttons.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t("warranty:admin.warrantyManagement.deleteDialog.deleting") : t("common:buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6" />
            {t("warranty:admin.warrantyManagement.title")}
          </h1>
          <p className="text-muted-foreground">{t("warranty:admin.warrantyManagement.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2Icon className="h-4 w-4 mr-2" />
              {t("warranty:admin.warrantyManagement.deleteSelected", { count: selectedIds.size })}
            </Button>
          )}
          <Button asChild>
            <a href="/dashboard/warranty/pending">
              <ClockIcon className="h-4 w-4 mr-2" />
              {t("warranty:admin.warrantyManagement.pendingApproval", { count: stats.pending_count })}
            </a>
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className="cursor-pointer hover:bg-muted/50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          onClick={() => handleStatusChange("all")}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStatusChange("all");
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("warranty:admin.warrantyManagement.stats.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_warranties}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          onClick={() => handleStatusChange("pending")}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStatusChange("pending");
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-yellow-500" />
              {t("warranty:admin.warrantyManagement.stats.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending_count}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          onClick={() => handleStatusChange("approved")}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStatusChange("approved");
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              {t("warranty:admin.warrantyManagement.stats.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.approved_count}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          onClick={() => handleStatusChange("rejected")}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStatusChange("rejected");
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <XCircleIcon className="h-4 w-4 text-destructive" />
              {t("warranty:admin.warrantyManagement.stats.rejected")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.rejected_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("warranty:admin.warrantyManagement.stats.thisWeek")}</CardTitle>
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
                  placeholder={t("warranty:admin.warrantyManagement.searchPlaceholder")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">{t("warranty:admin.warrantyManagement.search")}</Button>
            </form>

            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("warranty:admin.warrantyManagement.filter.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("warranty:admin.warrantyManagement.filter.all")}</SelectItem>
                  <SelectItem value="pending">{t("warranty:admin.warrantyManagement.status.pending")}</SelectItem>
                  <SelectItem value="approved">{t("warranty:admin.warrantyManagement.status.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("warranty:admin.warrantyManagement.status.rejected")}</SelectItem>
                  <SelectItem value="expired">{t("warranty:admin.warrantyManagement.status.expired")}</SelectItem>
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
              <CardTitle>{t("warranty:admin.warrantyManagement.warrantyList")}</CardTitle>
              <CardDescription>
                {t("warranty:admin.warrantyManagement.totalItems", { count: totalCount.toLocaleString() })}
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-primary">
                    {t("warranty:admin.warrantyManagement.selectedItems", { count: selectedIds.size })}
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
                    aria-label={t("warranty:admin.warrantyManagement.selectAll")}
                    className={isSomeSelected ? "opacity-50" : ""}
                  />
                </TableHead>
                <TableHead className="w-[180px]">{t("warranty:admin.warrantyManagement.table.warrantyNumber")}</TableHead>
                <TableHead>{t("warranty:admin.warrantyManagement.table.buyerName")}</TableHead>
                <TableHead>{t("warranty:admin.warrantyManagement.table.product")}</TableHead>
                <TableHead>{t("warranty:admin.warrantyManagement.table.trackingNumber")}</TableHead>
                <TableHead>{t("warranty:admin.warrantyManagement.table.warrantyPeriod")}</TableHead>
                <TableHead>{t("warranty:admin.warrantyManagement.table.status")}</TableHead>
                <TableHead>{t("warranty:admin.warrantyManagement.table.registrationDate")}</TableHead>
                <TableHead className="w-[80px]">{t("warranty:admin.warrantyManagement.table.detail")}</TableHead>
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
                      aria-label={t("warranty:admin.warrantyManagement.selectItem", { number: item.warranty_number })}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.warranty_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.buyer_name || "-"}</div>
                    {item.customers?.name && item.customers.name !== item.buyer_name && (
                      <div className="text-xs text-muted-foreground">{t("warranty:admin.warrantyManagement.table.member", { name: item.customers.name })}</div>
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
                      <a href={`/dashboard/warranty/${item.id}`}>{t("warranty:admin.warrantyManagement.table.view")}</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {warranties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {search || statusFilter !== "all" ? t("warranty:admin.warrantyManagement.noSearchResults") : t("warranty:admin.warrantyManagement.noWarranties")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t("warranty:admin.asManagement.pagination.page", { current: currentPage, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}
                >
                  {t("warranty:admin.asManagement.pagination.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}
                >
                  {t("warranty:admin.asManagement.pagination.next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
