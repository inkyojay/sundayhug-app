/**
 * 주문 관리 - 주문 현황
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
  ExternalLinkIcon,
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

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `주문 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";
  const shopFilter = url.searchParams.get("shop") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 50;
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

  // 전체 개수 쿼리
  let countQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  
  if (statusFilter !== "all") {
    countQuery = countQuery.eq("ord_status", statusFilter);
  }
  if (shopFilter !== "all") {
    countQuery = countQuery.eq("shop_name", shopFilter);
  }
  if (search) {
    countQuery = countQuery.or(`shop_ord_no.ilike.%${search}%,to_name.ilike.%${search}%,invoice_no.ilike.%${search}%,to_tel.ilike.%${search}%,to_htel.ilike.%${search}%`);
  }
  
  const { count: totalCount } = await countQuery;

  // 페이지네이션 적용
  query = query.range(offset, offset + limit - 1);

  const { data: orders } = await query;

  return {
    orders: orders || [],
    stats,
    totalCount: totalCount || 0,
    currentPage: page,
    totalPages: Math.ceil((totalCount || 0) / limit),
    search,
    filters: { status: statusFilter, shop: shopFilter },
    shopOptions: shopStatsResult,
  };
}

// 주문 동기화 Action
export async function action({ request }: Route.ActionArgs) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/sync-orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ trigger: "manual" }),
      }
    );

    const result = await response.json();
    
    if (response.ok && result.success) {
      return { success: true, message: "주문 동기화가 완료되었습니다!", data: result.data };
    } else {
      return { success: false, error: result.error || "동기화 중 오류가 발생했습니다." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "동기화 중 오류가 발생했습니다." };
  }
}

export default function Orders({ loaderData }: Route.ComponentProps) {
  const { orders, stats, totalCount, currentPage, totalPages, search, filters, shopOptions } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const syncing = fetcher.state === "submitting" || fetcher.state === "loading";
  const hasHandledRef = useRef(false);

  // 동기화 결과 처리
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

  const handleSync = () => {
    fetcher.submit({}, { method: "POST" });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCartIcon className="h-6 w-6" />
            주문 관리
          </h1>
          <p className="text-muted-foreground">PlayAuto 주문 현황</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "주문 동기화"}
        </Button>
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

      {/* 주문 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            {hasActiveFilters ? "필터링된 결과" : "전체 주문"} ({totalCount.toLocaleString()}건)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">주문번호</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[100px]">판매채널</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead className="w-[80px]">수량</TableHead>
                <TableHead className="w-[80px]">수령인</TableHead>
                <TableHead className="w-[120px]">송장번호</TableHead>
                <TableHead className="w-[130px]">주문일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.shop_ord_no || order.uniq}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.ord_status)}
                  </TableCell>
                  <TableCell>
                    {getShopBadge(order.shop_name)}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="truncate text-sm font-medium">
                      {order.shop_sale_name}
                    </div>
                    {order.shop_opt_name && (
                      <div className="truncate text-xs text-muted-foreground">
                        {order.shop_opt_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.sale_cnt}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.to_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.to_htel || order.to_tel}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.invoice_no ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{order.invoice_no}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {order.ord_time 
                      ? new Date(order.ord_time).toLocaleString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"
                    }
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "검색 결과가 없습니다" : "주문 데이터가 없습니다"}
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




