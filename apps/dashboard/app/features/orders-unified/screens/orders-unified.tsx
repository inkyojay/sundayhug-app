/**
 * 통합 주문 관리 - 메인 화면
 *
 * Cafe24, 네이버, 쿠팡 3개 몰 주문 통합 조회
 * Phase C에서 일괄 처리 기능 통합:
 * - BulkActionBar: 일괄 상태 변경, 송장 입력, 송장 전송
 * - 재고 차감 연동
 */
import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "react-router";
import {
  SearchIcon,
  RefreshCwIcon,
  CalendarIcon,
  StoreIcon,
  LayersIcon,
  DownloadIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useFetcher, useRevalidator, useLoaderData } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/core/components/ui/select";

import { OrdersTable, BulkActionBar } from "../components";
import {
  getUnifiedOrders,
  parseUnifiedOrderQueryParams,
  updateInvoice,
  bulkUpdateStatus,
  bulkDeleteOrders,
} from "../lib/orders-unified.server";
import {
  ORDER_STATUSES,
  CHANNELS,
  buildOrderUrl,
  exportOrdersToCSV,
  getDatePreset,
  type UnifiedOrder,
  type Channel,
} from "../lib/orders-unified.shared";
import { deductInventoryForOrders, rollbackInventoryDeduction } from "../lib/inventory-deduction.server";
import { sendInvoicesBulk } from "../lib/invoice-sender.server";
import { getCarrierByValue } from "../lib/carriers";

export const meta: MetaFunction = () => {
  return [{ title: "통합 주문 관리 | Sundayhug Admin" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = parseUnifiedOrderQueryParams(url);

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const result = await getUnifiedOrders(adminClient, params);

  return {
    ...result,
    currentPage: params.page,
    totalPages: Math.ceil(result.totalCount / params.limit),
    limit: params.limit,
    statusFilter: params.statusFilter,
    channelFilter: params.channelFilter,
    searchQuery: params.searchQuery,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 단건 송장 업데이트
  if (actionType === "updateInvoice") {
    const result = await updateInvoice(
      adminClient,
      formData.get("orderNo") as string,
      formData.get("channel") as Channel,
      formData.get("invoiceNo") as string,
      formData.get("carrName") as string
    );
    return result.success
      ? { success: true, message: "송장번호가 업데이트되었습니다." }
      : { success: false, error: result.error };
  }

  // 일괄 상태 변경
  if (actionType === "bulkUpdateStatus") {
    const orderKeys = JSON.parse(formData.get("orderKeys") as string);
    const newStatus = formData.get("newStatus") as string;
    const result = await bulkUpdateStatus(adminClient, orderKeys, newStatus);
    return { success: true, message: `${result.count}개 주문의 상태가 변경되었습니다.` };
  }

  // 일괄 삭제
  if (actionType === "bulkDelete") {
    const orderKeys = JSON.parse(formData.get("orderKeys") as string);
    const result = await bulkDeleteOrders(adminClient, orderKeys);
    return { success: true, message: `${result.count}개 주문이 삭제되었습니다.` };
  }

  // 일괄 송장 입력 (재고 차감 포함)
  if (actionType === "bulkUpdateInvoice") {
    const invoiceDataRaw = formData.get("invoiceData") as string;
    const invoiceData: Array<{
      orderKey: string;
      orderNo: string;
      channel: Channel;
      carrName: string;
      invoiceNo: string;
    }> = JSON.parse(invoiceDataRaw);

    const successResults: string[] = [];
    const errorResults: string[] = [];

    for (const item of invoiceData) {
      try {
        // 1. 먼저 orders 테이블에서 uniq 조회
        const { data: orderRows } = await adminClient
          .from("orders")
          .select("uniq")
          .eq("shop_cd", item.channel)
          .eq("shop_ord_no", item.orderNo)
          .limit(1);

        const orderUniq = orderRows?.[0]?.uniq;

        // 2. 재고 차감 시도 (uniq가 있는 경우에만)
        if (orderUniq) {
          const deductionResult = await deductInventoryForOrders(adminClient, [orderUniq]);

          if (!deductionResult.success && deductionResult.failedCount > 0) {
            // 재고 차감 실패 시 해당 주문 송장 입력 스킵
            errorResults.push(`${item.orderNo}: 재고 차감 실패 - ${deductionResult.errors.join(", ")}`);
            continue;
          }
        }

        // 3. 송장 정보 업데이트
        const result = await updateInvoice(
          adminClient,
          item.orderNo,
          item.channel,
          item.invoiceNo,
          item.carrName
        );

        if (result.success) {
          successResults.push(item.orderNo);
        } else {
          // 송장 입력 실패 시 재고 차감 롤백
          if (orderUniq) {
            await rollbackInventoryDeduction(adminClient, orderUniq);
          }
          errorResults.push(`${item.orderNo}: ${result.error}`);
        }
      } catch (error) {
        errorResults.push(`${item.orderNo}: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
      }
    }

    if (errorResults.length === 0) {
      return {
        success: true,
        message: `${successResults.length}개 주문의 송장 정보가 저장되었습니다. (재고 차감 완료)`,
      };
    } else if (successResults.length > 0) {
      return {
        success: true,
        message: `${successResults.length}개 성공, ${errorResults.length}개 실패. 실패 목록: ${errorResults.slice(0, 3).join("; ")}${errorResults.length > 3 ? "..." : ""}`,
      };
    } else {
      return {
        success: false,
        error: `모든 주문 처리 실패: ${errorResults.slice(0, 3).join("; ")}${errorResults.length > 3 ? "..." : ""}`,
      };
    }
  }

  // 일괄 송장 전송 (채널 API로 전송)
  if (actionType === "bulkSendInvoice") {
    const orderKeysRaw = formData.get("orderKeys") as string;
    const orderKeys: string[] = JSON.parse(orderKeysRaw);

    // 주문 정보 조회하여 송장 정보 수집
    const invoicesToSend: Array<{ orderUniq: string; carrierCode: string; trackingNo: string }> = [];

    for (const key of orderKeys) {
      const [channel, ...orderNoParts] = key.split("_");
      const orderNo = orderNoParts.join("_");

      const { data: orderRows } = await adminClient
        .from("orders")
        .select("uniq, invoice_no, carr_name")
        .eq("shop_cd", channel)
        .eq("shop_ord_no", orderNo)
        .limit(1);

      const order = orderRows?.[0];
      if (order?.invoice_no && order?.carr_name) {
        // 택배사명으로 코드 조회
        const carrier = getCarrierByValue(order.carr_name) ||
          { value: order.carr_name.toLowerCase().replace(/\s/g, "") };

        invoicesToSend.push({
          orderUniq: order.uniq,
          carrierCode: carrier.value,
          trackingNo: order.invoice_no,
        });
      }
    }

    if (invoicesToSend.length === 0) {
      return {
        success: false,
        error: "전송할 송장 정보가 있는 주문이 없습니다. 송장번호와 택배사를 먼저 입력해주세요.",
      };
    }

    const result = await sendInvoicesBulk(adminClient, invoicesToSend);

    if (result.success) {
      return {
        success: true,
        message: `${result.successCount}개 주문의 송장이 전송되었습니다.`,
      };
    } else {
      const failedMessages = result.results
        .filter((r) => !r.success)
        .slice(0, 3)
        .map((r) => `${r.orderNo}: ${r.error}`)
        .join("; ");

      if (result.successCount > 0) {
        return {
          success: true,
          message: `${result.successCount}개 성공, ${result.failCount}개 실패. ${failedMessages}${result.failCount > 3 ? "..." : ""}`,
        };
      } else {
        return {
          success: false,
          error: `송장 전송 실패: ${failedMessages}${result.failCount > 3 ? "..." : ""}`,
        };
      }
    }
  }

  return { success: false, error: "알 수 없는 액션입니다." };
}

export default function OrdersUnifiedPage() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const fetcher = useFetcher();
  const cafe24Fetcher = useFetcher();
  const naverFetcher = useFetcher();
  const coupangFetcher = useFetcher();

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(loaderData.searchQuery);

  const [syncStartDate, setSyncStartDate] = useState(() => getDatePreset(7).from);
  const [syncEndDate, setSyncEndDate] = useState(() => getDatePreset(7).to);
  const [showSyncOptions, setShowSyncOptions] = useState(false);

  const [viewDateFrom, setViewDateFrom] = useState(loaderData.dateFrom || "");
  const [viewDateTo, setViewDateTo] = useState(loaderData.dateTo || "");

  const isSyncingCafe24 = cafe24Fetcher.state === "submitting";
  const isSyncingNaver = naverFetcher.state === "submitting";
  const isSyncingCoupang = coupangFetcher.state === "submitting";
  const isProcessing = fetcher.state === "submitting";

  // 현재 URL 파라미터
  const currentParams = {
    q: loaderData.searchQuery,
    status: loaderData.statusFilter,
    channel: loaderData.channelFilter,
    dateFrom: loaderData.dateFrom,
    dateTo: loaderData.dateTo,
    sortBy: loaderData.sortBy,
    sortOrder: loaderData.sortOrder,
    limit: String(loaderData.limit),
  };

  const buildUrl = (overrides: Record<string, string | null> = {}) =>
    buildOrderUrl("/dashboard/orders/unified", currentParams, overrides);

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
    if (coupangFetcher.state === "idle" && coupangFetcher.data) {
      revalidator.revalidate();
    }
  }, [coupangFetcher.state, coupangFetcher.data]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if ((fetcher.data as any).success) {
        setSelectedOrders(new Set());
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

  const handleSaveInvoice = (order: UnifiedOrder, invoiceNo: string, carrName: string) => {
    fetcher.submit(
      {
        actionType: "updateInvoice",
        orderNo: order.orderNo,
        channel: order.channel,
        invoiceNo,
        carrName,
      },
      { method: "POST" }
    );
  };

  // 선택 해제 및 새로고침 핸들러
  const handleClearSelection = () => {
    setSelectedOrders(new Set());
  };

  const handleActionComplete = () => {
    revalidator.revalidate();
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

  const handleSyncCoupang = () => {
    const formData = new FormData();
    formData.append("vendor_id", "auto");
    formData.append("date_from", syncStartDate.replace(/-/g, ""));
    formData.append("date_to", syncEndDate.replace(/-/g, ""));
    coupangFetcher.submit(formData, { method: "POST", action: "/api/integrations/coupang/sync-orders" });
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
            <LayersIcon className="h-6 w-6 text-purple-500" />
            통합 주문 관리
          </h1>
          <p className="text-muted-foreground">Cafe24, 네이버, 쿠팡 주문 통합 관리</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
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
          <Button variant="outline" size="sm" onClick={handleSyncCoupang} disabled={isSyncingCoupang}>
            {isSyncingCoupang ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <StoreIcon className="h-4 w-4 mr-2" />}
            쿠팡
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
      {(cafe24Fetcher.data || naverFetcher.data || coupangFetcher.data || fetcher.data) && (
        <div
          className={`p-3 rounded-lg text-sm ${
            (cafe24Fetcher.data as any)?.success ||
            (naverFetcher.data as any)?.success ||
            (coupangFetcher.data as any)?.success ||
            (fetcher.data as any)?.success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {(cafe24Fetcher.data as any)?.message ||
            (cafe24Fetcher.data as any)?.error ||
            (naverFetcher.data as any)?.message ||
            (naverFetcher.data as any)?.error ||
            (coupangFetcher.data as any)?.message ||
            (coupangFetcher.data as any)?.error ||
            (fetcher.data as any)?.message ||
            (fetcher.data as any)?.error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        {/* 상태별 통계 */}
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => (window.location.href = buildUrl({ status: "all" }))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.stats.total}</div>
          </CardContent>
        </Card>
        {["결제완료", "상품준비중", "배송중", "배송완료", "취소"].map((status) => (
          <Card key={status} className="cursor-pointer hover:bg-muted/50" onClick={() => (window.location.href = buildUrl({ status }))}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loaderData.stats.byStatus[status] || 0}</div>
            </CardContent>
          </Card>
        ))}
        {/* 채널별 통계 */}
        <Card className="cursor-pointer hover:bg-muted/50 border-blue-200" onClick={() => (window.location.href = buildUrl({ channel: "cafe24" }))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Cafe24</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{loaderData.stats.byChannel.cafe24 || 0}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 border-green-200" onClick={() => (window.location.href = buildUrl({ channel: "naver" }))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">네이버</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{loaderData.stats.byChannel.naver || 0}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 border-orange-200" onClick={() => (window.location.href = buildUrl({ channel: "coupang" }))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">쿠팡</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{loaderData.stats.byChannel.coupang || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 & 검색 */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-col gap-4" method="GET" action="/dashboard/orders/unified">
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
              <Select name="channel" value={loaderData.channelFilter} onValueChange={(v) => (window.location.href = buildUrl({ channel: v }))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="채널" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 채널</SelectItem>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
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

      {/* 일괄 처리 액션 바 */}
      <BulkActionBar
        selectedOrders={selectedOrders}
        orders={loaderData.orders}
        onClearSelection={handleClearSelection}
        onActionComplete={handleActionComplete}
      />

      {/* 주문 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            {loaderData.uniqueOrderCount}개 주문 ({loaderData.totalItemCount}개 상품)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <OrdersTable
            orders={loaderData.orders}
            selectedOrders={selectedOrders}
            expandedOrders={expandedOrders}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onToggleExpand={toggleExpand}
            onSort={handleSort}
            onSaveInvoice={handleSaveInvoice}
            isProcessing={isProcessing}
          />

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

    </div>
  );
}
