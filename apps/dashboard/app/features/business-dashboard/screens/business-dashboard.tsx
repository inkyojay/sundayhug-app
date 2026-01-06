/**
 * 통합 비즈니스 대시보드
 *
 * 매출 분석, 채널 비교, 베스트셀러 등 핵심 비즈니스 지표를 한눈에 확인
 *
 * UI 구조:
 * - KPI 카드 4개 (총매출, 주문수, 객단가, 성장률)
 * - 일별 매출 추이 LineChart
 * - 채널별 매출 비교 BarChart + PieChart
 * - 베스트셀러 TOP 10 테이블
 */

import type { Route } from "./+types/business-dashboard";
import { data, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { BarChart3Icon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

import {
  getBusinessDashboardData,
  type PeriodType,
} from "../lib/business-dashboard.server";

import { KpiCards } from "../components/KpiCards";
import { SalesChart } from "../components/SalesChart";
import { ChannelComparison } from "../components/ChannelComparison";
import { TopProductsTable } from "../components/TopProductsTable";

// ============================================================================
// Meta
// ============================================================================

export function meta() {
  return [{ title: "비즈니스 대시보드 | 관리자" }];
}

// ============================================================================
// Loader
// ============================================================================

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") || "month") as PeriodType;

  // 유효한 기간인지 확인
  const validPeriods: PeriodType[] = ["today", "week", "month", "quarter"];
  const safePeriod = validPeriods.includes(period) ? period : "month";

  const dashboardData = await getBusinessDashboardData(safePeriod);

  return data(dashboardData);
}

// ============================================================================
// Component
// ============================================================================

// 기간 옵션
const PERIOD_OPTIONS = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주 (7일)" },
  { value: "month", label: "이번 달 (30일)" },
  { value: "quarter", label: "지난 3개월 (90일)" },
];

export default function BusinessDashboard() {
  const loaderData = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentPeriod = searchParams.get("period") || "month";

  // 기간 변경 핸들러
  const handlePeriodChange = (value: string) => {
    setSearchParams({ period: value });
  };

  // 기간 라벨 가져오기
  const getPeriodLabel = (period: string) => {
    const option = PERIOD_OPTIONS.find((o) => o.value === period);
    return option?.label || "이번 달 (30일)";
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3Icon className="h-6 w-6 text-blue-500" />
            비즈니스 대시보드
          </h1>
          <p className="text-muted-foreground">
            매출 분석 및 비즈니스 성과 현황
          </p>
        </div>
        <Select value={currentPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI 카드 */}
      <KpiCards data={loaderData.kpi} />

      {/* 일별 매출 추이 */}
      <SalesChart
        data={loaderData.dailySales}
        forecastData={loaderData.forecast}
        title="일별 매출 추이"
        description={`${getPeriodLabel(currentPeriod)} 매출 현황 및 예측`}
      />

      {/* 채널별 비교 & 베스트셀러 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChannelComparison data={loaderData.channelSales} />
        <TopProductsTable data={loaderData.topProducts} />
      </div>
    </div>
  );
}

export { ErrorBoundary } from "~/core/components/error-boundary";
