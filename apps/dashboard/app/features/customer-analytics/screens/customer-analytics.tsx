/**
 * 고객 행동 분석 (RFM) 대시보드
 *
 * - RFM 분석 (Recency, Frequency, Monetary)
 * - LTV (고객 생애 가치) 분석
 * - 코호트 분석 (첫 구매월 기준 리텐션)
 */
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { BarChart3Icon } from "lucide-react";
import { useState } from "react";
import { data, useLoaderData } from "react-router";

import { Badge } from "~/core/components/ui/badge";
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

import { RfmOverview } from "../components/RfmOverview";
import { RfmScatterChart } from "../components/RfmScatterChart";
import { CustomerSegments } from "../components/CustomerSegments";
import { LtvChart } from "../components/LtvChart";
import { CohortTable } from "../components/CohortTable";
import {
  SEGMENT_INFO,
  type CustomerSegment,
  type RFMScore,
  type LTVData,
} from "../types";

export const meta: MetaFunction = () => {
  return [{ title: "고객 행동 분석 (RFM) | 관리자 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const { getCustomerAnalyticsData } = await import("../lib/customer-analytics.server");
  const adminClient = createAdminClient();

  // 모든 분석 데이터 조회
  const analyticsData = await getCustomerAnalyticsData(adminClient);

  return data({
    rfm: analyticsData.rfm,
    ltv: analyticsData.ltv,
    cohort: analyticsData.cohort,
  });
}

// 세그먼트 뱃지 컴포넌트
function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  const info = SEGMENT_INFO[segment];
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${info?.bgColor || "bg-gray-100"}`}
      style={{ color: info?.color }}
    >
      {segment}
    </span>
  );
}

// 전화번호 마스킹
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3");
}

// 통화 포맷
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return value.toLocaleString();
}

export default function CustomerAnalyticsPage() {
  const { rfm, ltv, cohort } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState("rfm");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3Icon className="h-6 w-6 text-purple-500" />
            고객 행동 분석
          </h1>
          <p className="text-muted-foreground">
            RFM 분석, LTV 계산, 코호트 리텐션 분석
          </p>
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="rfm">RFM 분석</TabsTrigger>
          <TabsTrigger value="ltv">LTV 분석</TabsTrigger>
          <TabsTrigger value="cohort">코호트 분석</TabsTrigger>
        </TabsList>

        {/* RFM 분석 탭 */}
        <TabsContent value="rfm" className="space-y-6">
          {/* RFM 요약 카드 */}
          <RfmOverview summary={rfm.summary} />

          {/* 차트 영역 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 세그먼트 분포 */}
            <CustomerSegments
              distribution={rfm.segmentDistribution}
              totalCustomers={rfm.summary.totalCustomers}
            />

            {/* RFM 산점도 */}
            <RfmScatterChart scores={rfm.scores} />
          </div>

          {/* 고객 목록 테이블 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>고객 RFM 스코어</CardTitle>
                  <CardDescription>
                    RFM 점수별 고객 목록 (상위 100명)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>고객명</TableHead>
                      <TableHead>전화번호</TableHead>
                      <TableHead className="text-center">R점수</TableHead>
                      <TableHead className="text-center">F점수</TableHead>
                      <TableHead className="text-center">M점수</TableHead>
                      <TableHead className="text-right">구매횟수</TableHead>
                      <TableHead className="text-right">총 구매액</TableHead>
                      <TableHead>세그먼트</TableHead>
                      <TableHead>마지막 구매</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfm.scores.slice(0, 100).map((score: RFMScore, idx: number) => (
                      <TableRow key={score.customerId}>
                        <TableCell className="font-medium">
                          {score.customerName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {maskPhone(score.customerPhone)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={score.rScore >= 4 ? "default" : score.rScore <= 2 ? "destructive" : "secondary"}
                          >
                            {score.rScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={score.fScore >= 4 ? "default" : score.fScore <= 2 ? "destructive" : "secondary"}
                          >
                            {score.fScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={score.mScore >= 4 ? "default" : score.mScore <= 2 ? "destructive" : "secondary"}
                          >
                            {score.mScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {score.frequency}회
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₩{formatCurrency(score.monetary)}
                        </TableCell>
                        <TableCell>
                          <SegmentBadge segment={score.segment} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {score.lastPurchase?.slice(0, 10) || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rfm.scores.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground py-8"
                        >
                          데이터가 없습니다. 주문을 동기화해주세요.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LTV 분석 탭 */}
        <TabsContent value="ltv" className="space-y-6">
          {/* LTV 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 LTV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₩{formatCurrency(ltv.summary.avgLTV)}
                </div>
                <p className="text-xs text-muted-foreground">
                  전체 고객 평균
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">상위 10%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₩{formatCurrency(ltv.summary.top10PercentLTV)}
                </div>
                <p className="text-xs text-muted-foreground">
                  VIP 고객 평균 LTV
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">하위 50%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₩{formatCurrency(ltv.summary.bottom50PercentLTV)}
                </div>
                <p className="text-xs text-muted-foreground">
                  일반 고객 평균 LTV
                </p>
              </CardContent>
            </Card>
          </div>

          {/* LTV 분포 차트 */}
          <LtvChart distribution={ltv.distribution} summary={ltv.summary} />

          {/* 상위 LTV 고객 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>상위 LTV 고객 (TOP 20)</CardTitle>
              <CardDescription>
                총 구매금액 기준 상위 고객 목록
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">순위</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>전화번호</TableHead>
                      <TableHead className="text-right">LTV</TableHead>
                      <TableHead className="text-right">주문 횟수</TableHead>
                      <TableHead className="text-right">평균 주문액</TableHead>
                      <TableHead>첫 구매</TableHead>
                      <TableHead>최근 구매</TableHead>
                      <TableHead className="text-right">고객 기간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ltv.data.slice(0, 20).map((customer: LTVData, idx: number) => (
                      <TableRow key={customer.customerId}>
                        <TableCell>
                          <Badge variant={idx < 3 ? "default" : "secondary"}>
                            {idx + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {customer.customerName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {maskPhone(customer.customerPhone)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ₩{formatCurrency(customer.ltv)}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.orderCount}회
                        </TableCell>
                        <TableCell className="text-right">
                          ₩{formatCurrency(customer.avgOrderValue)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {customer.firstPurchase?.slice(0, 10) || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {customer.lastPurchase?.slice(0, 10) || "-"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {customer.customerLifetimeDays}일
                        </TableCell>
                      </TableRow>
                    ))}
                    {ltv.data.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground py-8"
                        >
                          데이터가 없습니다. 주문을 동기화해주세요.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 코호트 분석 탭 */}
        <TabsContent value="cohort" className="space-y-6">
          {/* 코호트 리텐션 테이블 */}
          <CohortTable cohortData={cohort} />

          {/* 코호트 설명 */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h4 className="font-medium">코호트 분석이란?</h4>
                <p className="text-sm text-muted-foreground">
                  코호트 분석은 첫 구매월이 같은 고객 그룹(코호트)의 시간에 따른 행동 패턴을 분석합니다.
                  M+0은 첫 구매월, M+1은 첫 구매 후 1개월, M+2는 2개월 후를 의미합니다.
                  각 셀의 숫자는 해당 월에 재구매한 고객의 비율(%)을 나타냅니다.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                  <li>M+0이 항상 100%인 이유: 첫 구매월에는 모든 고객이 구매함</li>
                  <li>M+1 이후 숫자가 높을수록 재구매율이 높은 좋은 코호트</li>
                  <li>최근 코호트는 아직 시간이 지나지 않아 데이터가 적음</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 안내 */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>데이터 소스:</strong> 주문 동기화 시 자동으로 수집된 고객 데이터를 기반으로 분석합니다.
            "주문 관리 (통합)" 페이지에서 Cafe24/네이버/쿠팡 주문을 동기화하면 고객 정보가 자동으로 매칭됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { ErrorBoundary } from "~/core/components/error-boundary";
