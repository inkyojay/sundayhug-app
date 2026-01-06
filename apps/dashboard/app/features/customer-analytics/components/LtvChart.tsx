/**
 * LTV 분포 히스토그램 컴포넌트
 *
 * 고객 생애 가치(LTV) 분포를 바 차트로 시각화합니다.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { formatCurrencyShort } from "~/core/lib/format";
import type { LTVDistribution, LTVSummary } from "../types";

interface LtvChartProps {
  distribution: LTVDistribution[];
  summary: LTVSummary;
}

// 구간별 색상 (낮은 LTV -> 높은 LTV)
const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"];

export function LtvChart({ distribution, summary }: LtvChartProps) {
  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold">{label}</p>
          <div className="mt-2">
            <p>고객 수: <span className="font-medium">{data.count.toLocaleString()}명</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (distribution.length === 0 || distribution.every((d) => d.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LTV 분포</CardTitle>
          <CardDescription>고객 생애 가치 구간별 분포</CardDescription>
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
        <CardTitle>LTV 분포</CardTitle>
        <CardDescription>
          고객 생애 가치 구간별 분포 - 총 LTV: ₩{formatCurrencyShort(summary.totalLTV)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distribution}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="range"
                className="text-xs"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}명`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* LTV 요약 통계 */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">평균 LTV</p>
            <p className="text-lg font-bold text-green-600">₩{formatCurrencyShort(summary.avgLTV)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">중앙값</p>
            <p className="text-lg font-bold">₩{formatCurrencyShort(summary.medianLTV)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">상위 10%</p>
            <p className="text-lg font-bold text-blue-600">₩{formatCurrencyShort(summary.top10PercentLTV)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">하위 50%</p>
            <p className="text-lg font-bold text-orange-600">₩{formatCurrencyShort(summary.bottom50PercentLTV)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
