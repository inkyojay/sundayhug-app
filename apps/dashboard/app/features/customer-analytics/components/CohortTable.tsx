/**
 * 코호트 리텐션 테이블 컴포넌트
 *
 * 첫 구매월 기준 코호트별 리텐션율을 히트맵 스타일로 표시합니다.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import type { CohortRow } from "../types";

interface CohortTableProps {
  cohortData: CohortRow[];
}

/**
 * 리텐션율에 따른 배경색 계산
 * 높은 리텐션 = 진한 녹색, 낮은 리텐션 = 연한 색
 */
function getRetentionColor(rate: number): string {
  if (rate === 100) return "bg-emerald-600 text-white";
  if (rate >= 80) return "bg-emerald-500 text-white";
  if (rate >= 60) return "bg-emerald-400 text-white";
  if (rate >= 40) return "bg-emerald-300 text-emerald-900";
  if (rate >= 20) return "bg-emerald-200 text-emerald-900";
  if (rate >= 10) return "bg-emerald-100 text-emerald-800";
  if (rate > 0) return "bg-emerald-50 text-emerald-700";
  return "bg-muted text-muted-foreground";
}

export function CohortTable({ cohortData }: CohortTableProps) {
  if (cohortData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>코호트 리텐션 분석</CardTitle>
          <CardDescription>첫 구매월 기준 월별 재구매율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  // 최대 표시할 월 수 계산 (최대 12개월)
  const maxMonths = Math.min(
    12,
    Math.max(...cohortData.map((row) => Math.max(...Object.keys(row.retentionByMonth).map(Number), 0)))
  );

  // 월 헤더 생성
  const monthHeaders = Array.from({ length: maxMonths + 1 }, (_, i) => `M+${i}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>코호트 리텐션 분석</CardTitle>
        <CardDescription>
          첫 구매월 기준 월별 재구매율 - 진한 색상일수록 높은 리텐션
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px] font-semibold">코호트</TableHead>
                <TableHead className="text-right w-[80px]">고객수</TableHead>
                {monthHeaders.map((header) => (
                  <TableHead key={header} className="text-center w-[70px]">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortData.map((row) => (
                <TableRow key={row.cohortMonth}>
                  <TableCell className="font-medium">{row.cohortMonth}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.totalCustomers.toLocaleString()}
                  </TableCell>
                  {monthHeaders.map((_, monthIndex) => {
                    const rate = row.retentionByMonth[monthIndex];
                    const hasData = rate !== undefined;

                    return (
                      <TableCell
                        key={monthIndex}
                        className={`text-center text-sm font-medium transition-colors ${
                          hasData ? getRetentionColor(rate) : "bg-muted/30"
                        }`}
                      >
                        {hasData ? `${rate}%` : "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 범례 */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-2">리텐션율:</span>
            <div className="flex items-center gap-1">
              <span className="w-6 h-4 rounded bg-emerald-50"></span>
              <span className="text-xs">0-10%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-4 rounded bg-emerald-200"></span>
              <span className="text-xs">20-40%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-4 rounded bg-emerald-400"></span>
              <span className="text-xs">40-60%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-4 rounded bg-emerald-600"></span>
              <span className="text-xs">80-100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
