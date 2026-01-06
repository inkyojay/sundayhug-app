/**
 * 고객 세그먼트 분포 컴포넌트
 *
 * 세그먼트별 고객 수와 비율을 파이차트로 표시합니다.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Badge } from "~/core/components/ui/badge";
import { SEGMENT_INFO, type SegmentDistribution, type CustomerSegment } from "../types";

interface CustomerSegmentsProps {
  distribution: SegmentDistribution[];
  totalCustomers: number;
}

interface ChartDataItem {
  segment: string;
  count: number;
  percentage: number;
  color: string;
}

export function CustomerSegments({ distribution, totalCustomers }: CustomerSegmentsProps) {
  // 상위 8개 세그먼트만 표시 (파이차트 가독성)
  const topSegments: ChartDataItem[] = distribution.slice(0, 8).map((d) => ({
    segment: d.segment,
    count: d.count,
    percentage: d.percentage,
    color: d.color,
  }));

  // 나머지는 "기타"로 합침
  const otherCount = distribution.slice(8).reduce((sum, d) => sum + d.count, 0);
  const chartData: ChartDataItem[] = otherCount > 0
    ? [...topSegments, { segment: 'Other', count: otherCount, percentage: Number((otherCount / totalCustomers * 100).toFixed(1)), color: '#D1D5DB' }]
    : topSegments;

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const info = SEGMENT_INFO[data.segment as CustomerSegment];
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm max-w-xs">
          <p className="font-semibold flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            {data.segment}
          </p>
          {info && (
            <p className="text-muted-foreground text-xs mt-1">{info.description}</p>
          )}
          <div className="mt-2">
            <p>고객 수: <span className="font-medium">{data.count.toLocaleString()}명</span></p>
            <p>비율: <span className="font-medium">{data.percentage}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 커스텀 레이블
  const renderCustomLabel = ({ segment, percentage, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
    if (percentage < 5) return null; // 5% 미만은 레이블 표시 안함

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {percentage}%
      </text>
    );
  };

  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>고객 세그먼트 분포</CardTitle>
          <CardDescription>RFM 기반 세그먼트별 고객 분포</CardDescription>
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
        <CardTitle>고객 세그먼트 분포</CardTitle>
        <CardDescription>RFM 기반 세그먼트별 고객 분포 (총 {totalCustomers.toLocaleString()}명)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 파이 차트 */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData as any}
                  dataKey="count"
                  nameKey="segment"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 세그먼트 목록 */}
          <div className="space-y-2 overflow-y-auto max-h-[300px]">
            {distribution.map((item) => {
              const info = SEGMENT_INFO[item.segment];
              return (
                <div
                  key={item.segment}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="font-medium text-sm">{item.segment}</p>
                      {info && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {info.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="secondary" className="font-mono">
                      {item.count.toLocaleString()}명
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.percentage}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
