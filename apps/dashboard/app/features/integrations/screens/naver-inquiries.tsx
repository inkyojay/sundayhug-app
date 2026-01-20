/**
 * 네이버 스마트스토어 문의 관리 페이지
 *
 * 기능:
 * - 문의 목록 조회 (필터: 기간, 상태, 검색)
 * - 문의 상세 보기 (슬라이드 패널)
 * - 답변 등록/수정
 * - 통계 카드
 */
import type { Route } from "./+types/naver-inquiries";

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, MessageSquare, ExternalLink, AlertCircle } from "lucide-react";
import { data, Link, useFetcher, useNavigate, useSearchParams } from "react-router";

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
  InquiryStatsCards,
  InquiryFilters,
  InquiryTable,
  InquiryDetailSheet,
  type InquiryFilterValues,
  type InquiryStatusFilter,
} from "../components/inquiry";
import type { NaverInquiry } from "../lib/naver/naver-types.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "네이버 문의 관리 | Sundayhug Admin" }];
};

// 기간 계산 유틸리티
function getDateRange(rangeType: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const endDate = now.toISOString();

  switch (rangeType) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate };
    }
    case "7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString(), endDate };
    }
    case "30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString(), endDate };
    }
    case "all":
    default:
      return {};
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // URL 파라미터 추출
  const dateRange = url.searchParams.get("dateRange") || "30days";
  const status = (url.searchParams.get("status") || "all") as InquiryStatusFilter;
  const searchQuery = url.searchParams.get("search") || "";

  // 동적 import로 서버 전용 모듈 로드
  const { getNaverToken } = await import("../lib/naver.server");
  const { getInquiries } = await import("../lib/naver/naver-inquiries.server");

  // 토큰 확인
  const token = await getNaverToken();

  if (!token) {
    return data({
      isConnected: false,
      inquiries: [],
      stats: { total: 0, waiting: 0, answered: 0, holding: 0 },
      filters: { dateRange, status, searchQuery },
      error: "네이버 스마트스토어가 연동되지 않았습니다.",
    });
  }

  // 기간 계산
  const { startDate, endDate } = getDateRange(dateRange);

  // 문의 조회
  const result = await getInquiries({
    startDate,
    endDate,
    inquiryStatus: status === "all" ? undefined : status,
  });

  if (!result.success) {
    return data({
      isConnected: true,
      inquiries: [],
      stats: { total: 0, waiting: 0, answered: 0, holding: 0 },
      filters: { dateRange, status, searchQuery },
      error: result.error || "문의 조회 중 오류가 발생했습니다.",
    });
  }

  // 검색 필터링 (클라이언트 사이드에서도 가능하지만 서버에서 처리)
  let filteredInquiries = result.inquiries || [];
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredInquiries = filteredInquiries.filter(
      (inquiry) =>
        String(inquiry.inquiryNo).includes(query) ||
        (inquiry.title?.toLowerCase().includes(query) ?? false) ||
        (inquiry.content?.toLowerCase().includes(query) ?? false)
    );
  }

  // 통계 계산
  const allInquiries = result.inquiries || [];
  const stats = {
    total: allInquiries.length,
    waiting: allInquiries.filter((i) => i.inquiryStatus === "WAITING").length,
    answered: allInquiries.filter((i) => i.inquiryStatus === "ANSWERED").length,
    holding: allInquiries.filter((i) => i.inquiryStatus === "HOLDING").length,
  };

  return data({
    isConnected: true,
    inquiries: filteredInquiries,
    stats,
    filters: { dateRange, status, searchQuery },
    error: null,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    if (actionType === "answer") {
      const inquiryNo = Number(formData.get("inquiryNo"));
      const answerContent = formData.get("answerContent") as string;

      if (!inquiryNo || !answerContent?.trim()) {
        return data({ success: false, error: "필수 정보가 누락되었습니다." });
      }

      const { answerInquiry } = await import("../lib/naver/naver-inquiries.server");
      const result = await answerInquiry({ inquiryNo, answerContent });

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      return data({ success: true, message: "답변이 등록되었습니다." });
    }

    if (actionType === "update_answer") {
      const inquiryNo = Number(formData.get("inquiryNo"));
      const answerContent = formData.get("answerContent") as string;

      if (!inquiryNo || !answerContent?.trim()) {
        return data({ success: false, error: "필수 정보가 누락되었습니다." });
      }

      const { updateInquiryAnswer } = await import("../lib/naver/naver-inquiries.server");
      const result = await updateInquiryAnswer({ inquiryNo, answerContent });

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      return data({ success: true, message: "답변이 수정되었습니다." });
    }

    return data({ success: false, error: "알 수 없는 액션입니다." });
  } catch (error) {
    console.error("❌ 문의 액션 오류:", error);
    return data({
      success: false,
      error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.",
    });
  }
}

export default function NaverInquiries({ loaderData, actionData }: Route.ComponentProps) {
  const { isConnected, inquiries, stats, filters, error } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  // 선택된 문의 (상세 패널용)
  const [selectedInquiry, setSelectedInquiry] = useState<NaverInquiry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 액션 결과 처리
  useEffect(() => {
    if (actionData?.success) {
      // 성공 시 패널 닫고 새로고침
      setIsSheetOpen(false);
      setSelectedInquiry(null);
    }
  }, [actionData]);

  // 필터 변경 핸들러
  const handleFilterChange = useCallback(
    (newFilters: InquiryFilterValues) => {
      const params = new URLSearchParams(searchParams);
      params.set("dateRange", newFilters.dateRange);
      params.set("status", newFilters.status);
      if (newFilters.searchQuery) {
        params.set("search", newFilters.searchQuery);
      } else {
        params.delete("search");
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // 통계 카드 클릭 핸들러
  const handleStatusClick = useCallback(
    (status: InquiryStatusFilter) => {
      const params = new URLSearchParams(searchParams);
      params.set("status", status);
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    navigate(".", { replace: true });
  }, [navigate]);

  // 행 클릭 핸들러
  const handleRowClick = useCallback((inquiry: NaverInquiry) => {
    setSelectedInquiry(inquiry);
    setIsSheetOpen(true);
  }, []);

  // 답변 제출 핸들러
  const handleAnswerSubmit = useCallback(
    (inquiryNo: number, content: string, isUpdate: boolean) => {
      const formData = new FormData();
      formData.set("actionType", isUpdate ? "update_answer" : "answer");
      formData.set("inquiryNo", String(inquiryNo));
      formData.set("answerContent", content);
      fetcher.submit(formData, { method: "POST" });
    },
    [fetcher]
  );

  // 연동 안 됨
  if (!isConnected) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/integrations/naver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">네이버 문의 관리</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>연동 필요</AlertTitle>
          <AlertDescription>
            네이버 스마트스토어가 연동되지 않았습니다.{" "}
            <Link to="/dashboard/integrations/naver" className="underline font-medium">
              연동 페이지
            </Link>
            에서 먼저 연동을 진행해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading = fetcher.state !== "idle";

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
              <MessageSquare className="h-6 w-6 text-green-600" />
              네이버 문의 관리
            </h1>
            <p className="text-muted-foreground">
              고객 문의를 확인하고 답변을 작성합니다
            </p>
          </div>
        </div>

        <Button variant="outline" asChild>
          <a
            href="https://sell.smartstore.naver.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            스마트스토어 센터
          </a>
        </Button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 액션 결과 */}
      {actionData && "message" in actionData && actionData.message && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <AlertTitle className="text-green-700 dark:text-green-400">성공</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            {actionData.message}
          </AlertDescription>
        </Alert>
      )}
      {actionData && "error" in actionData && actionData.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <InquiryStatsCards
        total={stats.total}
        waiting={stats.waiting}
        answered={stats.answered}
        holding={stats.holding}
        onStatusClick={handleStatusClick}
      />

      {/* 메인 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>문의 목록</CardTitle>
          <CardDescription>
            총 {inquiries.length}건의 문의가 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터 */}
          <InquiryFilters
            filters={{
              dateRange: filters.dateRange,
              status: filters.status as InquiryStatusFilter,
              searchQuery: filters.searchQuery,
            }}
            onFilterChange={handleFilterChange}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />

          {/* 테이블 */}
          <InquiryTable
            inquiries={inquiries}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {/* 상세 패널 */}
      <InquiryDetailSheet
        inquiry={selectedInquiry}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onAnswerSubmit={handleAnswerSubmit}
        isSubmitting={fetcher.state === "submitting"}
      />
    </div>
  );
}
