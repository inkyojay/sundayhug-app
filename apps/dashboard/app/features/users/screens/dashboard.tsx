/**
 * Sundayhug 내부 관리 시스템 - 메인 대시보드
 * 
 * KPI 카드 + 차트 + 빠른 액션 + 최근 활동
 */
import type { Route } from "./+types/dashboard";

import { 
  BoxIcon, 
  PackageIcon, 
  AlertTriangleIcon, 
  TrendingUpIcon,
  ShoppingCartIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
  RefreshCwIcon,
  ClockIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { Link, useFetcher, useRevalidator } from "react-router";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";

// Supabase client
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const meta: Route.MetaFunction = () => {
  return [{ title: `대시보드 | Sundayhug Admin` }];
};

/**
 * 서버에서 데이터 로드
 */
export async function loader({ request }: Route.LoaderArgs) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // 병렬로 데이터 조회
  const [
    productCountResult,
    inventoryStatsResult,
    todayOrdersResult,
    weekOrdersResult,
    todayWarrantyResult,
    pendingWarrantyResult,
    pendingReviewResult,
    recentOrdersResult,
    recentWarrantiesResult,
    recentReviewsResult,
    dailyOrdersResult,
    channelStatsResult,
    lowStockResult,
  ] = await Promise.all([
    // 제품 수
    supabase.from("products").select("*", { count: "exact", head: true }),
    // 재고 통계
    supabase.from("inventory").select("current_stock, alert_threshold"),
    // 오늘 주문
    supabase
      .from("orders")
      .select("id, pay_amt, sales", { count: "exact" })
      .gte("ord_time", `${todayStr}T00:00:00`),
    // 이번주 주문
    supabase
      .from("orders")
      .select("id, pay_amt, sales", { count: "exact" })
      .gte("ord_time", `${weekAgoStr}T00:00:00`),
    // 오늘 보증서
    supabase
      .from("warranties")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${todayStr}T00:00:00`),
    // 승인 대기 보증서
    supabase
      .from("warranties")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    // 승인 대기 후기
    supabase
      .from("review_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    // 최근 주문 10개
    supabase
      .from("orders")
      .select("id, shop_ord_no, shop_name, to_name, pay_amt, sales, ord_status, ord_time")
      .order("ord_time", { ascending: false })
      .limit(10),
    // 최근 보증서 10개
    supabase
      .from("warranties")
      .select("id, warranty_number, buyer_name, product_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    // 최근 후기 10개
    supabase
      .from("review_submissions")
      .select("id, buyer_name, review_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    // 일별 주문 (최근 7일)
    supabase
      .from("orders")
      .select("ord_time, pay_amt, sales")
      .gte("ord_time", weekAgoStr)
      .order("ord_time", { ascending: true }),
    // 채널별 주문
    supabase
      .from("orders")
      .select("shop_name")
      .gte("ord_time", weekAgoStr),
    // 재고 부족
    supabase
      .from("inventory")
      .select(`
        id,
        sku,
        current_stock,
        alert_threshold,
        products (product_name)
      `)
      .lte("current_stock", 10)
      .order("current_stock", { ascending: true })
      .limit(5),
  ]);

  // 재고 통계 계산
  const inventoryStats = inventoryStatsResult.data || [];
  const totalStock = inventoryStats.reduce((sum, item) => sum + (item.current_stock || 0), 0);
  const lowStockCount = inventoryStats.filter(
    item => item.current_stock <= item.alert_threshold
  ).length;

  // 오늘 매출 계산
  const todayRevenue = (todayOrdersResult.data || []).reduce((sum, order) => {
    return sum + (parseFloat(order.pay_amt || 0) || parseFloat(order.sales || 0));
  }, 0);

  // 이번주 매출 계산
  const weekRevenue = (weekOrdersResult.data || []).reduce((sum, order) => {
    return sum + (parseFloat(order.pay_amt || 0) || parseFloat(order.sales || 0));
  }, 0);

  // 일별 주문/매출 데이터 가공
  const dailyData: Record<string, { date: string; orders: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const displayDate = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyData[dateStr] = { date: displayDate, orders: 0, revenue: 0 };
  }
  
  (dailyOrdersResult.data || []).forEach((order: any) => {
    const dateStr = order.ord_time?.split("T")[0];
    if (dateStr && dailyData[dateStr]) {
      dailyData[dateStr].orders += 1;
      dailyData[dateStr].revenue += (parseFloat(order.pay_amt || 0) || parseFloat(order.sales || 0));
    }
  });
  
  const chartData = Object.values(dailyData);

  // 채널별 통계
  const channelCounts: Record<string, number> = {};
  (channelStatsResult.data || []).forEach((order: any) => {
    const channel = order.shop_name || "기타";
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
  });
  
  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  const pieData = Object.entries(channelCounts).map(([name, value], idx) => ({
    name,
    value,
    color: COLORS[idx % COLORS.length],
  }));

  return {
    stats: {
      productCount: productCountResult.count || 0,
      totalStock,
      lowStockCount,
      inventoryCount: inventoryStats.length,
      todayOrders: todayOrdersResult.count || 0,
      todayRevenue,
      weekOrders: weekOrdersResult.count || 0,
      weekRevenue,
      todayWarranties: todayWarrantyResult.count || 0,
      pendingWarranties: pendingWarrantyResult.count || 0,
      pendingReviews: pendingReviewResult.count || 0,
    },
    chartData,
    pieData,
    recentOrders: recentOrdersResult.data || [],
    recentWarranties: recentWarrantiesResult.data || [],
    recentReviews: recentReviewsResult.data || [],
    lowStockItems: lowStockResult.data || [],
  };
}

// 상태 배지
const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">대기</Badge>;
    case "approved":
      return <Badge className="bg-green-500">승인</Badge>;
    case "rejected":
      return <Badge variant="destructive">거절</Badge>;
    case "신규주문":
      return <Badge className="bg-blue-500">신규</Badge>;
    case "배송중":
      return <Badge className="bg-orange-500">배송중</Badge>;
    case "배송완료":
      return <Badge className="bg-green-500">배송완료</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

// 리뷰 타입 배지
const reviewTypeBadge = (type: string) => {
  switch (type) {
    case "momcafe":
      return <Badge className="bg-pink-500">맘카페</Badge>;
    case "instagram":
      return <Badge className="bg-purple-500">인스타</Badge>;
    case "blog":
      return <Badge className="bg-green-500">블로그</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
};

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { stats, chartData, pieData, recentOrders, recentWarranties, recentReviews, lowStockItems } = loaderData;
  const revalidator = useRevalidator();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    revalidator.revalidate();
  };

  useEffect(() => {
    if (revalidator.state === "idle") {
      setIsRefreshing(false);
    }
  }, [revalidator.state]);

  // 숫자 포맷
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">Sundayhug 관리 시스템 현황</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* 승인 대기 알림 배너 */}
      {(stats.pendingWarranties > 0 || stats.pendingReviews > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">승인 대기 항목이 있습니다</p>
                  <p className="text-sm text-amber-600">
                    보증서 {stats.pendingWarranties}건, 후기 {stats.pendingReviews}건
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {stats.pendingWarranties > 0 && (
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" asChild>
                    <Link to="/dashboard/warranty/pending">보증서 처리</Link>
                  </Button>
                )}
                {stats.pendingReviews > 0 && (
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" asChild>
                    <Link to="/dashboard/reviews?status=pending">후기 처리</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI 카드 - 1행 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 주문</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}건</div>
            <p className="text-xs text-muted-foreground">
              매출 ₩{formatCurrency(stats.todayRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번주 주문</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekOrders}건</div>
            <p className="text-xs text-muted-foreground">
              매출 ₩{formatCurrency(stats.weekRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 보증서</CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayWarranties}건</div>
            <p className="text-xs text-muted-foreground">
              대기 <span className="text-amber-600 font-medium">{stats.pendingWarranties}건</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">후기 대기</CardTitle>
            <StarIcon className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingReviews}건</div>
            <p className="text-xs text-muted-foreground">승인 대기 중</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI 카드 - 2행 (재고) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 제품</CardTitle>
            <BoxIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">등록된 SKU 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 재고</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">전체 재고 수량</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재고 부족</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">안전재고 미달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재고 SKU</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inventoryCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">동기화된 재고</p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 주문/매출 차트 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>최근 7일 주문 현황</CardTitle>
            <CardDescription>일별 주문 건수 및 매출</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders">주문 건수</TabsTrigger>
                <TabsTrigger value="revenue">매출</TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [`${value}건`, "주문"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="revenue" className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis 
                      className="text-xs" 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`₩${value.toLocaleString()}`, "매출"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 채널별 파이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>채널별 주문</CardTitle>
            <CardDescription>최근 7일 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value}건`, ""]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.name}</span>
                      <span className="text-muted-foreground">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 + 최근 활동 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 빠른 액션 */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 액션</CardTitle>
            <CardDescription>자주 사용하는 기능</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/dashboard/warranty/pending">
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                보증서 승인 대기
                {stats.pendingWarranties > 0 && (
                  <Badge className="ml-auto bg-amber-500">{stats.pendingWarranties}</Badge>
                )}
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/dashboard/reviews?status=pending">
                <StarIcon className="h-4 w-4 mr-2" />
                후기 승인 대기
                {stats.pendingReviews > 0 && (
                  <Badge className="ml-auto bg-amber-500">{stats.pendingReviews}</Badge>
                )}
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/dashboard/orders-direct">
                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                주문 동기화
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/dashboard/inventory">
                <PackageIcon className="h-4 w-4 mr-2" />
                재고 현황
                {stats.lowStockCount > 0 && (
                  <Badge className="ml-auto" variant="destructive">{stats.lowStockCount}</Badge>
                )}
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/dashboard/products">
                <BoxIcon className="h-4 w-4 mr-2" />
                제품 관리
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 최근 주문 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 주문</CardTitle>
              <CardDescription>최신 10건</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/orders">
                전체보기 <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{order.to_name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.shop_name} · {order.shop_ord_no?.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    {statusBadge(order.ord_status)}
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  주문이 없습니다
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 활동 (보증서 + 후기) */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>보증서 및 후기</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="warranty" className="space-y-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="warranty">보증서</TabsTrigger>
                <TabsTrigger value="review">후기</TabsTrigger>
              </TabsList>
              <TabsContent value="warranty" className="space-y-3">
                {recentWarranties.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.buyer_name || "-"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.product_name}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      {statusBadge(item.status)}
                    </div>
                  </div>
                ))}
                {recentWarranties.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    보증서가 없습니다
                  </p>
                )}
              </TabsContent>
              <TabsContent value="review" className="space-y-3">
                {recentReviews.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.buyer_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {reviewTypeBadge(item.review_type)}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      {statusBadge(item.status)}
                    </div>
                  </div>
                ))}
                {recentReviews.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    후기가 없습니다
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 재고 부족 경고 */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon className="h-5 w-5" />
              재고 부족 상품
            </CardTitle>
            <CardDescription>안전재고 미달 또는 10개 이하</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {lowStockItems.map((item: any) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-lg border border-red-200 bg-red-50"
                >
                  <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                  <p className="text-sm font-medium truncate">
                    {item.products?.product_name || "-"}
                  </p>
                  <p className="text-lg font-bold text-destructive">
                    재고 {item.current_stock}개
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link to="/dashboard/inventory?stockFilter=low">
                  전체 재고 부족 상품 보기
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
