/**
 * 고객 분석 대시보드
 * 
 * Laplace Tech 스타일 고객 분석 기능
 * - 재구매율 / 재구매 횟수
 * - 교차 채널 구매 현황
 * - 고객별 LTV
 * - 평균 구매 주기
 * - 코호트 분석 (첫 구매월 기준)
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
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { data, useLoaderData, useFetcher } from "react-router";

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

export const meta: MetaFunction = () => {
  return [{ title: "고객 분석 | 관리자 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

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
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([month, stats]) => ({
      month,
      total: stats.total,
      repeat: stats.repeat,
      rate: stats.total > 0 ? (stats.repeat / stats.total * 100).toFixed(1) : "0",
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

export default function CustomerAnalyticsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3Icon className="h-6 w-6 text-purple-500" />
            고객 분석
          </h1>
          <p className="text-muted-foreground">
            교차 채널 재구매 분석 및 고객 LTV 추적
          </p>
        </div>
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
            <div className="text-2xl font-bold">{loaderData.summary.repeatRate}%</div>
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
            <div className="text-2xl font-bold">{loaderData.summary.crossChannelRate}%</div>
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
              총 매출: ₩{loaderData.summary.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 추가 지표 */}
      <div className="grid gap-4 md:grid-cols-3">
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
        {Object.entries(loaderData.channelStats).map(([channel, count]) => (
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
          <TabsTrigger value="cohort">코호트 분석</TabsTrigger>
        </TabsList>

        {/* LTV 순위 */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>고객 LTV 순위 (Top 20)</CardTitle>
              <CardDescription>총 구매금액 기준 상위 고객</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>총 주문</TableHead>
                    <TableHead>총 금액</TableHead>
                    <TableHead>채널</TableHead>
                    <TableHead>첫 구매</TableHead>
                    <TableHead>최근 구매</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaderData.topCustomers.map((customer: any, idx: number) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3")}
                      </TableCell>
                      <TableCell>{customer.total_orders}회</TableCell>
                      <TableCell className="font-medium">
                        ₩{(customer.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(customer.channels || []).map((ch: string) => (
                            <span key={ch}>{getChannelBadge(ch)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.first_order_date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>총 주문</TableHead>
                    <TableHead>총 금액</TableHead>
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
                      <TableCell>{customer.total_orders}회</TableCell>
                      <TableCell className="font-medium">
                        ₩{(customer.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(customer.channels || []).map((ch: string) => (
                            <span key={ch}>{getChannelBadge(ch)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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

        {/* 코호트 분석 */}
        <TabsContent value="cohort">
          <Card>
            <CardHeader>
              <CardTitle>코호트 분석 (월별 재구매율)</CardTitle>
              <CardDescription>첫 구매월 기준 재구매 전환율 (최근 12개월)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>첫 구매월</TableHead>
                    <TableHead>신규 고객</TableHead>
                    <TableHead>재구매 고객</TableHead>
                    <TableHead>재구매율</TableHead>
                    <TableHead>시각화</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaderData.cohortStats.map((cohort: any) => (
                    <TableRow key={cohort.month}>
                      <TableCell className="font-medium">{cohort.month}</TableCell>
                      <TableCell>{cohort.total}명</TableCell>
                      <TableCell>{cohort.repeat}명</TableCell>
                      <TableCell className="font-medium">{cohort.rate}%</TableCell>
                      <TableCell>
                        <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(parseFloat(cohort.rate), 100)}%` }}
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

