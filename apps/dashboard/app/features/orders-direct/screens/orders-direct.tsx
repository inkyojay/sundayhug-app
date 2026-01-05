/**
 * 주문 관리 - Airtable 스타일
 *
 * Cafe24 + 네이버 스마트스토어 직접 연동 주문 관리
 */
import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "react-router";
import {
  SearchIcon,
  RefreshCwIcon,
  CalendarIcon,
  StoreIcon,
  ZapIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  ArrowUpDownIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useFetcher, useRevalidator, useLoaderData } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/core/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/core/components/ui/table";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/core/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/core/components/ui/alert-dialog";

import { OrderStatusBadge, ShopBadge, OrderDetailRow } from "../components";
import {
  getOrders,
  parseOrderQueryParams,
  updateInvoice,
  bulkUpdateStatus,
  bulkDeleteOrders,
  type Order,
} from "../lib/orders.server";
import {
  ORDER_STATUSES,
  buildOrderUrl,
  exportOrdersToCSV,
  getDatePreset,
  formatCurrency,
  formatDate,
} from "../lib/orders.shared";

export const meta: MetaFunction = () => {
  return [{ title: "주문 관리 | Sundayhug Admin" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = parseOrderQueryParams(url);
  const groupBy = url.searchParams.get("groupBy") || "none";

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const result = await getOrders(adminClient, params);

  return {
    ...result,
    currentPage: params.page,
    totalPages: Math.ceil(result.totalCount / params.limit),
    limit: params.limit,
    statusFilter: params.statusFilter,
    shopFilter: params.shopFilter,
    searchQuery: params.searchQuery,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    groupBy,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  if (actionType === "updateInvoice") {
    const result = await updateInvoice(
      adminClient,
      formData.get("orderNo") as string,
      formData.get("shopCd") as string,
      formData.get("invoiceNo") as string,
      formData.get("carrName") as string
    );
    return result.success
      ? { success: true, message: "송장번호가 업데이트되었습니다." }
      : { success: false, error: result.error };
  }

  if (actionType === "bulkUpdateStatus") {
    const orderKeys = JSON.parse(formData.get("orderKeys") as string);
    const newStatus = formData.get("newStatus") as string;
    const result = await bulkUpdateStatus(adminClient, orderKeys, newStatus);
    return { success: true, message: `${result.count}개 주문의 상태가 변경되었습니다.` };
  }

  if (actionType === "bulkDelete") {
    const orderKeys = JSON.parse(formData.get("orderKeys") as string);
    const result = await bulkDeleteOrders(adminClient, orderKeys);
    return { success: true, message: `${result.count}개 주문이 삭제되었습니다.` };
  }

  return { success: false, error: "알 수 없는 액션입니다." };
}

export default function OrdersDirectPage() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const fetcher = useFetcher();
  const cafe24Fetcher = useFetcher();
  const naverFetcher = useFetcher();

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(loaderData.searchQuery);

  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState("");
  const [editCarrier, setEditCarrier] = useState("");

  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");

  const [syncStartDate, setSyncStartDate] = useState(() => getDatePreset(7).from);
  const [syncEndDate, setSyncEndDate] = useState(() => getDatePreset(7).to);
  const [showSyncOptions, setShowSyncOptions] = useState(false);

  const [viewDateFrom, setViewDateFrom] = useState(loaderData.dateFrom || "");
  const [viewDateTo, setViewDateTo] = useState(loaderData.dateTo || "");

  const isSyncingCafe24 = cafe24Fetcher.state === "submitting";
  const isSyncingNaver = naverFetcher.state === "submitting";
  const isProcessing = fetcher.state === "submitting";

  const isAllSelected = loaderData.orders.length > 0 && selectedOrders.size === loaderData.orders.length;
  const isSomeSelected = selectedOrders.size > 0 && selectedOrders.size < loaderData.orders.length;

  // 현재 URL 파라미터
  const currentParams = {
    q: loaderData.searchQuery,
    status: loaderData.statusFilter,
    shop: loaderData.shopFilter,
    dateFrom: loaderData.dateFrom,
    dateTo: loaderData.dateTo,
    sortBy: loaderData.sortBy,
    sortOrder: loaderData.sortOrder,
    limit: String(loaderData.limit),
  };

  const buildUrl = (overrides: Record<string, string | null> = {}) =>
    buildOrderUrl("/dashboard/orders-direct", currentParams, overrides);

  // 동기화 완료 시 새로고침
  useEffect(() => {
    if (cafe24Fetcher.state === "idle" && cafe24Fetcher.data) {
      revalidator.revalidate();
    }
  }, [cafe24Fetcher.state, cafe24Fetcher.data]);

  useEffect(() => {
    if (naverFetcher.state === "idle" && naverFetcher.data) {
      revalidator.revalidate();
    }
  }, [naverFetcher.state, naverFetcher.data]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if ((fetcher.data as any).success) {
        setSelectedOrders(new Set());
        setEditingOrder(null);
        revalidator.revalidate();
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrders(checked ? new Set(loaderData.orders.map((o: any) => o.key)) : new Set());
  };

  const handleSelectOne = (key: string, checked: boolean) => {
    const newSet = new Set(selectedOrders);
    checked ? newSet.add(key) : newSet.delete(key);
    setSelectedOrders(newSet);
  };

  const toggleExpand = (key: string) => {
    const newSet = new Set(expandedOrders);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedOrders(newSet);
  };

  const startEditInvoice = (order: Order) => {
    setEditingOrder(order.key);
    setEditInvoice(order.invoiceNo || "");
    setEditCarrier(order.carrName || "");
  };

  const saveInvoice = (order: Order) => {
    fetcher.submit(
      { actionType: "updateInvoice", orderNo: order.orderNo, shopCd: order.shopCd, invoiceNo: editInvoice, carrName: editCarrier },
      { method: "POST" }
    );
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus) return;
    fetcher.submit(
      { actionType: "bulkUpdateStatus", orderKeys: JSON.stringify(Array.from(selectedOrders)), newStatus: bulkStatus },
      { method: "POST" }
    );
    setShowBulkStatusDialog(false);
  };

  const handleBulkDelete = () => {
    fetcher.submit(
      { actionType: "bulkDelete", orderKeys: JSON.stringify(Array.from(selectedOrders)) },
      { method: "POST" }
    );
    setShowDeleteDialog(false);
  };

  const handleSyncCafe24 = () => {
    const formData = new FormData();
    formData.append("startDate", syncStartDate);
    formData.append("endDate", syncEndDate);
    cafe24Fetcher.submit(formData, { method: "POST", action: "/api/integrations/cafe24/sync-orders" });
  };

  const handleSyncNaver = () => {
    const formData = new FormData();
    formData.append("startDate", syncStartDate);
    formData.append("endDate", syncEndDate);
    naverFetcher.submit(formData, { method: "POST", action: "/api/integrations/naver/sync-orders" });
  };

  const handleSort = (column: string) => {
    const newOrder = loaderData.sortBy === column && loaderData.sortOrder === "asc" ? "desc" : "asc";
    window.location.href = buildUrl({ sortBy: column, sortOrder: newOrder });
  };

  const handleDatePreset = (days: number) => {
    const preset = getDatePreset(days);
    setViewDateFrom(preset.from);
    setViewDateTo(preset.to);
  };

  const handleSyncDatePreset = (days: number) => {
    const preset = getDatePreset(days);
    setSyncStartDate(preset.from);
    setSyncEndDate(preset.to);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ZapIcon className="h-6 w-6 text-yellow-500" />
            주문 관리 (직접연동)
          </h1>
          <p className="text-muted-foreground">카페24, 네이버 스마트스토어 주문 관리</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => exportOrdersToCSV(loaderData.orders)}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSyncOptions(!showSyncOptions)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            {syncStartDate} ~ {syncEndDate}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncCafe24} disabled={isSyncingCafe24}>
            {isSyncingCafe24 ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <StoreIcon className="h-4 w-4 mr-2" />}
            Cafe24
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncNaver} disabled={isSyncingNaver}>
            {isSyncingNaver ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <StoreIcon className="h-4 w-4 mr-2" />}
            네이버
          </Button>
        </div>
      </div>

      {/* 동기화 날짜 선택 */}
      {showSyncOptions && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">시작일:</label>
                <Input type="date" value={syncStartDate} onChange={(e) => setSyncStartDate(e.target.value)} className="w-40" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">종료일:</label>
                <Input type="date" value={syncEndDate} onChange={(e) => setSyncEndDate(e.target.value)} className="w-40" />
              </div>
              <div className="flex gap-2">
                {[7, 30, 90].map((days) => (
                  <Button key={days} variant="outline" size="sm" onClick={() => handleSyncDatePreset(days)}>
                    최근 {days}일
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결과 메시지 */}
      {(cafe24Fetcher.data || naverFetcher.data || fetcher.data) && (
        <div
          className={`p-3 rounded-lg text-sm ${
            (cafe24Fetcher.data as any)?.success || (naverFetcher.data as any)?.success || (fetcher.data as any)?.success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {(cafe24Fetcher.data as any)?.message ||
            (cafe24Fetcher.data as any)?.error ||
            (naverFetcher.data as any)?.message ||
            (naverFetcher.data as any)?.error ||
            (fetcher.data as any)?.message ||
            (fetcher.data as any)?.error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => (window.location.href = buildUrl({ status: "all" }))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.uniqueOrderCount}</div>
          </CardContent>
        </Card>
        {["결제완료", "상품준비중", "배송중", "배송완료", "취소"].map((status) => (
          <Card key={status} className="cursor-pointer hover:bg-muted/50" onClick={() => (window.location.href = buildUrl({ status }))}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loaderData.statusStats[status] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 필터 & 검색 */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-col gap-4" method="GET" action="/dashboard/orders-direct">
            <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">조회 기간:</span>
              <Input type="date" name="dateFrom" value={viewDateFrom} onChange={(e) => setViewDateFrom(e.target.value)} className="w-[140px]" />
              <span className="text-muted-foreground">~</span>
              <Input type="date" name="dateTo" value={viewDateTo} onChange={(e) => setViewDateTo(e.target.value)} className="w-[140px]" />
              {[7, 30, 90].map((days) => (
                <Button key={days} type="button" variant="outline" size="sm" onClick={() => handleDatePreset(days)}>
                  {days}일
                </Button>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => { setViewDateFrom(""); setViewDateTo(""); }}>
                전체
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Select name="status" value={loaderData.statusFilter} onValueChange={(v) => (window.location.href = buildUrl({ status: v }))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="주문 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="shop" value={loaderData.shopFilter} onValueChange={(v) => (window.location.href = buildUrl({ shop: v }))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="쇼핑몰" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 채널</SelectItem>
                  <SelectItem value="cafe24">Cafe24</SelectItem>
                  <SelectItem value="naver">네이버</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-1">
                <Input
                  name="q"
                  placeholder="주문자명, 주문번호, 전화번호, 송장번호"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" variant="secondary">
                  <SearchIcon className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>
              <Select value={String(loaderData.limit)} onValueChange={(v) => (window.location.href = buildUrl({ limit: v }))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[50, 100, 200, 500].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}개씩</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 일괄 처리 버튼 */}
      {selectedOrders.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">{selectedOrders.size}개 선택됨</span>
          <Button size="sm" variant="outline" onClick={() => setShowBulkStatusDialog(true)}>
            상태 변경
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2Icon className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      )}

      {/* 주문 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            {loaderData.uniqueOrderCount}개 주문 ({loaderData.totalItemCount}개 상품)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} className={isSomeSelected ? "opacity-50" : ""} />
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[80px]">채널</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("shop_ord_no")}>
                    <span className="flex items-center gap-1">
                      주문번호 <ArrowUpDownIcon className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>주문자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("ord_time")}>
                    <span className="flex items-center gap-1">
                      주문일시 <ArrowUpDownIcon className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead>송장정보</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loaderData.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      주문이 없습니다. 동기화 버튼을 눌러 주문을 가져오세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  loaderData.orders.map((order: Order) => (
                    <>
                      <TableRow key={order.key} className={selectedOrders.has(order.key) ? "bg-blue-50" : "hover:bg-muted/50"}>
                        <TableCell>
                          <Checkbox checked={selectedOrders.has(order.key)} onCheckedChange={(checked) => handleSelectOne(order.key, !!checked)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpand(order.key)}>
                            {expandedOrders.has(order.key) ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell><ShopBadge shopCd={order.shopCd} /></TableCell>
                        <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                        <TableCell><OrderStatusBadge status={order.ordStatus} /></TableCell>
                        <TableCell className="font-medium">{order.toName || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{order.toTel || order.toHtel || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell className="text-right">{order.totalQty}개</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(order.ordTime)}</TableCell>
                        <TableCell>
                          {editingOrder === order.key ? (
                            <div className="flex items-center gap-1">
                              <Input value={editCarrier} onChange={(e) => setEditCarrier(e.target.value)} placeholder="택배사" className="w-16 h-7 text-xs" />
                              <Input value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)} placeholder="송장번호" className="w-24 h-7 text-xs" />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveInvoice(order)} disabled={isProcessing}>
                                <CheckIcon className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingOrder(null)}>
                                <XIcon className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {order.invoiceNo ? `${order.carrName || ""} ${order.invoiceNo}` : "-"}
                              </span>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditInvoice(order)}>
                                <PencilIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedOrders.has(order.key) && <OrderDetailRow order={order} colSpan={11} />}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {loaderData.totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                페이지 {loaderData.currentPage} / {loaderData.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loaderData.currentPage <= 1}
                  onClick={() => (window.location.href = buildUrl({ page: String(loaderData.currentPage - 1) }))}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loaderData.currentPage >= loaderData.totalPages}
                  onClick={() => (window.location.href = buildUrl({ page: String(loaderData.currentPage + 1) }))}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상태 일괄 변경 다이얼로그 */}
      <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>주문 상태 일괄 변경</DialogTitle>
            <DialogDescription>선택한 {selectedOrders.size}개 주문의 상태를 변경합니다.</DialogDescription>
          </DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger>
              <SelectValue placeholder="변경할 상태 선택" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkStatusDialog(false)}>취소</Button>
            <Button onClick={handleBulkStatusUpdate} disabled={!bulkStatus || isProcessing}>
              {isProcessing ? "처리 중..." : "변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedOrders.size}개 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              {isProcessing ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
