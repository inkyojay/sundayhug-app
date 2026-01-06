/**
 * 네이버 스마트스토어 고객 분석 대시보드
 *
 * 사용 API:
 * - customerStatusAccount: 계정 전체 고객 현황
 * - repurchaseStats: 재구매 통계
 */

import type { Route } from "./+types/customer-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Badge } from "~/core/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";
import {
  getCustomerStatusAccount,
  getRepurchaseStats,
} from "../lib/naver-stats.server";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 기본 날짜 범위 (최근 30일)
function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate") || getDefaultDateRange().startDate;
  const endDate = url.searchParams.get("endDate") || getDefaultDateRange().endDate;

  const [customerStatus, repurchase] = await Promise.all([
    getCustomerStatusAccount(startDate, endDate),
    getRepurchaseStats(startDate, endDate),
  ]);

  return {
    customerStatus,
    repurchase,
    dateRange: { startDate, endDate },
  };
}

export function meta() {
  return [{ title: "고객 분석 | 네이버 스마트스토어" }];
}

// 숫자 포맷팅
function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num);
}

// 퍼센트 포맷팅
function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

// 연령대 한글 매핑
const ageLabels: Record<string, string> = {
  teenage: "10대",
  early20s: "20대 초반",
  late20s: "20대 후반",
  early30s: "30대 초반",
  late30s: "30대 후반",
  early40s: "40대 초반",
  late40s: "40대 후반",
  over50s: "50대 이상",
};

// 차트 색상
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7c43"];

export default function CustomerAnalytics({ loaderData }: Route.ComponentProps) {
  const { customerStatus, repurchase, dateRange } = loaderData;

  // 고객 현황 데이터 가공
  const customerData = customerStatus.success ? customerStatus.data : [];
  const repurchaseData = repurchase.success ? repurchase.data : [];

  // 최신 데이터 (오늘 또는 가장 최근)
  const latestCustomer = Array.isArray(customerData) && customerData.length > 0
    ? customerData[0]
    : null;

  // 일별 추이 차트 데이터
  const dailyTrendData = Array.isArray(customerData)
    ? customerData.slice().reverse().map((item: any) => ({
        date: item.aggregateDate?.slice(5) || "", // MM-DD
        신규고객: item.purchaseStats?.newCustomerCount || 0,
        재방문고객: item.purchaseStats?.existCustomerCount || 0,
        총고객: item.purchaseStats?.customerCount || 0,
      }))
    : [];

  // 성별 파이 차트 데이터
  const genderData = latestCustomer
    ? [
        { name: "여성", value: latestCustomer.femalePurchaseStats?.ratio || 0 },
        { name: "남성", value: latestCustomer.malePurchaseStats?.ratio || 0 },
      ].filter((d) => d.value > 0)
    : [];

  // 연령별 데이터
  const ageData = latestCustomer?.agePurchaseStats
    ? Object.entries(latestCustomer.agePurchaseStats)
        .map(([key, value]: [string, any]) => ({
          name: ageLabels[key] || key,
          여성: value?.femalePurchaseStats?.ratio || 0,
          남성: value?.malePurchaseStats?.ratio || 0,
        }))
        .filter((d) => d.여성 > 0 || d.남성 > 0)
    : [];

  // 재구매 차트 데이터 (주간 데이터를 시각화)
  const repurchaseChartData = Array.isArray(repurchaseData)
    ? repurchaseData.slice().reverse().map((item: any) => ({
        date: item.aggregateDate?.slice(5) || "", // MM-DD
        구매금액: Math.round((item.purchaseAmount || 0) / 10000), // 만원 단위
        재구매금액: Math.round((item.repurchaseAmount || 0) / 10000),
        구매고객: item.purchaseCustomerCount || 0,
        재구매고객: item.repurchaseCustomerCount || 0,
        재구매율: item.repurchaseCustomerRatio || 0,
      }))
    : [];

  // 재구매 요약 통계
  const repurchaseSummary = Array.isArray(repurchaseData) && repurchaseData.length > 0
    ? repurchaseData.reduce(
        (acc: any, item: any) => ({
          totalPurchaseAmount: acc.totalPurchaseAmount + (item.purchaseAmount || 0),
          totalRepurchaseAmount: acc.totalRepurchaseAmount + (item.repurchaseAmount || 0),
          totalPurchaseCustomers: acc.totalPurchaseCustomers + (item.purchaseCustomerCount || 0),
          totalRepurchaseCustomers: acc.totalRepurchaseCustomers + (item.repurchaseCustomerCount || 0),
        }),
        { totalPurchaseAmount: 0, totalRepurchaseAmount: 0, totalPurchaseCustomers: 0, totalRepurchaseCustomers: 0 }
      )
    : null;

  // 총계 계산
  const totalStats = Array.isArray(customerData)
    ? customerData.reduce(
        (acc: any, item: any) => ({
          totalCustomers: acc.totalCustomers + (item.purchaseStats?.customerCount || 0),
          newCustomers: acc.newCustomers + (item.purchaseStats?.newCustomerCount || 0),
          existCustomers: acc.existCustomers + (item.purchaseStats?.existCustomerCount || 0),
          purchases: acc.purchases + (item.purchaseStats?.purchaseCount || 0),
          refunds: acc.refunds + (item.purchaseStats?.refundCount || 0),
        }),
        { totalCustomers: 0, newCustomers: 0, existCustomers: 0, purchases: 0, refunds: 0 }
      )
    : { totalCustomers: 0, newCustomers: 0, existCustomers: 0, purchases: 0, refunds: 0 };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">고객 분석</h1>
          <p className="text-muted-foreground">
            {dateRange.startDate} ~ {dateRange.endDate}
          </p>
        </div>
        <Badge variant="outline">계정 전체 데이터</Badge>
      </div>

      {/* 에러 표시 */}
      {!customerStatus.success && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">고객 데이터 로드 실패: {customerStatus.error}</p>
          </CardContent>
        </Card>
      )}

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 고객 수</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              기간 내 구매 고객
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">신규 고객</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(totalStats.newCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.totalCustomers > 0
                ? formatPercent((totalStats.newCustomers / totalStats.totalCustomers) * 100)
                : "0%"}{" "}
              비율
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재방문 고객</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(totalStats.existCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.totalCustomers > 0
                ? formatPercent((totalStats.existCustomers / totalStats.totalCustomers) * 100)
                : "0%"}{" "}
              비율
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">환불 건수</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(totalStats.refunds)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.purchases > 0
                ? formatPercent((totalStats.refunds / totalStats.purchases) * 100)
                : "0%"}{" "}
              환불율
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">일별 추이</TabsTrigger>
          <TabsTrigger value="demographics">고객 특성</TabsTrigger>
          <TabsTrigger value="repurchase">재구매 분석</TabsTrigger>
        </TabsList>

        {/* 일별 추이 탭 */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>일별 고객 추이</CardTitle>
              <CardDescription>기간 내 신규/재방문 고객 추이</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {dailyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <AreaChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="신규고객"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="재방문고객"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 고객 특성 탭 */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 성별 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>성별 분포</CardTitle>
                <CardDescription>최근 구매 고객 성별 비율</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    데이터가 없습니다
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 연령별 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>연령별 분포</CardTitle>
                <CardDescription>구매 고객 연령대 분포</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {ageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <BarChart data={ageData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="여성" fill="#ec4899" />
                      <Bar dataKey="남성" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    데이터가 없습니다
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 재구매 분석 탭 */}
        <TabsContent value="repurchase" className="space-y-4">
          {/* 재구매 요약 카드 */}
          {repurchaseSummary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">총 구매 금액</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₩{formatNumber(repurchaseSummary.totalPurchaseAmount)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">재구매 금액</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₩{formatNumber(repurchaseSummary.totalRepurchaseAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {repurchaseSummary.totalPurchaseAmount > 0
                      ? formatPercent((repurchaseSummary.totalRepurchaseAmount / repurchaseSummary.totalPurchaseAmount) * 100)
                      : "0%"}{" "}
                    비율
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">총 구매 고객</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(repurchaseSummary.totalPurchaseCustomers)}명
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">재구매 고객</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(repurchaseSummary.totalRepurchaseCustomers)}명
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {repurchaseSummary.totalPurchaseCustomers > 0
                      ? formatPercent((repurchaseSummary.totalRepurchaseCustomers / repurchaseSummary.totalPurchaseCustomers) * 100)
                      : "0%"}{" "}
                    재구매율
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 주간 재구매 추이 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>주간 재구매 추이</CardTitle>
              <CardDescription>주별 구매/재구매 금액 추이 (만원 단위)</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {repurchaseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <BarChart data={repurchaseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name.includes("금액") ? `${formatNumber(value)}만원` : `${formatNumber(value)}명`,
                        name
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="구매금액" fill="#3b82f6" name="구매금액" />
                    <Bar dataKey="재구매금액" fill="#10b981" name="재구매금액" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {repurchase.error || "재구매 데이터가 없습니다"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 주간 재구매 고객 추이 */}
          <Card>
            <CardHeader>
              <CardTitle>주간 재구매 고객 추이</CardTitle>
              <CardDescription>주별 구매/재구매 고객 수</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {repurchaseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <AreaChart data={repurchaseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`${formatNumber(value)}명`]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="구매고객"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="구매고객"
                    />
                    <Area
                      type="monotone"
                      dataKey="재구매고객"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.8}
                      name="재구매고객"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
