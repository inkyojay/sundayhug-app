/**
 * 보증서 관리 - 전체 목록 (관리자용)
 *
 * 기능:
 * - 보증서 목록 조회/검색/필터
 * - 인라인 상태 변경
 * - 일괄 승인/거절
 * - 체크박스로 선택 후 일괄 삭제
 * - CSV 내보내기
 * - 정렬 기능
 */
import type { Route } from "./+types/warranty-list";

import {
  ShieldCheckIcon,
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  Trash2Icon,
  AlertTriangleIcon,
  DownloadIcon,
  ExternalLinkIcon,
  CheckIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  CalendarIcon,
  UserIcon,
  PackageIcon,
  TruckIcon,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/core/components/ui/alert-dialog";

import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

import {
  getWarrantyStats,
  getWarrantyList,
  deleteWarranties,
  bulkUpdateWarrantyStatus,
} from "../lib/warranty.server";
import {
  WARRANTY_STATUS_CONFIG,
  buildWarrantyListUrl,
  generateWarrantyCsvData,
  formatDate,
} from "../lib/warranty.shared";

export const meta: Route.MetaFunction = () => {
  return [{ title: `보증서 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limitParam = url.searchParams.get("limit") || "50";
  const limit = parseInt(limitParam);
  const sortBy = url.searchParams.get("sortBy") || "created_at";
  const sortOrder = (url.searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  // 통계 데이터
  const stats = await getWarrantyStats(supabase);

  // 보증서 목록 조회
  const { warranties, totalCount, currentPage, totalPages } = await getWarrantyList(
    supabase,
    {
      search,
      statusFilter,
      page,
      limit,
      sortBy,
      sortOrder,
    }
  );

  return {
    warranties,
    stats,
    totalCount,
    currentPage,
    totalPages,
    limit,
    search,
    statusFilter,
    sortBy,
    sortOrder,
  };
}

// Action (삭제, 상태 변경)
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  // 삭제
  if (actionType === "delete") {
    const idsJson = formData.get("ids") as string;
    const ids = JSON.parse(idsJson) as string[];

    return deleteWarranties(adminClient, ids);
  }

  // 상태 변경 (단일)
  if (actionType === "updateStatus") {
    const id = formData.get("id") as string;
    const newStatus = formData.get("status") as string;
    const rejectionReason = formData.get("rejectionReason") as string;

    return bulkUpdateWarrantyStatus(adminClient, [id], newStatus, rejectionReason);
  }

  // 일괄 상태 변경
  if (actionType === "bulkUpdateStatus") {
    const idsJson = formData.get("ids") as string;
    const ids = JSON.parse(idsJson) as string[];
    const newStatus = formData.get("status") as string;
    const rejectionReason = formData.get("rejectionReason") as string;

    return bulkUpdateWarrantyStatus(adminClient, ids, newStatus, rejectionReason);
  }

  return { success: false, error: "알 수 없는 액션입니다." };
}

// 상태별 배지 스타일
const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "승인 대기", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "승인 완료", className: "bg-green-100 text-green-800" },
  rejected: { label: "거절", className: "bg-red-100 text-red-800" },
  expired: { label: "만료", className: "bg-gray-100 text-gray-800" },
};

export default function WarrantyList({ loaderData }: Route.ComponentProps) {
  const { warranties, stats, totalCount, currentPage, totalPages, limit, search, statusFilter, sortBy, sortOrder } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const isProcessing = fetcher.state === "submitting";
  const hasHandledRef = useRef(false);

  // 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && !hasHandledRef.current) {
      hasHandledRef.current = true;
      if ((fetcher.data as any).success) {
        setMessage(`✅ ${(fetcher.data as any).message}`);
        setSelectedIds(new Set());
        setShowDeleteDialog(false);
        setShowBulkApproveDialog(false);
        setShowBulkRejectDialog(false);
        setRejectionReason("");
        revalidator.revalidate();
      } else {
        setMessage(`❌ ${(fetcher.data as any).error}`);
      }
      setTimeout(() => setMessage(null), 5000);
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
    const newLimit = overrides.limit !== undefined ? overrides.limit : String(limit);
    const newSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const newSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;

    if (newSearch) params.set("search", newSearch);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newPage && newPage !== "1") params.set("page", newPage);
    if (newLimit && newLimit !== "50") params.set("limit", newLimit);
    if (newSortBy && newSortBy !== "created_at") params.set("sortBy", newSortBy);
    if (newSortOrder && newSortOrder !== "desc") params.set("sortOrder", newSortOrder);
    
    const queryString = params.toString();
    return `/dashboard/warranty${queryString ? `?${queryString}` : ""}`;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      window.location.href = buildUrl({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      window.location.href = buildUrl({ sortBy: column, sortOrder: "desc" });
    }
  };

  const SortableHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/80 select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          sortOrder === "asc" ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
        )}
      </div>
    </TableHead>
  );

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

  // 일괄 승인
  const handleBulkApprove = () => {
    fetcher.submit(
      { actionType: "bulkUpdateStatus", ids: JSON.stringify(Array.from(selectedIds)), status: "approved" },
      { method: "POST" }
    );
  };

  // 일괄 거절
  const handleBulkReject = () => {
    fetcher.submit(
      { 
        actionType: "bulkUpdateStatus", 
        ids: JSON.stringify(Array.from(selectedIds)), 
        status: "rejected",
        rejectionReason,
      },
      { method: "POST" }
    );
  };

  // 인라인 상태 변경
  const handleInlineStatusChange = (id: string, newStatus: string) => {
    fetcher.submit(
      { actionType: "updateStatus", id, status: newStatus },
      { method: "POST" }
    );
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const headers = ["보증서번호", "구매자명", "연락처", "제품명", "옵션", "송장번호", "상태", "보증시작", "보증종료", "등록일"];
    const rows = warranties.map((w: any) => [
      w.warranty_number,
      w.buyer_name || "",
      w.customer_phone || "",
      w.product_name || "",
      w.product_option || "",
      w.tracking_number || "",
      statusConfig[w.status]?.label || w.status,
      w.warranty_start ? new Date(w.warranty_start).toLocaleDateString("ko-KR") : "",
      w.warranty_end ? new Date(w.warranty_end).toLocaleDateString("ko-KR") : "",
      new Date(w.created_at).toLocaleDateString("ko-KR"),
    ]);
    
    const csvContent = [headers.join(","), ...rows.map((r: any) => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warranties_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const isAllSelected = warranties.length > 0 && selectedIds.size === warranties.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < warranties.length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 bg-slate-50 min-h-screen">
      {/* 결과 메시지 */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 text-slate-900">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
            보증서 관리
          </h1>
          <p className="text-sm text-slate-500">디지털 보증서 발급 현황을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => revalidator.revalidate()} className="text-slate-600">
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${revalidator.state === "loading" ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-slate-600">
            <DownloadIcon className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
          {stats.pending_count > 0 && (
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600">
              <a href="/dashboard/warranty/pending">
                <ClockIcon className="h-4 w-4 mr-2" />
                승인 대기 ({stats.pending_count})
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* 통계 카드 - 컴팩트 스타일 */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <button
          onClick={() => handleStatusChange("all")}
          className={`p-4 rounded-lg border text-left transition-all ${statusFilter === "all" ? "bg-indigo-50 border-indigo-300 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-slate-500">전체</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total_warranties.toLocaleString()}</div>
        </button>
        <button
          onClick={() => handleStatusChange("pending")}
          className={`p-4 rounded-lg border text-left transition-all ${statusFilter === "pending" ? "bg-amber-50 border-amber-300 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-500">승인 대기</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending_count.toLocaleString()}</div>
        </button>
        <button
          onClick={() => handleStatusChange("approved")}
          className={`p-4 rounded-lg border text-left transition-all ${statusFilter === "approved" ? "bg-emerald-50 border-emerald-300 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500">승인 완료</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.approved_count.toLocaleString()}</div>
        </button>
        <button
          onClick={() => handleStatusChange("rejected")}
          className={`p-4 rounded-lg border text-left transition-all ${statusFilter === "rejected" ? "bg-red-50 border-red-300 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircleIcon className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-slate-500">거절</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected_count.toLocaleString()}</div>
        </button>
        <div className="p-4 rounded-lg bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-slate-500">이번 주</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.this_week.toLocaleString()}</div>
        </div>
      </div>

      {/* 검색 & 필터 - 컴팩트 스타일 */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border border-slate-200 p-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="보증서번호, 송장번호, 연락처, 구매자명..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 border-slate-200"
            />
          </div>
          <Button type="submit" size="sm" className="h-9">검색</Button>
        </form>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px] h-9 border-slate-200">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="pending">승인 대기</SelectItem>
              <SelectItem value="approved">승인 완료</SelectItem>
              <SelectItem value="rejected">거절</SelectItem>
              <SelectItem value="expired">만료</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={String(limit)} 
            onValueChange={(v) => window.location.href = buildUrl({ limit: v })}
          >
            <SelectTrigger className="w-[90px] h-9 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[50, 100, 500, 1000].map(n => (
                <SelectItem key={n} value={String(n)}>{n}개</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 일괄 처리 버튼 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size}개 선택됨
          </span>
          <div className="h-4 w-px bg-blue-300" />
          <Button size="sm" onClick={() => setShowBulkApproveDialog(true)} className="h-8 bg-emerald-600 hover:bg-emerald-700">
            <CheckIcon className="h-3.5 w-3.5 mr-1" />
            승인
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBulkRejectDialog(true)} className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50">
            <XIcon className="h-3.5 w-3.5 mr-1" />
            거절
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDeleteDialog(true)} className="h-8 border-red-300 text-red-700 hover:bg-red-50">
            <Trash2Icon className="h-3.5 w-3.5 mr-1" />
            삭제
          </Button>
        </div>
      )}

      {/* 보증서 테이블 - Airtable 스타일 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">보증서 목록</span>
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
              {totalCount.toLocaleString()}건
            </Badge>
          </div>
          {search && (
            <span className="text-xs text-slate-500">
              "{search}" 검색 결과
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200">
                <TableHead className="w-[40px] text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className={isSomeSelected ? "opacity-50" : ""}
                  />
                </TableHead>
                <SortableHeader column="warranty_number" className="text-xs font-medium text-slate-600 w-[150px]">
                  보증서번호
                </SortableHeader>
                <SortableHeader column="buyer_name" className="text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    구매자
                  </div>
                </SortableHeader>
                <SortableHeader column="product_name" className="text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1">
                    <PackageIcon className="h-3 w-3" />
                    제품
                  </div>
                </SortableHeader>
                <SortableHeader column="tracking_number" className="text-xs font-medium text-slate-600 w-[130px]">
                  <div className="flex items-center gap-1">
                    <TruckIcon className="h-3 w-3" />
                    송장번호
                  </div>
                </SortableHeader>
                <SortableHeader column="warranty_start" className="text-xs font-medium text-slate-600 w-[160px]">
                  보증기간
                </SortableHeader>
                <SortableHeader column="status" className="text-xs font-medium text-slate-600 w-[110px]">
                  상태
                </SortableHeader>
                <SortableHeader column="created_at" className="text-xs font-medium text-slate-600 w-[100px]">
                  등록일
                </SortableHeader>
                <TableHead className="text-xs font-medium text-slate-600 w-[60px] text-center">
                  상세
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warranties.map((item: any, index: number) => (
                <TableRow 
                  key={item.id}
                  className={`transition-colors ${selectedIds.has(item.id) ? "bg-blue-50/70" : index % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-slate-100/70`}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {item.warranty_number}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-800">{item.buyer_name || "-"}</div>
                    {item.customer_phone && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.customer_phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[220px]">
                      <div className="truncate text-sm text-slate-700">{item.product_name || "-"}</div>
                      {item.product_option && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {item.product_option}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {item.tracking_number || <span className="text-slate-400">-</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.warranty_start && item.warranty_end ? (
                      <div className="text-slate-600">
                        <div>{new Date(item.warranty_start).toLocaleDateString("ko-KR")}</div>
                        <div className="text-slate-400">
                          ~ {new Date(item.warranty_end).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">미발급</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.status === "pending" ? (
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          onClick={() => handleInlineStatusChange(item.id, "approved")}
                          disabled={isProcessing}
                          title="승인"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          onClick={() => handleInlineStatusChange(item.id, "rejected")}
                          disabled={isProcessing}
                          title="거절"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Badge 
                        variant="secondary"
                        className={`text-xs font-medium ${
                          item.status === "approved" 
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                            : item.status === "rejected"
                            ? "bg-red-100 text-red-700 hover:bg-red-100"
                            : item.status === "expired"
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {statusConfig[item.status]?.label || item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell className="text-center">
                    <a 
                      href={`/dashboard/warranty/${item.id}`}
                      className="inline-flex p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
              {warranties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheckIcon className="h-8 w-8 text-slate-300" />
                      <p>{search || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 보증서가 없습니다"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              페이지 <span className="font-medium text-slate-700">{currentPage}</span> / {totalPages}
              <span className="ml-2 text-slate-400">({((currentPage - 1) * limit + 1).toLocaleString()} - {Math.min(currentPage * limit, totalCount).toLocaleString()} / {totalCount.toLocaleString()})</span>
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}
                className="h-8 px-3 text-xs"
              >
                이전
              </Button>
              {/* 페이지 번호 버튼들 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => window.location.href = buildUrl({ page: String(pageNum) })}
                    className={`h-8 w-8 p-0 text-xs ${pageNum === currentPage ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}
                className="h-8 px-3 text-xs"
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangleIcon className="h-5 w-5" />
              </div>
              보증서 삭제
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 pt-2">
              선택한 <span className="font-semibold text-slate-800">{selectedIds.size}개</span>의 보증서를 삭제하시겠습니까?
              <br />
              <span className="text-red-500 text-xs mt-1 block">⚠️ 이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={isProcessing} className="mt-0">취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700 text-white" 
              disabled={isProcessing}
            >
              {isProcessing ? "삭제 중..." : `${selectedIds.size}개 삭제`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일괄 승인 다이얼로그 */}
      <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-emerald-100">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              </div>
              일괄 승인
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              선택한 <span className="font-semibold text-slate-800">{selectedIds.size}개</span>의 보증서를 승인하시겠습니까?
              <br />
              <span className="text-emerald-600 text-xs mt-1 block">✓ 5년 보증 기간이 자동으로 설정됩니다.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowBulkApproveDialog(false)} disabled={isProcessing}>
              취소
            </Button>
            <Button onClick={handleBulkApprove} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
              {isProcessing ? "처리 중..." : `${selectedIds.size}개 승인`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 거절 다이얼로그 */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-amber-100">
                <XCircleIcon className="h-5 w-5 text-amber-600" />
              </div>
              일괄 거절
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              선택한 <span className="font-semibold text-slate-800">{selectedIds.size}개</span>의 보증서를 거절하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700">거절 사유 (선택)</label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거절 사유를 입력하세요"
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowBulkRejectDialog(false)} disabled={isProcessing}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkReject} 
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isProcessing ? "처리 중..." : `${selectedIds.size}개 거절`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
