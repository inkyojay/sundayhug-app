/**
 * 주문 관리 - 주문 현황 (그룹핑 버전)
 * 
 * 개선사항:
 * - 주문번호(shop_ord_no) 기준으로 그룹핑
 * - 클릭하면 세부 품목 펼쳐짐
 * - 배치 동기화로 속도 향상
 */
import type { Route } from "./+types/orders";

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
  DatabaseIcon,
  CalendarIcon,
  PackageIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
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

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `주문 관리 | Sundayhug Admin` }];
};

// 주문 그룹 타입
interface OrderGroup {
  shop_ord_no: string;
  shop_name: string;
  ord_status: string;
  to_name: string;
  to_tel: string;
  to_htel: string;
  to_addr1: string;
  to_addr2: string;
  invoice_no: string | null;
  carr_name: string | null;
  ord_time: string;
  pay_amt: number;
  ship_msg: string | null;
  items: Array<{
    id: string;
    uniq: string;
    shop_sale_name: string;
    shop_opt_name: string;
    sale_cnt: number;
    pay_amt: number;
    sales: number;
    ord_status: string;
    invoice_no: string | null;
  }>;
  itemCount: number;
  totalQty: number;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";
  const shopFilter = url.searchParams.get("shop") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 100; // 그룹핑 전이라 넉넉히
  const offset = (page - 1) * limit;

  // 통계 데이터
  const [statsResult, shopStatsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("ord_status")
      .then(({ data }) => {
        const stats: Record<string, number> = {};
        data?.forEach((order: any) => {
          stats[order.ord_status] = (stats[order.ord_status] || 0) + 1;
        });
        return stats;
      }),
    supabase
      .from("orders")
      .select("shop_name")
      .then(({ data }) => {
        const shops = new Set<string>();
        data?.forEach((order: any) => {
          if (order.shop_name) shops.add(order.shop_name);
        });
        return Array.from(shops).sort();
      }),
  ]);

  const stats = {
    total: Object.values(statsResult).reduce((a, b) => a + b, 0),
    newOrders: statsResult["신규주문"] || 0,
    shipping: statsResult["배송중"] || 0,
    delivered: statsResult["배송완료"] || 0,
    preparing: statsResult["상품준비중"] || 0,
  };

  // 주문 목록 쿼리
  let query = supabase
    .from("orders")
    .select(`
      id,
      uniq,
      shop_ord_no,
      ord_status,
      shop_name,
      shop_sale_name,
      shop_opt_name,
      sale_cnt,
      pay_amt,
      sales,
      to_name,
      to_tel,
      to_htel,
      to_addr1,
      to_addr2,
      invoice_no,
      carr_name,
      ord_time,
      pay_time,
      ship_msg,
      created_at
    `)
    .order("ord_time", { ascending: false });

  // 상태 필터
  if (statusFilter !== "all") {
    query = query.eq("ord_status", statusFilter);
  }

  // 판매채널 필터
  if (shopFilter !== "all") {
    query = query.eq("shop_name", shopFilter);
  }

  // 검색 적용 (주문번호, 수령인, 송장번호, 연락처)
  if (search) {
    query = query.or(`shop_ord_no.ilike.%${search}%,to_name.ilike.%${search}%,invoice_no.ilike.%${search}%,to_tel.ilike.%${search}%,to_htel.ilike.%${search}%`);
  }

  // 전체 개수 쿼리 (그룹핑 전)
  let countQuery = supabase
    .from("orders")
    .select("shop_ord_no", { count: "exact", head: false });
  
  if (statusFilter !== "all") {
    countQuery = countQuery.eq("ord_status", statusFilter);
  }
  if (shopFilter !== "all") {
    countQuery = countQuery.eq("shop_name", shopFilter);
  }
  if (search) {
    countQuery = countQuery.or(`shop_ord_no.ilike.%${search}%,to_name.ilike.%${search}%,invoice_no.ilike.%${search}%,to_tel.ilike.%${search}%,to_htel.ilike.%${search}%`);
  }
  
  const { data: countData } = await countQuery;
  const uniqueOrderNos = new Set(countData?.map((o: any) => o.shop_ord_no));
  const totalOrderGroups = uniqueOrderNos.size;

  // 페이지네이션 적용
  query = query.range(offset, offset + limit - 1);

  const { data: orders } = await query;

  // 주문번호로 그룹핑
  const groupedOrders: Record<string, OrderGroup> = {};
  
  orders?.forEach((order: any) => {
    const key = order.shop_ord_no || order.uniq;
    
    if (!groupedOrders[key]) {
      groupedOrders[key] = {
        shop_ord_no: order.shop_ord_no || order.uniq,
        shop_name: order.shop_name,
        ord_status: order.ord_status,
        to_name: order.to_name,
        to_tel: order.to_tel,
        to_htel: order.to_htel,
        to_addr1: order.to_addr1,
        to_addr2: order.to_addr2,
        invoice_no: order.invoice_no,
        carr_name: order.carr_name,
        ord_time: order.ord_time,
        pay_amt: 0,
        ship_msg: order.ship_msg,
        items: [],
        itemCount: 0,
        totalQty: 0,
      };
    }
    
    groupedOrders[key].items.push({
      id: order.id,
      uniq: order.uniq,
      shop_sale_name: order.shop_sale_name,
      shop_opt_name: order.shop_opt_name,
      sale_cnt: order.sale_cnt,
      pay_amt: order.pay_amt,
      sales: order.sales,
      ord_status: order.ord_status,
      invoice_no: order.invoice_no,
    });
    
    // pay_amt가 0이면 sales 사용 (카페24는 pay_amt가 0, sales에 금액 있음)
    const itemAmt = parseFloat(order.pay_amt || 0) || parseFloat(order.sales || 0);
    groupedOrders[key].pay_amt += itemAmt;
    groupedOrders[key].itemCount += 1;
    groupedOrders[key].totalQty += order.sale_cnt || 0;
  });

  const orderGroups = Object.values(groupedOrders).sort(
    (a, b) => new Date(b.ord_time).getTime() - new Date(a.ord_time).getTime()
  );

  // 페이지네이션 (그룹 기준)
  const groupsPerPage = 20;
  const paginatedGroups = orderGroups.slice(0, groupsPerPage);
  const totalPages = Math.ceil(totalOrderGroups / groupsPerPage);

  return {
    orderGroups: paginatedGroups,
    stats,
    totalCount: totalOrderGroups,
    currentPage: page,
    totalPages,
    search,
    filters: { status: statusFilter, shop: shopFilter },
    shopOptions: shopStatsResult,
  };
}

// 주문 조회/동기화 Action
export async function action({ request }: Route.ActionArgs) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  // Cafe24 동기화
  if (actionType === "cafe24-sync") {
    try {
      const { getOrders } = await import("~/features/integrations/lib/cafe24.server");
      const { createAdminClient } = await import("~/core/lib/supa-admin.server");
      const adminClient = createAdminClient();
      
      const ordersResult = await getOrders({
        startDate,
        endDate,
        limit: 100,
      });

      if (!ordersResult.success) {
        return { success: false, error: ordersResult.error || "Cafe24 주문 조회 실패" };
      }

      const cafe24Orders = ordersResult.orders || [];
      let syncedCount = 0;

      // 주문 상태 매핑
      const statusMap: Record<string, string> = {
        "N00": "입금전", "N10": "결제완료", "N20": "상품준비중",
        "N21": "배송대기", "N22": "배송보류", "N30": "배송중",
        "N40": "배송완료", "C00": "취소", "C10": "취소완료",
        "R00": "반품", "R10": "반품완료", "E00": "교환", "E10": "교환완료",
      };

      for (const order of cafe24Orders) {
        for (const item of order.items || []) {
          const receiver = order.receiver || {};
          const orderData = {
            uniq: `cafe24_${order.order_id}_${item.order_item_code}`,
            sol_no: 0,
            ord_status: statusMap[item.order_status] || item.order_status || "신규주문",
            shop_cd: "cafe24",
            shop_name: "카페24",
            shop_ord_no: order.order_id,
            shop_sale_name: item.product_name,
            shop_sku_cd: item.product_code,
            shop_opt_name: item.option_value || null,
            sale_cnt: item.quantity,
            ord_time: order.order_date,
            pay_amt: parseFloat(item.product_price) * item.quantity,
            sales: parseFloat(item.product_price) * item.quantity,
            order_name: order.order_name || order.buyer_name,
            to_name: receiver.name || order.billing_name,
            to_tel: receiver.phone || "",
            to_htel: receiver.cellphone || "",
            to_addr1: receiver.address1 || "",
            to_addr2: receiver.address2 || "",
            ship_msg: receiver.shipping_message || null,
            invoice_no: item.tracking_no || null,
            synced_at: new Date().toISOString(),
          };

          const { error } = await adminClient.from("orders").upsert(orderData, { onConflict: "uniq" });
          if (!error) syncedCount++;
        }
      }

      return { success: true, message: `Cafe24에서 ${syncedCount}개 주문 동기화 완료!` };
    } catch (error: any) {
      return { success: false, error: error.message || "Cafe24 동기화 중 오류" };
    }
  }

  // PlayAuto 동기화 (기존 로직)
  const start = startDate ? new Date(startDate) : new Date();
  const today = new Date();
  const daysAgo = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const forceRefresh = actionType === "sync";

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/sync-orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ 
          forceRefresh,
          daysAgo: Math.max(daysAgo, 1),
        }),
      }
    );

    const result = await response.json();
    
    if (response.ok && result.success) {
      const message = forceRefresh 
        ? `PlayAuto에서 ${result.data?.ordersSynced || 0}개 주문 동기화 완료! (${result.data?.durationMs || 0}ms)`
        : `${result.data?.orderCount || 0}개 주문 조회 완료 (${result.source === "cache" ? "캐시" : "API"})`;
      return { success: true, message, data: result.data, source: result.source };
    } else {
      return { success: false, error: result.error || "처리 중 오류가 발생했습니다." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "처리 중 오류가 발생했습니다." };
  }
}

export default function Orders({ loaderData }: Route.ComponentProps) {
  const { orderGroups, stats, totalCount, currentPage, totalPages, search, filters, shopOptions } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  // 날짜 범위 (기본: 최근 7일)
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const [startDate, setStartDate] = useState(weekAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const isLoading = fetcher.state === "submitting" || fetcher.state === "loading";
  const hasHandledRef = useRef(false);

  // 동기화/조회 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && !hasHandledRef.current) {
      hasHandledRef.current = true;
      if (fetcher.data.success) {
        setSyncMessage(`✅ ${fetcher.data.message}`);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (fetcher.state === "submitting") {
      hasHandledRef.current = false;
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  // URL 파라미터 생성 헬퍼
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newStatus = overrides.status !== undefined ? overrides.status : filters.status;
    const newShop = overrides.shop !== undefined ? overrides.shop : filters.shop;
    const newPage = overrides.page !== undefined ? overrides.page : "1";

    if (newSearch) params.set("search", newSearch);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newShop && newShop !== "all") params.set("shop", newShop);
    if (newPage && newPage !== "1") params.set("page", newPage);
    
    const queryString = params.toString();
    return `/dashboard/orders${queryString ? `?${queryString}` : ""}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newValue = value === "all" ? "all" : value;
    window.location.href = buildUrl({ [filterType]: newValue });
  };

  const handleReset = () => {
    window.location.href = "/dashboard/orders";
  };

  const handleQuery = () => {
    fetcher.submit(
      { actionType: "query", startDate, endDate },
      { method: "POST" }
    );
  };

  const handleSync = () => {
    fetcher.submit(
      { actionType: "sync", startDate, endDate },
      { method: "POST" }
    );
  };

  const handleCafe24Sync = () => {
    fetcher.submit(
      { actionType: "cafe24-sync", startDate, endDate },
      { method: "POST" }
    );
  };

  const toggleOrder = (ordNo: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(ordNo)) {
        next.delete(ordNo);
      } else {
        next.add(ordNo);
      }
      return next;
    });
  };

  const hasActiveFilters = search || filters.status !== "all" || filters.shop !== "all";

  // 주문 상태별 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "신규주문":
        return <Badge className="bg-blue-500">{status}</Badge>;
      case "상품준비중":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "배송중":
        return <Badge className="bg-orange-500">{status}</Badge>;
      case "배송완료":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "취소":
      case "반품":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 판매채널별 배지 색상
  const getShopBadge = (shop: string) => {
    switch (shop) {
      case "스마트스토어":
        return <Badge variant="outline" className="border-green-500 text-green-500">{shop}</Badge>;
      case "카페24(신)":
      case "카페24":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">{shop}</Badge>;
      case "쿠팡":
        return <Badge variant="outline" className="border-red-500 text-red-500">{shop}</Badge>;
      default:
        return <Badge variant="outline">{shop}</Badge>;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 동기화 결과 메시지 */}
      {syncMessage && (
        <div className={`p-4 rounded-lg ${syncMessage.startsWith("✅") ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
          {syncMessage}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCartIcon className="h-6 w-6" />
              주문 관리
            </h1>
            <p className="text-muted-foreground">PlayAuto 주문 현황</p>
          </div>
        </div>
        
        {/* 날짜 선택 & 동기화/조회 버튼 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">시작일</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <span className="text-muted-foreground">~</span>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">종료일</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleQuery} disabled={isLoading}>
                  <SearchIcon className={`h-4 w-4 mr-2 ${isLoading ? "animate-pulse" : ""}`} />
                  {isLoading ? "조회 중..." : "주문 조회"}
                </Button>
                <Button onClick={handleSync} disabled={isLoading}>
                  <DatabaseIcon className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  {isLoading ? "동기화 중..." : "PlayAuto 동기화"}
                </Button>
                <Button variant="secondary" onClick={handleCafe24Sync} disabled={isLoading}>
                  <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  {isLoading ? "동기화 중..." : "Cafe24 동기화"}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground ml-auto">
                <span className="font-medium">주문 조회</span>: DB 캐시에서 조회 | 
                <span className="font-medium"> 동기화</span>: PlayAuto/Cafe24에서 가져오기
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "신규주문")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-blue-500" />
              신규주문
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.newOrders.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "상품준비중")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <PackageCheckIcon className="h-4 w-4 text-yellow-500" />
              상품준비중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.preparing.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "배송중")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <TruckIcon className="h-4 w-4 text-orange-500" />
              배송중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.shipping.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("status", "배송완료")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <PackageCheckIcon className="h-4 w-4 text-green-500" />
              배송완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.delivered.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="주문번호, 수령인, 송장번호, 연락처로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>

          {/* 드롭다운 필터 */}
          <div className="flex flex-wrap gap-3 items-center">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />

            {/* 주문 상태 필터 */}
            <Select 
              value={filters.status || "all"} 
              onValueChange={(v) => handleFilterChange("status", v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="주문 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="신규주문">신규주문</SelectItem>
                <SelectItem value="상품준비중">상품준비중</SelectItem>
                <SelectItem value="배송중">배송중</SelectItem>
                <SelectItem value="배송완료">배송완료</SelectItem>
                <SelectItem value="취소">취소</SelectItem>
                <SelectItem value="반품">반품</SelectItem>
              </SelectContent>
            </Select>
            
            {/* 판매채널 필터 */}
            <Select 
              value={filters.shop || "all"} 
              onValueChange={(v) => handleFilterChange("shop", v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="판매채널" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 채널</SelectItem>
                {shopOptions.map((shop: string) => (
                  <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 필터 초기화 */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                필터 초기화
              </Button>
            )}
          </div>

          {/* 활성 필터 표시 */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {search && (
                <Badge variant="secondary" className="gap-1">
                  검색: {search}
                </Badge>
              )}
              {filters.status && filters.status !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  상태: {filters.status}
                </Badge>
              )}
              {filters.shop && filters.shop !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  채널: {filters.shop}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 주문 목록 (그룹핑) */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            {hasActiveFilters ? "필터링된 결과" : "전체 주문"} ({totalCount.toLocaleString()}건)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {hasActiveFilters ? "검색 결과가 없습니다" : "주문 데이터가 없습니다"}
            </div>
          ) : (
            orderGroups.map((group) => (
              <Collapsible 
                key={group.shop_ord_no} 
                open={expandedOrders.has(group.shop_ord_no)}
                onOpenChange={() => toggleOrder(group.shop_ord_no)}
              >
                {/* 주문 요약 (헤더) */}
                <CollapsibleTrigger asChild>
                  <div className="w-full p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      {/* 펼침 아이콘 */}
                      <div className="flex-shrink-0">
                        {expandedOrders.has(group.shop_ord_no) ? (
                          <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* 주문 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {group.shop_ord_no}
                          </span>
                          {getStatusBadge(group.ord_status)}
                          {getShopBadge(group.shop_name)}
                          {group.itemCount > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.itemCount}개 품목
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {group.to_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <PhoneIcon className="h-3 w-3" />
                            {group.to_htel || group.to_tel}
                          </span>
                          <span>
                            {new Date(group.ord_time).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>

                      {/* 금액 & 송장 */}
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold">
                          {group.pay_amt.toLocaleString()}원
                        </div>
                        {group.invoice_no && (
                          <div className="text-xs text-muted-foreground">
                            {group.carr_name}: {group.invoice_no}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                {/* 세부 품목 (펼침) */}
                <CollapsibleContent>
                  <div className="ml-9 mt-2 space-y-2 pb-2">
                    {/* 배송 정보 */}
                    <div className="p-3 rounded-lg bg-muted/30 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{group.to_name}</span>
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span>{group.to_htel || group.to_tel}</span>
                          <div className="text-muted-foreground mt-1">
                            {group.to_addr1} {group.to_addr2}
                          </div>
                          {group.ship_msg && (
                            <div className="text-orange-500 mt-1">
                              📝 {group.ship_msg}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 품목 목록 */}
                    {group.items.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-4 p-3 rounded-lg border bg-background"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.shop_sale_name}
                          </div>
                          {item.shop_opt_name && (
                            <div className="text-sm text-muted-foreground truncate">
                              옵션: {item.shop_opt_name}
                            </div>
                          )}
                        </div>
                        <div className="text-center flex-shrink-0">
                          <div className="font-bold">{item.sale_cnt}개</div>
                        </div>
                        <div className="text-right flex-shrink-0 w-24">
                          <div className="font-medium">
                            {(item.pay_amt || item.sales || 0).toLocaleString()}원
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
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
