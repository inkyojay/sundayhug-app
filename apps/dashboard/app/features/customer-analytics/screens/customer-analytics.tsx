/**
 * 고객 분석 대시보드 (recharts 차트 포함)
 * 
 * - 재구매율 / 재구매 횟수
 * - 교차 채널 구매 현황
 * - 고객별 LTV
 * - 평균 구매 주기
 * - 코호트 분석 (첫 구매월 기준)
 * - 시각화 차트 (recharts)
 */
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import {
  BarChart3Icon,
  UsersIcon,
  RepeatIcon,
  TrendingUpIcon,
  CalendarIcon,
  ShoppingBagIcon,
  ArrowRightLeftIcon,
  FilterIcon,
} from "lucide-react";
import { useState } from "react";
import { data, useLoaderData } from "react-router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

export const meta: MetaFunction = () => {
  return [{ title: "고객 분석 | 관리자 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "90"; // 기본 90일

  // 기간 계산
  const periodDays = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  const startDateStr = startDate.toISOString();

  // 1. 전체 고객 수
  const { count: totalCustomers } = await adminClient
    .from("customers")
    .select("id", { count: "exact", head: true });

  // 2. 재구매 고객 (total_orders >= 2)
  const { count: repeatCustomers } = await adminClient
    .from("customers")
    .select("id", { count: "exact", head: true })
    .gte("total_orders", 2);

  // 3. 교차 채널 고객 (2개 이상 채널에서 구매)
  const { data: crossChannelData } = await adminClient
    .from("customers")
    .select("id, channels")
    .not("channels", "is", null);

  const crossChannelCustomers = crossChannelData?.filter(
    (c) => c.channels && c.channels.length >= 2
  ).length || 0;

  // 4. 총 매출 및 평균 LTV
  const { data: ltvData } = await adminClient
    .from("customers")
    .select("total_amount");

  const totalRevenue = ltvData?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
  const avgLTV = totalCustomers ? totalRevenue / totalCustomers : 0;

  // 5. Top 고객 (LTV 순)
  const { data: topCustomers } = await adminClient
    .from("customers")
    .select("id, name, phone, total_orders, total_amount, channels, first_order_date, last_order_date")
    .order("total_amount", { ascending: false })
    .limit(20);

  // 6. 채널별 고객 수
  const { data: allCustomersForChannels } = await adminClient
    .from("customers")
    .select("channels");

  const channelStats: Record<string, number> = {};
  allCustomersForChannels?.forEach((c) => {
    (c.channels || []).forEach((ch: string) => {
      channelStats[ch] = (channelStats[ch] || 0) + 1;
    });
  });

  // 7. 교차 채널 고객 상세
  const { data: crossChannelCustomersData } = await adminClient
    .from("customers")
    .select("id, name, phone, total_orders, total_amount, channels, first_order_date")
    .not("channels", "is", null)
    .order("total_amount", { ascending: false })
    .limit(50);

  const filteredCrossChannel = crossChannelCustomersData?.filter(
    (c) => c.channels && c.channels.length >= 2
  ) || [];

  // 8. 코호트 분석 (월별 첫 구매 고객의 재구매율)
  const { data: cohortData } = await adminClient
    .from("customers")
    .select("first_order_date, total_orders")
    .not("first_order_date", "is", null)
    .order("first_order_date", { ascending: false });

  // 월별 그룹화
  const cohortStats: Record<string, { total: number; repeat: number }> = {};
  cohortData?.forEach((c) => {
    if (c.first_order_date) {
      const month = c.first_order_date.slice(0, 7); // YYYY-MM
      if (!cohortStats[month]) {
        cohortStats[month] = { total: 0, repeat: 0 };
      }
      cohortStats[month].total++;
      if ((c.total_orders || 0) >= 2) {
        cohortStats[month].repeat++;
      }
    }
  });

  // 최근 12개월만
  const sortedCohorts = Object.entries(cohortStats)
    .sort((a, b) => a[0].localeCompare(b[0])) // 오래된 것부터 (차트용)
    .slice(-12)
    .map(([month, stats]) => ({
      month: month.slice(5), // MM만
      fullMonth: month,
      total: stats.total,
      repeat: stats.repeat,
      rate: stats.total > 0 ? Math.round(stats.repeat / stats.total * 100) : 0,
    }));

  // 9. 평균 구매 주기 계산
  const { data: cycleData } = await adminClient
    .from("customers")
    .select("first_order_date, last_order_date, total_orders")
    .gte("total_orders", 2);

  let totalDays = 0;
  let cycleCount = 0;
  cycleData?.forEach((c) => {
    if (c.first_order_date && c.last_order_date && c.total_orders >= 2) {
      const first = new Date(c.first_order_date);
      const last = new Date(c.last_order_date);
      const days = Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
      const avgPerOrder = days / (c.total_orders - 1);
      totalDays += avgPerOrder;
      cycleCount++;
    }
  });
  const avgPurchaseCycle = cycleCount > 0 ? Math.round(totalDays / cycleCount) : 0;

  // 10. LTV 분포 (구간별)
  const ltvDistribution: Record<string, number> = {
    "0-5만": 0,
    "5-10만": 0,
    "10-30만": 0,
    "30-50만": 0,
    "50-100만": 0,
    "100만+": 0,
  };
  ltvData?.forEach((c) => {
    const amount = c.total_amount || 0;
    if (amount < 50000) ltvDistribution["0-5만"]++;
    else if (amount < 100000) ltvDistribution["5-10만"]++;
    else if (amount < 300000) ltvDistribution["10-30만"]++;
    else if (amount < 500000) ltvDistribution["30-50만"]++;
    else if (amount < 1000000) ltvDistribution["50-100만"]++;
    else ltvDistribution["100만+"]++;
  });

  const ltvDistributionData = Object.entries(ltvDistribution).map(([range, count]) => ({
    range,
    count,
  }));

  // 11. 채널별 매출
  const { data: channelRevenueData } = await adminClient
    .from("customers")
    .select("channels, total_amount");

  const channelRevenue: Record<string, number> = {};
  channelRevenueData?.forEach((c) => {
    const amount = c.total_amount || 0;
    const channels = c.channels || [];
    // 채널이 하나면 해당 채널에 전액 할당, 여러개면 균등 분배
    const perChannel = channels.length > 0 ? amount / channels.length : 0;
    channels.forEach((ch: string) => {
      channelRevenue[ch] = (channelRevenue[ch] || 0) + perChannel;
    });
  });

  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  const channelPieData = Object.entries(channelRevenue).map(([name, value], idx) => ({
    name: name === "cafe24" ? "Cafe24" : name === "naver" ? "네이버" : name,
    value: Math.round(value),
    color: COLORS[idx % COLORS.length],
  }));

  // 12. 주문횟수 분포
  const { data: orderCountData } = await adminClient
    .from("customers")
    .select("total_orders");

  const orderDistribution: Record<string, number> = {
    "1회": 0,
    "2회": 0,
    "3회": 0,
    "4회": 0,
    "5회+": 0,
  };
  orderCountData?.forEach((c) => {
    const orders = c.total_orders || 0;
    if (orders === 1) orderDistribution["1회"]++;
    else if (orders === 2) orderDistribution["2회"]++;
    else if (orders === 3) orderDistribution["3회"]++;
    else if (orders === 4) orderDistribution["4회"]++;
    else if (orders >= 5) orderDistribution["5회+"]++;
  });

  const orderDistributionData = Object.entries(orderDistribution).map(([orders, count]) => ({
    orders,
    count,
  }));

  return data({
    summary: {
      totalCustomers: totalCustomers || 0,
      repeatCustomers: repeatCustomers || 0,
      repeatRate: totalCustomers ? ((repeatCustomers || 0) / totalCustomers * 100).toFixed(1) : "0",
      crossChannelCustomers,
      crossChannelRate: totalCustomers ? (crossChannelCustomers / totalCustomers * 100).toFixed(1) : "0",
      totalRevenue,
      avgLTV: Math.round(avgLTV),
      avgPurchaseCycle,
    },
    topCustomers: topCustomers || [],
    channelStats,
    crossChannelCustomers: filteredCrossChannel,
    cohortStats: sortedCohorts,
    ltvDistribution: ltvDistributionData,
    channelPieData,
    orderDistribution: orderDistributionData,
    period,
  });
}

// 채널 뱃지
function getChannelBadge(channel: string) {
  const channelMap: Record<string, { label: string; color: string }> = {
    "cafe24": { label: "Cafe24", color: "bg-blue-100 text-blue-800" },
    "naver": { label: "네이버", color: "bg-green-100 text-green-800" },
    "playauto": { label: "PlayAuto", color: "bg-gray-100 text-gray-800" },
  };
  const config = channelMap[channel] || { label: channel, color: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// 숫자 포맷
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString();
};

export default function CustomerAnalyticsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3Icon className="h-6 w-6 text-purple-500" />
            고객 분석
          </h1>
          <p className="text-muted-foreground">
            교차 채널 재구매 분석 및 고객 LTV 추적
          </p>
        </div>
        <Select 
          value={loaderData.period} 
          onValueChange={(v) => window.location.href = `/dashboard/customer-analytics?period=${v}`}
        >
          <SelectTrigger className="w-[150px]">
            <FilterIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">최근 7일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="90">최근 90일</SelectItem>
            <SelectItem value="365">최근 1년</SelectItem>
            <SelectItem value="9999">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 고객</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.summary.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">직접연동 주문 기준</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재구매율</CardTitle>
            <RepeatIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loaderData.summary.repeatRate}%</div>
            <p className="text-xs text-muted-foreground">
              {loaderData.summary.repeatCustomers}명 / 2회 이상 구매
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">교차 채널율</CardTitle>
            <ArrowRightLeftIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{loaderData.summary.crossChannelRate}%</div>
            <p className="text-xs text-muted-foreground">
              {loaderData.summary.crossChannelCustomers}명 / 2개+ 채널
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 LTV</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{loaderData.summary.avgLTV.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              총 매출: ₩{formatCurrency(loaderData.summary.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 코호트 분석 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 재구매율 추이</CardTitle>
            <CardDescription>첫 구매 월 기준 재구매 전환율</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loaderData.cohortStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={loaderData.cohortStats}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" unit="%" domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, "재구매율"]}
                      labelFormatter={(label) => `${label}월`}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRate)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 채널별 매출 파이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>채널별 매출 비중</CardTitle>
            <CardDescription>고객 구매 채널 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loaderData.channelPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={loaderData.channelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {loaderData.channelPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₩${formatCurrency(value)}`, ""]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {loaderData.channelPieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                    <span className="text-muted-foreground">₩{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LTV 분포 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>LTV 분포</CardTitle>
            <CardDescription>고객별 총 구매금액 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loaderData.ltvDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [`${value}명`, "고객 수"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 주문횟수 분포 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>주문횟수 분포</CardTitle>
            <CardDescription>고객별 주문 횟수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loaderData.orderDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="orders" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [`${value}명`, "고객 수"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 지표 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 구매 주기</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaderData.summary.avgPurchaseCycle}일</div>
            <p className="text-xs text-muted-foreground">재구매 고객 기준</p>
          </CardContent>
        </Card>
        {Object.entries(loaderData.channelStats).slice(0, 3).map(([channel, count]) => (
          <Card key={channel}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{getChannelBadge(channel)}</CardTitle>
              <ShoppingBagIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(count as number).toLocaleString()}명</div>
              <p className="text-xs text-muted-foreground">해당 채널 구매 고객</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">LTV 순위</TabsTrigger>
          <TabsTrigger value="cross-channel">교차 채널</TabsTrigger>
          <TabsTrigger value="cohort">코호트 상세</TabsTrigger>
        </TabsList>

        {/* LTV 순위 */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>고객 LTV 순위 (Top 20)</CardTitle>
              <CardDescription>총 구매금액 기준 상위 고객</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px]">순위</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead className="text-right">총 주문</TableHead>
                    <TableHead className="text-right">총 금액</TableHead>
                    <TableHead>채널</TableHead>
                    <TableHead>첫 구매</TableHead>
                    <TableHead>최근 구매</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaderData.topCustomers.map((customer: any, idx: number) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Badge variant={idx < 3 ? "default" : "secondary"}>
                          {idx + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3")}
                      </TableCell>
                      <TableCell className="text-right">{customer.total_orders}회</TableCell>
                      <TableCell className="text-right font-medium">
                        ₩{(customer.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(customer.channels || []).map((ch: string) => (
                            <span key={ch}>{getChannelBadge(ch)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {customer.first_order_date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {customer.last_order_date?.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 교차 채널 */}
        <TabsContent value="cross-channel">
          <Card>
            <CardHeader>
              <CardTitle>교차 채널 구매 고객</CardTitle>
              <CardDescription>2개 이상 채널에서 구매한 고객 (총 {loaderData.crossChannelCustomers.length}명)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead className="text-right">총 주문</TableHead>
                    <TableHead className="text-right">총 금액</TableHead>
                    <TableHead>구매 채널</TableHead>
                    <TableHead>첫 구매</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaderData.crossChannelCustomers.map((customer: any) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3")}
                      </TableCell>
                      <TableCell className="text-right">{customer.total_orders}회</TableCell>
                      <TableCell className="text-right font-medium">
                        ₩{(customer.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(customer.channels || []).map((ch: string) => (
                            <span key={ch}>{getChannelBadge(ch)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {customer.first_order_date?.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {loaderData.crossChannelCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        교차 채널 고객이 없습니다
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 코호트 상세 */}
        <TabsContent value="cohort">
          <Card>
            <CardHeader>
              <CardTitle>코호트 분석 (월별 재구매율)</CardTitle>
              <CardDescription>첫 구매월 기준 재구매 전환율 (최근 12개월)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>첫 구매월</TableHead>
                    <TableHead className="text-right">신규 고객</TableHead>
                    <TableHead className="text-right">재구매 고객</TableHead>
                    <TableHead className="text-right">재구매율</TableHead>
                    <TableHead className="w-[200px]">시각화</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaderData.cohortStats.slice().reverse().map((cohort: any) => (
                    <TableRow key={cohort.fullMonth}>
                      <TableCell className="font-medium">{cohort.fullMonth}</TableCell>
                      <TableCell className="text-right">{cohort.total}명</TableCell>
                      <TableCell className="text-right">{cohort.repeat}명</TableCell>
                      <TableCell className="text-right font-medium">{cohort.rate}%</TableCell>
                      <TableCell>
                        <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${Math.min(cohort.rate, 100)}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loaderData.cohortStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        데이터가 없습니다. 주문을 동기화해주세요.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 안내 */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            💡 <strong>고객 데이터</strong>는 주문 동기화 시 자동으로 수집됩니다.
            "주문 관리 (직접연동)" 페이지에서 카페24/네이버 주문을 동기화하면 고객 정보가 자동으로 매칭됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
