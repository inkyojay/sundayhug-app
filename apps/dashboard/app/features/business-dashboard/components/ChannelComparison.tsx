/**
 * 채널별 매출 비교 차트 컴포넌트
 *
 * recharts BarChart를 사용한 채널별 매출 시각화
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
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { formatCurrencyShort } from "~/core/lib/format";
import type { ChannelSalesData } from "../lib/business-dashboard.server";

interface ChannelComparisonProps {
  data: ChannelSalesData[];
}

// 채널별 색상
const CHANNEL_COLORS: Record<string, string> = {
  cafe24: "#3b82f6",
  naver: "#22c55e",
  coupang: "#ef4444",
  기타: "#6b7280",
};

// 커스텀 툴팁
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{data.channelLabel}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">매출:</span>
            <span className="font-medium">{formatCurrencyShort(data.totalSales)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">주문수:</span>
            <span className="font-medium">{data.orderCount}건</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">객단가:</span>
            <span className="font-medium">{formatCurrencyShort(data.avgOrderValue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">비중:</span>
            <span className="font-medium">{data.percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// 파이 차트 라벨
function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // 5% 미만은 라벨 생략

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function ChannelComparison({ data }: ChannelComparisonProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>채널별 매출 비교</CardTitle>
          <CardDescription>판매 채널별 매출 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  // 파이 차트용 데이터
  const pieData = data.map((item) => ({
    name: item.channelLabel,
    value: item.totalSales,
    color: CHANNEL_COLORS[item.channel] || CHANNEL_COLORS["기타"],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>채널별 매출 비교</CardTitle>
        <CardDescription>판매 채널별 매출 현황</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* 바 차트 */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <YAxis
                  type="category"
                  dataKey="channelLabel"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="totalSales"
                  name="매출"
                  radius={[0, 4, 4, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHANNEL_COLORS[entry.channel] || CHANNEL_COLORS["기타"]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 파이 차트 */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyShort(Number(value))}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 채널별 상세 정보 */}
        <div className="mt-4 grid gap-2">
          {data.map((channel) => (
            <div
              key={channel.channel}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      CHANNEL_COLORS[channel.channel] || CHANNEL_COLORS["기타"],
                  }}
                />
                <span className="font-medium">{channel.channelLabel}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">매출</div>
                  <div className="font-medium">
                    {formatCurrencyShort(channel.totalSales)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">주문수</div>
                  <div className="font-medium">{channel.orderCount}건</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">비중</div>
                  <div className="font-medium">{channel.percentage}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
