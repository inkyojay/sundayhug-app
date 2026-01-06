/**
 * 일별 매출 추이 차트 컴포넌트
 *
 * recharts LineChart를 사용한 일별 매출 시각화
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { formatCurrencyShort } from "~/core/lib/format";
import type { DailySalesData, SalesForecastData } from "../lib/business-dashboard.server";

interface SalesChartProps {
  data: DailySalesData[];
  forecastData?: SalesForecastData[];
  title?: string;
  description?: string;
}

// 날짜 포맷팅 (MM/DD)
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 커스텀 툴팁
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {entry.name === "주문수"
                ? `${entry.value}건`
                : `${formatCurrencyShort(entry.value)}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function SalesChart({
  data,
  forecastData,
  title = "일별 매출 추이",
  description = "기간 내 일별 매출 현황",
}: SalesChartProps) {
  // 차트 데이터 변환
  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    fullDate: item.date,
    매출: item.totalSales,
    주문수: item.orderCount,
  }));

  // 예측 데이터가 있는 경우 병합
  const combinedData = forecastData
    ? [
        ...chartData.map((item) => ({
          ...item,
          실제매출: item.매출,
          예측매출: undefined as number | undefined,
        })),
        ...forecastData
          .filter((item) => item.forecast !== undefined)
          .map((item) => ({
            date: formatDate(item.date),
            fullDate: item.date,
            매출: undefined as number | undefined,
            주문수: undefined as number | undefined,
            실제매출: undefined as number | undefined,
            예측매출: item.forecast,
          })),
      ]
    : chartData;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {forecastData ? (
              <ComposedChart data={combinedData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="실제매출"
                  name="실제 매출"
                  stroke="#3b82f6"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="예측매출"
                  name="예측 매출"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            ) : (
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="매출"
                  name="매출"
                  stroke="#3b82f6"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="주문수"
                  name="주문수"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
