/**
 * 네이버 스마트스토어 정산 조회 페이지
 *
 * 정산 내역을 조회합니다 (읽기 전용)
 */
import type { Route } from "./+types/naver-settlements";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Download,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { data, Link, useSearchParams } from "react-router";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";

import {
  SettlementSummaryCards,
  SettlementFilters,
  SettlementTable,
  SettlementDetailSheet,
  type SettlementStatusFilter,
} from "../components/settlement";

export const meta: Route.MetaFunction = () => {
  return [{ title: `정산 조회 | 네이버 스마트스토어 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const dateRange = url.searchParams.get("dateRange") || "30days";
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";

  // 동적 import로 서버 전용 모듈 로드
  const { getNaverToken } = await import("../lib/naver.server");

  // 토큰 조회
  const token = await getNaverToken();

  if (!token) {
    return data({
      isConnected: false,
      settlements: [],
      summary: {
        totalBaseAmount: 0,
        totalCommission: 0,
        totalSettledAmount: 0,
        totalExpectedAmount: 0,
      },
      error: "네이버 스마트스토어가 연동되지 않았습니다.",
    });
  }

  try {
    const { getSettlements, getExpectedSettlements } = await import(
      "../lib/naver/naver-settlements.server"
    );

    // 날짜 범위 계산
    const now = new Date();
    let fromDate: Date | undefined;

    switch (dateRange) {
      case "7days":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "thisMonth":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastMonth":
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        fromDate = undefined;
    }

    const params: Record<string, any> = {};
    if (fromDate) {
      params.settlementDateFrom = fromDate.toISOString().split("T")[0];
    }
    if (status !== "all") {
      params.settlementStatus = `SETTLEMENT_${status}`;
    }

    // 정산 완료 내역 조회
    const settlementsResult = await getSettlements(params);

    // 정산 예정 내역 조회
    const expectedResult = await getExpectedSettlements({});

    let settlements = settlementsResult.success ? (settlementsResult.settlements || []) : [];
    const expectedSettlements = expectedResult.success ? (expectedResult.settlements || []) : [];

    // 검색 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      settlements = settlements.filter(
        (s: any) =>
          s.productOrderId?.toLowerCase().includes(searchLower) ||
          s.productName?.toLowerCase().includes(searchLower) ||
          s.settlementTargetId?.toLowerCase().includes(searchLower)
      );
    }

    // 요약 통계 계산
    const summary = {
      totalBaseAmount: settlements.reduce((sum: number, s: any) => sum + (s.baseAmount || 0), 0),
      totalCommission: settlements.reduce((sum: number, s: any) => sum + (s.commissionFee || 0), 0),
      totalSettledAmount: settlements
        .filter((s: any) => s.settlementStatus === "SETTLEMENT_DONE")
        .reduce((sum: number, s: any) => sum + (s.settlementAmount || 0), 0),
      totalExpectedAmount: expectedSettlements.reduce(
        (sum: number, s: any) => sum + (s.settlementAmount || 0),
        0
      ),
    };

    return data({
      isConnected: true,
      settlements,
      summary,
      error:
        !settlementsResult.success && settlementsResult.error
          ? settlementsResult.error
          : null,
    });
  } catch (e) {
    return data({
      isConnected: true,
      settlements: [],
      summary: {
        totalBaseAmount: 0,
        totalCommission: 0,
        totalSettledAmount: 0,
        totalExpectedAmount: 0,
      },
      error: e instanceof Error ? e.message : "데이터 로드 중 오류가 발생했습니다.",
    });
  }
}

export default function NaverSettlements({ loaderData }: Route.ComponentProps) {
  const { isConnected, settlements, summary, error } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  // 필터 상태
  const dateRange = searchParams.get("dateRange") || "30days";
  const status = (searchParams.get("status") || "all") as SettlementStatusFilter;
  const searchQuery = searchParams.get("search") || "";

  // UI 상태
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "all" || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  // CSV 내보내기
  const handleExport = () => {
    const headers = [
      "정산대상ID",
      "주문번호",
      "상품명",
      "기준금액",
      "수수료",
      "정산액",
      "정산일",
      "상태",
    ];
    const rows = settlements.map((s: any) => [
      s.settlementTargetId,
      s.productOrderId || "",
      s.productName || "",
      s.baseAmount || 0,
      s.commissionFee || 0,
      s.settlementAmount || 0,
      s.settleDate || "",
      s.settlementStatus || "",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `naver-settlements-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 연동되지 않은 경우
  if (!isConnected) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/integrations/naver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">정산 조회</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>연동 필요</AlertTitle>
          <AlertDescription>
            네이버 스마트스토어가 연동되지 않았습니다.{" "}
            <Link to="/dashboard/integrations/naver" className="underline">
              연동 페이지
            </Link>
            에서 먼저 연동을 진행해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/integrations/naver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-green-500" />
              정산 조회
            </h1>
            <p className="text-muted-foreground">
              네이버 스마트스토어 정산 내역을 조회합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a
              href="https://sell.smartstore.naver.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              스마트스토어
            </a>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 요약 카드 */}
      <SettlementSummaryCards
        totalBaseAmount={summary.totalBaseAmount}
        totalCommission={summary.totalCommission}
        totalSettledAmount={summary.totalSettledAmount}
        totalExpectedAmount={summary.totalExpectedAmount}
      />

      {/* 메인 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>정산 목록</CardTitle>
          <CardDescription>
            정산 내역 {settlements.length}건
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터 */}
          <SettlementFilters
            dateRange={dateRange}
            status={status}
            searchQuery={searchQuery}
            onDateRangeChange={(v) => handleFilterChange("dateRange", v)}
            onStatusChange={(v) => handleFilterChange("status", v)}
            onSearchChange={(v) => handleFilterChange("search", v)}
            onExport={handleExport}
          />

          {/* 테이블 */}
          <SettlementTable
            settlements={settlements}
            onViewDetail={(settlement) => {
              setSelectedSettlement(settlement);
              setDetailOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* 상세 Sheet */}
      <SettlementDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        settlement={selectedSettlement}
      />
    </div>
  );
}
