/**
 * 쿠팡 로켓그로스 주문 목록 페이지
 */

import type { Route } from "./+types/coupang-orders";

import {
  ShoppingCartIcon,
  SearchIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  PackageIcon,
  TruckIcon,
  CheckCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";

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
  return [{ title: "쿠팡 주문 목록 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const dateFrom = url.searchParams.get("from") || "";
  const dateTo = url.searchParams.get("to") || "";

  // 주문 목록 조회 (쿠팡만)
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("shop_cd", "coupang")
    .order("ord_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `ord_no.ilike.%${search}%,recv_name.ilike.%${search}%,goods_name.ilike.%${search}%`
    );
  }

  if (status) {
    query = query.eq("ord_status", status);
  }

  if (dateFrom) {
    query = query.gte("ord_time", dateFrom);
  }

  if (dateTo) {
    query = query.lte("ord_time", dateTo + "T23:59:59");
  }

  const { data: orders, count } = await query;

  // 주문 통계 (최근 30일)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("ord_status, sale_price")
    .eq("shop_cd", "coupang")
    .gte("ord_time", thirtyDaysAgo.toISOString());

  const stats = {
    total: recentOrders?.length || 0,
    totalAmount:
      recentOrders?.reduce((sum, o) => sum + (parseFloat(o.sale_price) || 0), 0) ||
      0,
    pending:
      recentOrders?.filter((o) => o.ord_status === "결제완료").length || 0,
    shipped:
      recentOrders?.filter((o) => o.ord_status === "배송중").length || 0,
  };

  return {
    orders: orders || [],
    total: count || 0,
    page,
    limit,
    search,
    status,
    dateFrom,
    dateTo,
    stats,
  };
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "결제완료":
      return <Badge className="bg-blue-100 text-blue-800">결제완료</Badge>;
    case "상품준비중":
      return <Badge className="bg-yellow-100 text-yellow-800">상품준비중</Badge>;
    case "배송중":
      return <Badge className="bg-purple-100 text-purple-800">배송중</Badge>;
    case "배송완료":
      return <Badge className="bg-green-100 text-green-800">배송완료</Badge>;
    case "취소":
      return <Badge className="bg-red-100 text-red-800">취소</Badge>;
    default:
      return <Badge variant="outline">{status || "미지정"}</Badge>;
  }
}

function formatPrice(price: string | number | null) {
  if (!price) return "-";
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ko-KR").format(num) + "원";
}

export default function CoupangOrdersPage({
  loaderData,
}: Route.ComponentProps) {
  const {
    orders,
    total,
    page,
    limit,
    search,
    status,
    dateFrom,
    dateTo,
    stats,
  } = loaderData;
  const totalPages = Math.ceil(total / limit);
  const syncFetcher = useFetcher();

  const [searchInput, setSearchInput] = useState(search);

  // 기본 날짜 범위 (최근 7일)
  const defaultFrom =
    dateFrom ||
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const defaultTo = dateTo || new Date().toISOString().split("T")[0];

  const handleSync = () => {
    syncFetcher.submit(
      {
        vendor_id: "auto",
        date_from: defaultFrom.replace(/-/g, ""),
        date_to: defaultTo.replace(/-/g, ""),
      },
      { method: "POST", action: "/api/integrations/coupang/sync-orders" }
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCartIcon className="h-6 w-6" />
            쿠팡 주문 목록
          </h1>
          <p className="text-muted-foreground">
            쿠팡 로켓그로스 주문 현황입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/integrations/coupang">← 연동 관리</Link>
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncFetcher.state === "submitting"}
          >
            <RefreshCwIcon
              className={`h-4 w-4 mr-2 ${syncFetcher.state === "submitting" ? "animate-spin" : ""}`}
            />
            주문 동기화
          </Button>
        </div>
      </div>

      {/* 주문 통계 (최근 30일) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCartIcon className="h-4 w-4" />
              30일 주문수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total.toLocaleString()}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PackageIcon className="h-4 w-4" />
              30일 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              처리대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.pending.toLocaleString()}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <TruckIcon className="h-4 w-4" />
              배송중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.shipped.toLocaleString()}건
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-sm font-medium mb-2 block">검색</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="주문번호, 수령인, 상품명..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-36">
              <label className="text-sm font-medium mb-2 block">시작일</label>
              <Input type="date" name="from" defaultValue={defaultFrom} />
            </div>
            <div className="w-36">
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <Input type="date" name="to" defaultValue={defaultTo} />
            </div>
            <div className="w-40">
              <label className="text-sm font-medium mb-2 block">상태</label>
              <Select name="status" defaultValue={status}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체 상태</SelectItem>
                  <SelectItem value="결제완료">결제완료</SelectItem>
                  <SelectItem value="상품준비중">상품준비중</SelectItem>
                  <SelectItem value="배송중">배송중</SelectItem>
                  <SelectItem value="배송완료">배송완료</SelectItem>
                  <SelectItem value="취소">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">검색</Button>
          </form>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            총 {total.toLocaleString()}건 (페이지 {page}/{totalPages || 1})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">주문번호</TableHead>
                <TableHead className="w-40">주문일시</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead className="w-24">수령인</TableHead>
                <TableHead className="w-24">상태</TableHead>
                <TableHead className="w-28 text-right">결제금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {search || status
                        ? "검색 결과가 없습니다."
                        : "동기화된 주문이 없습니다."}
                    </p>
                    {!search && !status && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleSync}
                      >
                        주문 동기화하기
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.ord_no}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.ord_time
                        ? new Date(order.ord_time).toLocaleString("ko-KR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">
                          {order.goods_name}
                        </p>
                        {order.option_name && (
                          <p className="text-sm text-muted-foreground">
                            {order.option_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.recv_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(order.ord_status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(order.sale_price)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                asChild={page > 1}
              >
                {page > 1 ? (
                  <Link
                    to={`?page=${page - 1}&search=${search}&status=${status}&from=${dateFrom}&to=${dateTo}`}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    이전
                  </Link>
                ) : (
                  <>
                    <ChevronLeftIcon className="h-4 w-4" />
                    이전
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                asChild={page < totalPages}
              >
                {page < totalPages ? (
                  <Link
                    to={`?page=${page + 1}&search=${search}&status=${status}&from=${dateFrom}&to=${dateTo}`}
                  >
                    다음
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    다음
                    <ChevronRightIcon className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
