/**
 * 주문 관리 (직접연동) - Airtable 스타일
 * 
 * 플레이오토 제외한 직접 연동(카페24, 네이버) 주문만 표시
 * - 테이블 스타일 UI
 * - 인라인 편집 (송장번호, 상태)
 * - 체크박스 일괄 처리
 * - CSV 내보내기
 * - 정렬/그룹핑
 */
import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "react-router";

import {
  ShoppingCartIcon,
  SearchIcon,
  RefreshCwIcon,
  TruckIcon,
  PackageCheckIcon,
  ClockIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  PackageIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
  ZapIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  ArrowUpDownIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useFetcher, useRevalidator, useLoaderData } from "react-router";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/core/components/ui/collapsible";

export const meta: MetaFunction = () => {
  return [{ title: "주문 관리 (직접연동) | 관리자 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limitParam = url.searchParams.get("limit") || "50";
  const limit = parseInt(limitParam);
  const statusFilter = url.searchParams.get("status") || "all";
  const shopFilter = url.searchParams.get("shop") || "all";
  const searchQuery = url.searchParams.get("q") || "";
  const sortBy = url.searchParams.get("sortBy") || "ord_time";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  const groupBy = url.searchParams.get("groupBy") || "none";
  
  // 기간별 조회 필터 (기본: 전체)
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 통계 조회 (카페24/네이버만)
  const [statusStats, shopStats] = await Promise.all([
    adminClient
      .from("orders")
      .select("ord_status")
      .in("shop_cd", ["cafe24", "naver"])
      .then(({ data }) => {
        const stats: Record<string, number> = {};
        data?.forEach((order: any) => {
          stats[order.ord_status] = (stats[order.ord_status] || 0) + 1;
        });
        return stats;
      }),
    adminClient
      .from("orders")
      .select("shop_cd")
      .in("shop_cd", ["cafe24", "naver"])
      .then(({ data }) => {
        const shops: Record<string, number> = {};
        data?.forEach((order: any) => {
          if (order.shop_cd) {
            shops[order.shop_cd] = (shops[order.shop_cd] || 0) + 1;
          }
        });
        return shops;
      }),
  ]);

  // 주문 목록 조회 (카페24/네이버만)
  let query = adminClient
    .from("orders")
    .select(`
      id,
      uniq,
      shop_ord_no,
      ord_status,
      shop_cd,
      shop_name,
      shop_sale_name,
      shop_opt_name,
      shop_sku_cd,
      pay_amt,
      sales,
      sale_cnt,
      to_name,
      to_tel,
      to_htel,
      to_addr1,
      to_addr2,
      ord_time,
      invoice_no,
      carr_name,
      customer_id
    `, { count: "exact" })
    .in("shop_cd", ["cafe24", "naver"]);

  // 정렬
  const ascending = sortOrder === "asc";
  query = query.order(sortBy, { ascending });
  if (sortBy !== "shop_ord_no") {
    query = query.order("shop_ord_no", { ascending: false });
  }

  if (statusFilter !== "all") {
    query = query.eq("ord_status", statusFilter);
  }
  if (shopFilter !== "all") {
    query = query.eq("shop_cd", shopFilter);
  }
  if (searchQuery) {
    query = query.or(`to_name.ilike.%${searchQuery}%,shop_ord_no.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,invoice_no.ilike.%${searchQuery}%`);
  }
  // 기간별 조회 필터
  if (dateFrom) {
    query = query.gte("ord_time", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte("ord_time", `${dateTo}T23:59:59`);
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: rawOrders, error, count } = await query;

  // 주문번호별로 그룹핑
  const ordersMap = new Map<string, {
    key: string;
    orderNo: string;
    shopCd: string;
    ordStatus: string;
    toName: string;
    toTel: string;
    toHtel: string;
    toAddr1: string;
    toAddr2: string;
    ordTime: string;
    invoiceNo: string | null;
    carrName: string | null;
    customerId: string | null;
    totalAmount: number;
    totalQty: number;
    items: Array<{
      id: string;
      saleName: string;
      optName: string;
      skuCd: string;
      qty: number;
      amt: number;
    }>;
  }>();

  for (const row of rawOrders || []) {
    const key = `${row.shop_cd}_${row.shop_ord_no}`;
    
    if (!ordersMap.has(key)) {
      ordersMap.set(key, {
        key,
        orderNo: row.shop_ord_no,
        shopCd: row.shop_cd,
        ordStatus: row.ord_status,
        toName: row.to_name,
        toTel: row.to_tel,
        toHtel: row.to_htel,
        toAddr1: row.to_addr1,
        toAddr2: row.to_addr2,
        ordTime: row.ord_time,
        invoiceNo: row.invoice_no,
        carrName: row.carr_name,
        customerId: row.customer_id,
        totalAmount: 0,
        totalQty: 0,
        items: [],
      });
    }
    
    const order = ordersMap.get(key)!;
    const itemAmt = parseFloat(row.pay_amt || 0) || parseFloat(row.sales || 0);
    order.totalAmount += itemAmt;
    order.totalQty += row.sale_cnt || 0;
    order.items.push({
      id: row.id,
      saleName: row.shop_sale_name,
      optName: row.shop_opt_name,
      skuCd: row.shop_sku_cd,
      qty: row.sale_cnt,
      amt: itemAmt,
    });
  }

  const orders = Array.from(ordersMap.values());
  const uniqueOrderCount = orders.length;
  const totalItemCount = rawOrders?.length || 0;

  return {
    orders,
    totalCount: count || 0,
    uniqueOrderCount,
    totalItemCount,
    statusStats,
    shopStats,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / limit),
    limit,
    statusFilter,
    shopFilter,
    searchQuery,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    groupBy,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 송장번호 업데이트
  if (actionType === "updateInvoice") {
    const orderNo = formData.get("orderNo") as string;
    const shopCd = formData.get("shopCd") as string;
    const invoiceNo = formData.get("invoiceNo") as string;
    const carrName = formData.get("carrName") as string;

    const { error } = await adminClient
      .from("orders")
      .update({ 
        invoice_no: invoiceNo || null, 
        carr_name: carrName || null,
        ord_status: invoiceNo ? "배송중" : undefined,
      })
      .eq("shop_ord_no", orderNo)
      .eq("shop_cd", shopCd);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: "송장번호가 업데이트되었습니다." };
  }

  // 상태 일괄 변경
  if (actionType === "bulkUpdateStatus") {
    const orderKeys = JSON.parse(formData.get("orderKeys") as string) as string[];
    const newStatus = formData.get("newStatus") as string;

    let successCount = 0;
    for (const key of orderKeys) {
      const [shopCd, orderNo] = key.split("_");
      const { error } = await adminClient
        .from("orders")
        .update({ ord_status: newStatus })
        .eq("shop_ord_no", orderNo)
        .eq("shop_cd", shopCd);
      
      if (!error) successCount++;
    }

    return { success: true, message: `${successCount}개 주문의 상태가 변경되었습니다.` };
  }

  // 일괄 삭제
  if (actionType === "bulkDelete") {
    const orderKeys = JSON.parse(formData.get("orderKeys") as string) as string[];

    let successCount = 0;
    for (const key of orderKeys) {
      const [shopCd, orderNo] = key.split("_");
      const { error } = await adminClient
        .from("orders")
        .delete()
        .eq("shop_ord_no", orderNo)
        .eq("shop_cd", shopCd);
      
      if (!error) successCount++;
    }

    return { success: true, message: `${successCount}개 주문이 삭제되었습니다.` };
  }

  return { success: false, error: "알 수 없는 액션입니다." };
}

// 주문 상태 배지
function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; className: string }> = {
    "결제완료": { label: "결제완료", className: "bg-blue-100 text-blue-800" },
    "상품준비중": { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },
    "상품준비": { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },
    "배송중": { label: "배송중", className: "bg-orange-100 text-orange-800" },
    "배송완료": { label: "배송완료", className: "bg-green-100 text-green-800" },
    "취소": { label: "취소", className: "bg-red-100 text-red-800" },
    "반품": { label: "반품", className: "bg-red-100 text-red-800" },
    "교환": { label: "교환", className: "bg-purple-100 text-purple-800" },
  };
  const config = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// 쇼핑몰 배지
function getShopBadge(shopCd: string) {
  const shopMap: Record<string, { label: string; className: string }> = {
    "cafe24": { label: "Cafe24", className: "bg-blue-50 text-blue-700 border border-blue-200" },
    "naver": { label: "네이버", className: "bg-green-50 text-green-700 border border-green-200" },
  };
  const config = shopMap[shopCd] || { label: shopCd, className: "bg-gray-50 text-gray-700" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function OrdersDirectPage() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const fetcher = useFetcher();
  const cafe24Fetcher = useFetcher();
  const naverFetcher = useFetcher();
  
  // 선택된 주문
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(loaderData.searchQuery);
  
  // 인라인 편집
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState("");
  const [editCarrier, setEditCarrier] = useState("");
  
  // 일괄 처리 다이얼로그
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  
  // 동기화 날짜 범위
  const [syncStartDate, setSyncStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [syncEndDate, setSyncEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  
  // 조회 날짜 범위
  const [viewDateFrom, setViewDateFrom] = useState(loaderData.dateFrom || "");
  const [viewDateTo, setViewDateTo] = useState(loaderData.dateTo || "");

  const isSyncingCafe24 = cafe24Fetcher.state === "submitting";
  const isSyncingNaver = naverFetcher.state === "submitting";
  const isProcessing = fetcher.state === "submitting";

  // 전체 선택
  const isAllSelected = loaderData.orders.length > 0 && selectedOrders.size === loaderData.orders.length;
  const isSomeSelected = selectedOrders.size > 0 && selectedOrders.size < loaderData.orders.length;

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

  // 핸들러들
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(loaderData.orders.map((o: any) => o.key)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOne = (key: string, checked: boolean) => {
    const newSet = new Set(selectedOrders);
    if (checked) {
      newSet.add(key);
    } else {
      newSet.delete(key);
    }
    setSelectedOrders(newSet);
  };

  const toggleExpand = (key: string) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedOrders(newSet);
  };

  const startEditInvoice = (order: any) => {
    setEditingOrder(order.key);
    setEditInvoice(order.invoiceNo || "");
    setEditCarrier(order.carrName || "");
  };

  const saveInvoice = (order: any) => {
    fetcher.submit(
      {
        actionType: "updateInvoice",
        orderNo: order.orderNo,
        shopCd: order.shopCd,
        invoiceNo: editInvoice,
        carrName: editCarrier,
      },
      { method: "POST" }
    );
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus) return;
    fetcher.submit(
      {
        actionType: "bulkUpdateStatus",
        orderKeys: JSON.stringify(Array.from(selectedOrders)),
        newStatus: bulkStatus,
      },
      { method: "POST" }
    );
    setShowBulkStatusDialog(false);
  };

  const handleBulkDelete = () => {
    fetcher.submit(
      {
        actionType: "bulkDelete",
        orderKeys: JSON.stringify(Array.from(selectedOrders)),
      },
      { method: "POST" }
    );
    setShowDeleteDialog(false);
  };

  const handleSyncCafe24 = () => {
    const formData = new FormData();
    formData.append("startDate", syncStartDate);
    formData.append("endDate", syncEndDate);
    cafe24Fetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/cafe24/sync-orders",
    });
  };

  const handleSyncNaver = () => {
    const formData = new FormData();
    formData.append("startDate", syncStartDate);
    formData.append("endDate", syncEndDate);
    naverFetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/naver/sync-orders",
    });
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const headers = ["주문번호", "채널", "상태", "주문자", "연락처", "주소", "금액", "수량", "주문일시", "송장번호", "택배사"];
    const rows = loaderData.orders.map((o: any) => [
      o.orderNo,
      o.shopCd === "cafe24" ? "Cafe24" : "네이버",
      o.ordStatus,
      o.toName,
      o.toTel || o.toHtel,
      `${o.toAddr1 || ""} ${o.toAddr2 || ""}`.trim(),
      o.totalAmount,
      o.totalQty,
      o.ordTime,
      o.invoiceNo || "",
      o.carrName || "",
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // URL 빌더
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const values = {
      q: overrides.q !== undefined ? overrides.q : loaderData.searchQuery,
      status: overrides.status !== undefined ? overrides.status : loaderData.statusFilter,
      shop: overrides.shop !== undefined ? overrides.shop : loaderData.shopFilter,
      dateFrom: overrides.dateFrom !== undefined ? overrides.dateFrom : loaderData.dateFrom,
      dateTo: overrides.dateTo !== undefined ? overrides.dateTo : loaderData.dateTo,
      sortBy: overrides.sortBy !== undefined ? overrides.sortBy : loaderData.sortBy,
      sortOrder: overrides.sortOrder !== undefined ? overrides.sortOrder : loaderData.sortOrder,
      groupBy: overrides.groupBy !== undefined ? overrides.groupBy : loaderData.groupBy,
      limit: overrides.limit !== undefined ? overrides.limit : String(loaderData.limit),
      page: overrides.page !== undefined ? overrides.page : "1",
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "none" && value !== "1" && value !== "50") {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    return `/dashboard/orders-direct${queryString ? `?${queryString}` : ""}`;
  };

  const handleSort = (column: string) => {
    const newOrder = loaderData.sortBy === column && loaderData.sortOrder === "asc" ? "desc" : "asc";
    window.location.href = buildUrl({ sortBy: column, sortOrder: newOrder });
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
          <p className="text-muted-foreground">
            카페24, 네이버 스마트스토어 주문 관리
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSyncOptions(!showSyncOptions)}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {syncStartDate} ~ {syncEndDate}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncCafe24}
            disabled={isSyncingCafe24}
          >
            {isSyncingCafe24 ? (
              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <StoreIcon className="h-4 w-4 mr-2" />
            )}
            Cafe24
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNaver}
            disabled={isSyncingNaver}
          >
            {isSyncingNaver ? (
              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <StoreIcon className="h-4 w-4 mr-2" />
            )}
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
                <Input
                  type="date"
                  value={syncStartDate}
                  onChange={(e) => setSyncStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">종료일:</label>
                <Input
                  type="date"
                  value={syncEndDate}
                  onChange={(e) => setSyncEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                {[7, 30, 90].map(days => (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - days);
                      setSyncStartDate(d.toISOString().split("T")[0]);
                      setSyncEndDate(new Date().toISOString().split("T")[0]);
                    }}
                  >
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
        <div className={`p-3 rounded-lg text-sm ${
          ((cafe24Fetcher.data as any)?.success || (naverFetcher.data as any)?.success || (fetcher.data as any)?.success) 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {(cafe24Fetcher.data as any)?.message || (cafe24Fetcher.data as any)?.error ||
           (naverFetcher.data as any)?.message || (naverFetcher.data as any)?.error ||
           (fetcher.data as any)?.message || (fetcher.data as any)?.error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ status: "all" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.uniqueOrderCount}</div>
          </CardContent>
        </Card>
        {["결제완료", "상품준비중", "배송중", "배송완료", "취소"].map(status => (
          <Card 
            key={status} 
            className="cursor-pointer hover:bg-muted/50" 
            onClick={() => window.location.href = buildUrl({ status })}
          >
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
            {/* 기간별 조회 */}
            <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">조회 기간:</span>
              <Input
                type="date"
                name="dateFrom"
                value={viewDateFrom}
                onChange={(e) => setViewDateFrom(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                name="dateTo"
                value={viewDateTo}
                onChange={(e) => setViewDateTo(e.target.value)}
                className="w-[140px]"
              />
              {[7, 30, 90].map(days => (
                <Button
                  key={days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - days);
                    setViewDateFrom(d.toISOString().split("T")[0]);
                    setViewDateTo(new Date().toISOString().split("T")[0]);
                  }}
                >
                  {days}일
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setViewDateFrom(""); setViewDateTo(""); }}
              >
                전체
              </Button>
            </div>
            
            {/* 필터 */}
            <div className="flex flex-wrap gap-4 items-center">
              <Select name="status" value={loaderData.statusFilter} onValueChange={(v) => window.location.href = buildUrl({ status: v })}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="주문 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="결제완료">결제완료</SelectItem>
                  <SelectItem value="상품준비중">상품준비</SelectItem>
                  <SelectItem value="배송중">배송중</SelectItem>
                  <SelectItem value="배송완료">배송완료</SelectItem>
                  <SelectItem value="취소">취소</SelectItem>
                </SelectContent>
              </Select>
              <Select name="shop" value={loaderData.shopFilter} onValueChange={(v) => window.location.href = buildUrl({ shop: v })}>
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
              <Select value={String(loaderData.limit)} onValueChange={(v) => window.location.href = buildUrl({ limit: v })}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[50, 100, 200, 500].map(n => (
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
          <span className="text-sm font-medium text-blue-800">
            {selectedOrders.size}개 선택됨
          </span>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>주문 목록</CardTitle>
              <CardDescription>
                {loaderData.uniqueOrderCount}개 주문 ({loaderData.totalItemCount}개 상품)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className={isSomeSelected ? "opacity-50" : ""}
                    />
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[80px]">채널</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("shop_ord_no")}
                  >
                    <span className="flex items-center gap-1">
                      주문번호
                      <ArrowUpDownIcon className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>주문자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("ord_time")}
                  >
                    <span className="flex items-center gap-1">
                      주문일시
                      <ArrowUpDownIcon className="h-3 w-3" />
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
                  loaderData.orders.map((order: any) => (
                    <>
                      <TableRow 
                        key={order.key}
                        className={selectedOrders.has(order.key) ? "bg-blue-50" : "hover:bg-muted/50"}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.has(order.key)}
                            onCheckedChange={(checked) => handleSelectOne(order.key, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleExpand(order.key)}
                          >
                            {expandedOrders.has(order.key) ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>{getShopBadge(order.shopCd)}</TableCell>
                        <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                        <TableCell>{getStatusBadge(order.ordStatus)}</TableCell>
                        <TableCell className="font-medium">{order.toName || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {order.toTel || order.toHtel || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₩{order.totalAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{order.totalQty}개</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.ordTime ? new Date(order.ordTime).toLocaleDateString("ko-KR") : "-"}
                        </TableCell>
                        <TableCell>
                          {editingOrder === order.key ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editCarrier}
                                onChange={(e) => setEditCarrier(e.target.value)}
                                placeholder="택배사"
                                className="w-16 h-7 text-xs"
                              />
                              <Input
                                value={editInvoice}
                                onChange={(e) => setEditInvoice(e.target.value)}
                                placeholder="송장번호"
                                className="w-24 h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => saveInvoice(order)}
                                disabled={isProcessing}
                              >
                                <CheckIcon className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingOrder(null)}
                              >
                                <XIcon className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {order.invoiceNo ? `${order.carrName || ""} ${order.invoiceNo}` : "-"}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => startEditInvoice(order)}
                              >
                                <PencilIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {/* 확장된 상세 정보 */}
                      {expandedOrders.has(order.key) && (
                        <TableRow>
                          <TableCell colSpan={11} className="bg-muted/30 p-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* 상품 목록 */}
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <PackageIcon className="h-4 w-4" />
                                  주문 상품 ({order.items.length}개)
                                </h4>
                                <div className="space-y-2">
                                  {order.items.map((item: any) => (
                                    <div key={item.id} className="p-2 bg-white rounded border text-sm">
                                      <div className="font-medium">{item.saleName}</div>
                                      <div className="text-muted-foreground flex flex-wrap gap-2 mt-1">
                                        {item.optName && <span>옵션: {item.optName}</span>}
                                        {item.skuCd && (
                                          <span className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">
                                            {item.skuCd}
                                          </span>
                                        )}
                                        <span>₩{item.amt?.toLocaleString()} x {item.qty}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* 배송 정보 */}
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <MapPinIcon className="h-4 w-4" />
                                  배송 정보
                                </h4>
                                <div className="p-3 bg-white rounded border text-sm space-y-1">
                                  <p><strong>수령인:</strong> {order.toName}</p>
                                  <p><strong>연락처:</strong> {order.toTel || order.toHtel || "-"}</p>
                                  <p><strong>주소:</strong> {[order.toAddr1, order.toAddr2].filter(Boolean).join(" ") || "-"}</p>
                                  {order.customerId && (
                                    <p className="mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        고객 ID: {order.customerId.slice(0, 8)}...
                                      </Badge>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
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
                  onClick={() => window.location.href = buildUrl({ page: String(loaderData.currentPage - 1) })}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loaderData.currentPage >= loaderData.totalPages}
                  onClick={() => window.location.href = buildUrl({ page: String(loaderData.currentPage + 1) })}
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
            <DialogDescription>
              선택한 {selectedOrders.size}개 주문의 상태를 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger>
              <SelectValue placeholder="변경할 상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="결제완료">결제완료</SelectItem>
              <SelectItem value="상품준비중">상품준비</SelectItem>
              <SelectItem value="배송중">배송중</SelectItem>
              <SelectItem value="배송완료">배송완료</SelectItem>
              <SelectItem value="취소">취소</SelectItem>
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
              선택한 {selectedOrders.size}개 주문을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
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
