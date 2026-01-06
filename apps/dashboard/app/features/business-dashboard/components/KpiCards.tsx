/**
 * KPI 카드 컴포넌트
 *
 * 핵심 KPI 4개 표시: 총매출, 주문수, 객단가, 성장률
 */

import {
  TrendingUpIcon,
  TrendingDownIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  PercentIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { formatCurrencyShort, formatNumber } from "~/core/lib/format";
import type { KpiData } from "../lib/business-dashboard.server";

interface KpiCardsProps {
  data: KpiData;
}

// 변화량 계산
function calculateChange(current: number, previous: number): {
  value: number;
  isPositive: boolean;
  display: string;
} {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      isPositive: current > 0,
      display: current > 0 ? "+100%" : "0%",
    };
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  return {
    value: rounded,
    isPositive: rounded >= 0,
    display: `${rounded >= 0 ? "+" : ""}${rounded}%`,
  };
}

export function KpiCards({ data }: KpiCardsProps) {
  const salesChange = calculateChange(data.totalSales, data.prevPeriodSales);
  const ordersChange = calculateChange(data.orderCount, data.prevPeriodOrders);
  const aovChange = calculateChange(data.avgOrderValue, data.prevPeriodAvgOrderValue);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 총 매출 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            총 매출
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <WonIcon className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyShort(data.totalSales)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {salesChange.isPositive ? (
              <TrendingUpIcon className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDownIcon className="h-3 w-3 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${
                salesChange.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {salesChange.display}
            </span>
            <span className="text-xs text-muted-foreground">전기 대비</span>
          </div>
        </CardContent>
      </Card>

      {/* 주문 수 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            주문 수
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <ShoppingCartIcon className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(data.orderCount)}건
          </div>
          <div className="flex items-center gap-1 mt-1">
            {ordersChange.isPositive ? (
              <TrendingUpIcon className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDownIcon className="h-3 w-3 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${
                ordersChange.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {ordersChange.display}
            </span>
            <span className="text-xs text-muted-foreground">전기 대비</span>
          </div>
        </CardContent>
      </Card>

      {/* 평균 객단가 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            평균 객단가
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <ReceiptIcon className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyShort(data.avgOrderValue)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {aovChange.isPositive ? (
              <TrendingUpIcon className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDownIcon className="h-3 w-3 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${
                aovChange.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {aovChange.display}
            </span>
            <span className="text-xs text-muted-foreground">전기 대비</span>
          </div>
        </CardContent>
      </Card>

      {/* 성장률 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            성장률
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
            <PercentIcon className="h-4 w-4 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              data.growthRate >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {data.growthRate >= 0 ? "+" : ""}
            {data.growthRate}%
          </div>
          <div className="flex items-center gap-1 mt-1">
            {data.growthRate >= 0 ? (
              <TrendingUpIcon className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDownIcon className="h-3 w-3 text-red-600" />
            )}
            <span className="text-xs text-muted-foreground">
              매출 기준 전기 대비
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Won 아이콘이 lucide에 없으므로 커스텀 아이콘
function WonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 4h16" />
      <path d="M4 8h16" />
      <path d="M6 4l3 16" />
      <path d="M12 4v16" />
      <path d="M18 4l-3 16" />
    </svg>
  );
}
