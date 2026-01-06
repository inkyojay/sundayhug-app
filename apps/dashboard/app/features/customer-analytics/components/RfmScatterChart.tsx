/**
 * RFM 산점도 차트 컴포넌트
 *
 * Frequency vs Monetary 기준으로 고객을 시각화합니다.
 * 색상은 세그먼트를 기반으로 합니다.
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { formatCurrencyShort } from "~/core/lib/format";
import { SEGMENT_INFO, type RFMScore } from "../types";

interface RfmScatterChartProps {
  scores: RFMScore[];
}

interface ScatterDataPoint {
  x: number; // Frequency
  y: number; // Monetary
  z: number; // Recency (for size)
  name: string;
  segment: string;
  color: string;
}

export function RfmScatterChart({ scores }: RfmScatterChartProps) {
  // 데이터 변환 (최대 500개로 제한)
  const scatterData: ScatterDataPoint[] = scores.slice(0, 500).map((score) => ({
    x: score.frequency,
    y: score.monetary,
    z: Math.max(1, 100 - score.recency), // Recency가 낮을수록 크게
    name: score.customerName,
    segment: score.segment,
    color: SEGMENT_INFO[score.segment]?.color || "#6B7280",
  }));

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold">{data.name}</p>
          <p className="text-muted-foreground">{data.segment}</p>
          <div className="mt-2 space-y-1">
            <p>구매 횟수: <span className="font-medium">{data.x}회</span></p>
            <p>총 구매액: <span className="font-medium">₩{formatCurrencyShort(data.y)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (scores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RFM 산점도</CardTitle>
          <CardDescription>Frequency vs Monetary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RFM 산점도</CardTitle>
        <CardDescription>
          Frequency (구매 횟수) vs Monetary (구매 금액) - 색상은 세그먼트를 나타냅니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="x"
                name="구매 횟수"
                unit="회"
                className="text-xs"
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="구매 금액"
                tickFormatter={(value) => `₩${formatCurrencyShort(value)}`}
                className="text-xs"
                tickLine={false}
              />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="고객" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
