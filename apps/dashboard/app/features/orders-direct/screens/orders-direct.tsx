/**
 * 주문 관리 (직접연동)
 * 
 * 플레이오토 제외한 직접 연동(카페24, 네이버) 주문만 표시
 * 향후 플레이오토 제거 대비용
 */
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

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
} from "lucide-react";
import { useState, useEffect } from "react";
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
  const limit = 50;
  const statusFilter = url.searchParams.get("status") || "all";
  const shopFilter = url.searchParams.get("shop") || "all";
  const searchQuery = url.searchParams.get("q") || "";
  
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
    `)
    .in("shop_cd", ["cafe24", "naver"])
    .order("ord_time", { ascending: false })
    .order("shop_ord_no", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("ord_status", statusFilter);
  }
  if (shopFilter !== "all") {
    query = query.eq("shop_cd", shopFilter);
  }
  if (searchQuery) {
    query = query.or(`to_name.ilike.%${searchQuery}%,shop_ord_no.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%`);
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

  const { data: rawOrders, error } = await query;

  // 주문번호별로 그룹핑
  const ordersMap = new Map<string, {
    orderNo: string;
    shopCd: string;
    ordStatus: string;
    toName: string;
    toTel: string;
    toHtel: string;
    toAddr1: string;
    toAddr2: string;
    ordTime: string;
    invoiceNo: string;
    carrName: string;
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
    order.totalAmount += row.pay_amt || 0;
    order.totalQty += row.sale_cnt || 0;
    order.items.push({
      id: row.id,
      saleName: row.shop_sale_name,
      optName: row.shop_opt_name,
      skuCd: row.shop_sku_cd,
      qty: row.sale_cnt,
      amt: row.pay_amt,
    });
  }

  const orders = Array.from(ordersMap.values());

  // 전체 고유 주문 수 계산
  const uniqueOrderCount = orders.length;
  const totalItemCount = rawOrders?.length || 0;

  return {
    orders,
    totalCount: uniqueOrderCount,
    totalItemCount,
    statusStats,
    shopStats,
    currentPage: page,
    totalPages: Math.ceil(uniqueOrderCount / limit),
    statusFilter,
    shopFilter,
    searchQuery,
    dateFrom,
    dateTo,
  };
}

// 주문 상태 뱃지
function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "결제완료": { label: "결제완료", variant: "default" },
    "상품준비": { label: "상품준비", variant: "secondary" },
    "배송중": { label: "배송중", variant: "outline" },
    "배송완료": { label: "배송완료", variant: "secondary" },
    "취소": { label: "취소", variant: "destructive" },
    "반품": { label: "반품", variant: "destructive" },
    "교환": { label: "교환", variant: "destructive" },
  };
  const config = statusMap[status] || { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// 쇼핑몰 뱃지
function getShopBadge(shopCd: string) {
  const shopMap: Record<string, { label: string; color: string }> = {
    "cafe24": { label: "Cafe24", color: "bg-blue-100 text-blue-800" },
    "naver": { label: "네이버", color: "bg-green-100 text-green-800" },
  };
  const config = shopMap[shopCd] || { label: shopCd, color: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function OrdersDirectPage() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const cafe24Fetcher = useFetcher();
  const naverFetcher = useFetcher();
  
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(loaderData.searchQuery);
  
  // 동기화 날짜 범위 (기본: 최근 7일)
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

  // 주문 펼치기/접기
  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // 카페24 동기화
  const handleSyncCafe24 = () => {
    const formData = new FormData();
    formData.append("startDate", syncStartDate);
    formData.append("endDate", syncEndDate);
    
    cafe24Fetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/cafe24/sync-orders",
    });
  };

  // 네이버 동기화
  const handleSyncNaver = () => {
    const formData = new FormData();
    formData.append("startDate", syncStartDate);
    formData.append("endDate", syncEndDate);
    
    naverFetcher.submit(formData, {
      method: "POST",
      action: "/api/integrations/naver/sync-orders",
    });
  };

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
            카페24, 네이버 스마트스토어에서 직접 수집한 주문
          </p>
        </div>
        <div className="flex gap-2 items-center">
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
            Cafe24 동기화
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
            네이버 동기화
          </Button>
        </div>
      </div>

      {/* 날짜 범위 선택 패널 */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setSyncStartDate(d.toISOString().split("T")[0]);
                    setSyncEndDate(new Date().toISOString().split("T")[0]);
                  }}
                >
                  최근 7일
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setSyncStartDate(d.toISOString().split("T")[0]);
                    setSyncEndDate(new Date().toISOString().split("T")[0]);
                  }}
                >
                  최근 30일
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 90);
                    setSyncStartDate(d.toISOString().split("T")[0]);
                    setSyncEndDate(new Date().toISOString().split("T")[0]);
                  }}
                >
                  최근 90일
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 이미 저장된 주문은 자동으로 건너뜁니다 (중복 방지)
            </p>
          </CardContent>
        </Card>
      )}

      {/* 동기화 결과 메시지 */}
      {cafe24Fetcher.data && (
        <div className={`p-3 rounded-lg text-sm ${(cafe24Fetcher.data as any).success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {(cafe24Fetcher.data as any).message || (cafe24Fetcher.data as any).error}
        </div>
      )}
      {naverFetcher.data && (
        <div className={`p-3 rounded-lg text-sm ${(naverFetcher.data as any).success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {(naverFetcher.data as any).message || (naverFetcher.data as any).error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 주문</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">결제완료</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.statusStats["결제완료"] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">배송중</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.statusStats["배송중"] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">배송완료</CardTitle>
            <PackageCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.statusStats["배송완료"] || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 채널별 통계 */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(loaderData.shopStats).map(([shop, count]) => (
          <Card key={shop}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{getShopBadge(shop)}</CardTitle>
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count as number}건</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 필터 & 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            필터 & 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" method="GET">
            {/* 기간별 조회 */}
            <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">조회 기간:</span>
              </div>
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
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setViewDateFrom(d.toISOString().split("T")[0]);
                    setViewDateTo(new Date().toISOString().split("T")[0]);
                  }}
                >
                  7일
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setViewDateFrom(d.toISOString().split("T")[0]);
                    setViewDateTo(new Date().toISOString().split("T")[0]);
                  }}
                >
                  30일
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 90);
                    setViewDateFrom(d.toISOString().split("T")[0]);
                    setViewDateTo(new Date().toISOString().split("T")[0]);
                  }}
                >
                  90일
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewDateFrom("");
                    setViewDateTo("");
                  }}
                >
                  전체
                </Button>
              </div>
            </div>
            
            {/* 상태 / 쇼핑몰 / 검색 */}
            <div className="flex flex-wrap gap-4">
              <Select name="status" defaultValue={loaderData.statusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="주문 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="결제완료">결제완료</SelectItem>
                  <SelectItem value="상품준비">상품준비</SelectItem>
                  <SelectItem value="배송중">배송중</SelectItem>
                  <SelectItem value="배송완료">배송완료</SelectItem>
                  <SelectItem value="취소">취소</SelectItem>
                </SelectContent>
              </Select>
              <Select name="shop" defaultValue={loaderData.shopFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="쇼핑몰" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 쇼핑몰</SelectItem>
                  <SelectItem value="cafe24">Cafe24</SelectItem>
                  <SelectItem value="naver">네이버</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-1">
                <Input
                  name="q"
                  placeholder="주문자명, 주문번호, 전화번호 검색"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" variant="secondary">
                  <SearchIcon className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            {loaderData.totalCount}개 주문 ({loaderData.totalItemCount}개 상품)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loaderData.orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                주문이 없습니다. 동기화 버튼을 눌러 주문을 가져오세요.
              </div>
            ) : (
              loaderData.orders.map((order: any) => (
                <Collapsible
                  key={`${order.shopCd}_${order.orderNo}`}
                  open={expandedOrders.has(order.orderNo)}
                  onOpenChange={() => toggleOrder(order.orderNo)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                        {expandedOrders.has(order.orderNo) ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            {getShopBadge(order.shopCd)}
                            <span className="font-medium">{order.orderNo}</span>
                            {getStatusBadge(order.ordStatus)}
                            {order.items.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {order.items.length}개 상품
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {order.toName}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {order.ordTime ? new Date(order.ordTime).toLocaleDateString("ko-KR") : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {order.totalAmount?.toLocaleString()}원
                        </div>
                        <div className="text-sm text-muted-foreground">
                          총 {order.totalQty}개
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 bg-background border rounded-lg mt-1 space-y-4">
                      {/* 상품 목록 */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <PackageIcon className="h-4 w-4" />
                          주문 상품 ({order.items.length}개)
                        </h4>
                        <div className="space-y-2">
                          {order.items.map((item: any, idx: number) => (
                            <div 
                              key={item.id} 
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-md text-sm"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.saleName}</div>
                                <div className="text-muted-foreground flex flex-wrap gap-2 mt-1">
                                  {item.optName && (
                                    <span>옵션: {item.optName}</span>
                                  )}
                                  {item.skuCd && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                                      SKU: {item.skuCd}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-medium">{item.amt?.toLocaleString()}원</div>
                                <div className="text-muted-foreground">x{item.qty}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* 배송 정보 */}
                      <div className="pt-3 border-t">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4" />
                          배송 정보
                        </h4>
                        <div className="text-sm space-y-1">
                          <p><strong>수령인:</strong> {order.toName}</p>
                          <p className="flex items-center gap-1">
                            <PhoneIcon className="h-3 w-3" />
                            {order.toTel || order.toHtel || "-"}
                          </p>
                          <p><strong>주소:</strong> {[order.toAddr1, order.toAddr2].filter(Boolean).join(" ") || "-"}</p>
                          {order.invoiceNo && (
                            <p>
                              <strong>송장:</strong> {order.carrName} {order.invoiceNo}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {order.customerId && (
                        <div className="pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            고객 ID: {order.customerId.slice(0, 8)}...
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>

          {/* 페이지네이션 */}
          {loaderData.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {loaderData.currentPage > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(loaderData.currentPage - 1));
                    window.location.search = params.toString();
                  }}
                >
                  이전
                </Button>
              )}
              <span className="flex items-center px-3 text-sm">
                {loaderData.currentPage} / {loaderData.totalPages}
              </span>
              {loaderData.currentPage < loaderData.totalPages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(loaderData.currentPage + 1));
                    window.location.search = params.toString();
                  }}
                >
                  다음
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

