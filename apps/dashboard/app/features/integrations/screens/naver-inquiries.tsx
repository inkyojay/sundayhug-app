/**
 * 네이버 스마트스토어 문의 관리 페이지
 *
 * 기능:
 * - 고객 문의 (주문 관련) + 상품 문의 (Q&A) 통합 조회
 * - 유형별 구분은 테이블 컬럼으로 표시
 * - 문의 상세 보기 (슬라이드 패널)
 * - 답변 등록/수정
 * - 답변 템플릿 기능
 * - 네이버 API 동기화 (기간 선택 가능)
 * - 통계 카드
 */
import type { Route } from "./+types/naver-inquiries";

import { useState, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Download,
  CheckCircle2,
} from "lucide-react";
import { data, Link, useFetcher, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

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
  InquiryDetailSheet,
  UnifiedInquiryTable,
  type InquiryFilterValues,
  type InquiryStatusFilter,
  type InquiryTemplate,
} from "../components/inquiry";
import { ProductQnaDetailSheet } from "../components/inquiry/ProductQnaDetailSheet";
import type { NaverInquiry, NaverProductQna } from "../lib/naver/naver-types.server";

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
    case "90days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
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
  const productId = url.searchParams.get("productId") || "";

  // 동적 import로 서버 전용 모듈 로드
  const { getNaverToken } = await import("../lib/naver.server");
  const { getCustomerInquiries, getProductQnas } = await import("../lib/naver/naver-inquiries.server");
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");

  // 토큰 확인
  const token = await getNaverToken();

  if (!token) {
    return data({
      isConnected: false,
      customerInquiries: [],
      productQnas: [],
      totalStats: { total: 0, waiting: 0, answered: 0, holding: 0 },
      productStats: undefined,
      filters: { dateRange, status, searchQuery, productId },
      templates: [],
      error: "네이버 스마트스토어가 연동되지 않았습니다.",
    });
  }

  // 템플릿 조회
  const adminClient = createAdminClient();
  const { data: templates } = await adminClient
    .from("naver_inquiry_templates")
    .select("*")
    .eq("is_active", true)
    .order("use_count", { ascending: false });

  // 기간 계산
  const { startDate, endDate } = getDateRange(dateRange);

  // 고객 문의 조회
  const customerResult = await getCustomerInquiries({
    startDate,
    endDate,
    answered: status === "WAITING" ? false : status === "ANSWERED" ? true : undefined,
  });

  // 상품 문의 조회
  const productQnaResult = await getProductQnas({
    fromDate: startDate,
    toDate: endDate,
    answered: status === "WAITING" ? false : status === "ANSWERED" ? true : undefined,
  });

  // 고객 문의 검색 필터링
  let filteredCustomerInquiries = customerResult.inquiries || [];
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredCustomerInquiries = filteredCustomerInquiries.filter(
      (inquiry) =>
        String(inquiry.inquiryNo).includes(query) ||
        (inquiry.title?.toLowerCase().includes(query) ?? false) ||
        (inquiry.content?.toLowerCase().includes(query) ?? false) ||
        (inquiry.productName?.toLowerCase().includes(query) ?? false)
    );
  }

  // 고객 문의 상품 필터링
  if (productId) {
    filteredCustomerInquiries = filteredCustomerInquiries.filter(
      (inquiry) => String(inquiry.productNo) === productId
    );
  }

  // 상품 문의 검색 필터링
  let filteredProductQnas = productQnaResult.qnas || [];
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredProductQnas = filteredProductQnas.filter(
      (qna) =>
        String(qna.questionId).includes(query) ||
        (qna.question?.toLowerCase().includes(query) ?? false) ||
        (qna.productName?.toLowerCase().includes(query) ?? false)
    );
  }

  // 상품 문의 상품 필터링
  if (productId) {
    filteredProductQnas = filteredProductQnas.filter(
      (qna) => String(qna.productId) === productId
    );
  }

  // 통합 통계 (고객 문의 + 상품 문의)
  const allCustomerInquiries = customerResult.inquiries || [];
  const allProductQnas = productQnaResult.qnas || [];

  const totalStats = {
    total: allCustomerInquiries.length + allProductQnas.length,
    waiting: allCustomerInquiries.filter((i) => !i.answered).length + allProductQnas.filter((q) => !q.answered).length,
    answered: allCustomerInquiries.filter((i) => i.answered).length + allProductQnas.filter((q) => q.answered).length,
    holding: 0,
  };

  // 상품별 통계 (productId가 있는 경우)
  const productStats = productId ? {
    total: filteredCustomerInquiries.length + filteredProductQnas.length,
    waiting: filteredCustomerInquiries.filter((i) => !i.answered).length + filteredProductQnas.filter((q) => !q.answered).length,
    answered: filteredCustomerInquiries.filter((i) => i.answered).length + filteredProductQnas.filter((q) => q.answered).length,
    holding: 0,
  } : undefined;

  return data({
    isConnected: true,
    customerInquiries: filteredCustomerInquiries,
    productQnas: filteredProductQnas,
    totalStats,
    productStats,
    filters: { dateRange, status, searchQuery, productId },
    templates: templates || [],
    error: customerResult.success && productQnaResult.success
      ? null
      : customerResult.error || productQnaResult.error || "문의 조회 중 오류가 발생했습니다.",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    // 고객 문의 답변
    if (actionType === "answer_customer") {
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

      return data({ success: true, message: "답변이 등록되었습니다.", answerContentId: result.answerContentId });
    }

    // 고객 문의 답변 수정
    if (actionType === "update_customer_answer") {
      const inquiryNo = Number(formData.get("inquiryNo"));
      const answerContent = formData.get("answerContent") as string;
      const answerContentId = Number(formData.get("answerContentId"));

      if (!inquiryNo || !answerContent?.trim() || !answerContentId) {
        return data({ success: false, error: "필수 정보가 누락되었습니다." });
      }

      const { updateInquiryAnswer } = await import("../lib/naver/naver-inquiries.server");
      const result = await updateInquiryAnswer({ inquiryNo, answerContent, answerContentId });

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      return data({ success: true, message: "답변이 수정되었습니다." });
    }

    // 상품 문의 답변 (신규 및 수정 모두)
    if (actionType === "answer_product_qna") {
      const questionId = Number(formData.get("questionId"));
      const commentContent = formData.get("commentContent") as string;

      if (!questionId || !commentContent?.trim()) {
        return data({ success: false, error: "필수 정보가 누락되었습니다." });
      }

      const { answerProductQna } = await import("../lib/naver/naver-inquiries.server");
      const result = await answerProductQna({ questionId, commentContent });

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      return data({ success: true, message: "답변이 등록되었습니다." });
    }

    // 통합 동기화 (고객 문의 + 상품 문의 모두)
    if (actionType === "sync_all") {
      const syncDateRange = formData.get("syncDateRange") as string || "30days";
      const { startDate, endDate } = getDateRange(syncDateRange);

      const { getNaverToken } = await import("../lib/naver.server");
      const { getCustomerInquiries, getProductQnas } = await import("../lib/naver/naver-inquiries.server");
      const { createAdminClient } = await import("~/core/lib/supa-admin.server");

      const token = await getNaverToken();
      if (!token) {
        return data({ success: false, error: "네이버 연동이 필요합니다." });
      }

      const adminClient = createAdminClient();
      let customerSyncedCount = 0;
      let productSyncedCount = 0;

      // 고객 문의 동기화 (네이버 API 최대 200건)
      const customerResult = await getCustomerInquiries({
        startDate,
        endDate,
        size: 200,
      });

      if (customerResult.success && customerResult.inquiries) {
        for (const inquiry of customerResult.inquiries) {
          const { error } = await adminClient.from("naver_inquiries").upsert(
            {
              inquiry_no: inquiry.inquiryNo,
              inquiry_type_name: inquiry.category || inquiry.inquiryTypeName,
              inquiry_status: inquiry.answered ? "ANSWERED" : "WAITING",
              title: inquiry.title,
              content: inquiry.inquiryContent || inquiry.content,
              product_no: inquiry.productNo ? Number(inquiry.productNo) : null,
              product_name: inquiry.productName,
              buyer_member_id: inquiry.customerId || inquiry.buyerMemberId,
              create_date: inquiry.inquiryRegistrationDateTime || inquiry.createDate,
              answer_content: inquiry.answerContent,
              answer_date: inquiry.answerRegistrationDateTime || inquiry.answerDate,
              category: inquiry.category,
              inquiry_content: inquiry.inquiryContent,
              inquiry_registration_date_time: inquiry.inquiryRegistrationDateTime,
              answer_content_id: inquiry.answerContentId,
              answer_template_no: inquiry.answerTemplateNo,
              answer_registration_date_time: inquiry.answerRegistrationDateTime,
              answered: inquiry.answered,
              order_id: inquiry.orderId,
              product_order_id_list: inquiry.productOrderIdList,
              product_order_option: inquiry.productOrderOption,
              customer_id: inquiry.customerId,
              customer_name: inquiry.customerName,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "inquiry_no" }
          );
          if (!error) customerSyncedCount++;
        }
      }

      // 상품 문의 동기화 (네이버 API 최대 200건)
      const productResult = await getProductQnas({
        fromDate: startDate,
        toDate: endDate,
        size: 200,
      });

      if (productResult.success && productResult.qnas) {
        for (const qna of productResult.qnas) {
          const { error } = await adminClient.from("naver_product_qnas").upsert(
            {
              question_id: qna.questionId,
              question: qna.question,
              answer: qna.answer,
              answered: qna.answered,
              create_date: qna.createDate,
              answer_date: qna.answerDate,
              product_id: qna.productId,
              product_name: qna.productName,
              masked_writer_id: qna.maskedWriterId,
              channel_no: qna.channelNo,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "question_id" }
          );
          if (!error) productSyncedCount++;
        }
      }

      return data({
        success: true,
        message: `동기화 완료: 고객문의 ${customerSyncedCount}건, 상품문의 ${productSyncedCount}건`,
      });
    }

    // 템플릿 저장
    if (actionType === "save_template") {
      const name = formData.get("name") as string;
      const content = formData.get("content") as string;
      const category = (formData.get("category") as string) || "general";

      if (!name || !content) {
        return data({ success: false, error: "이름과 내용을 입력해주세요." });
      }

      const { createAdminClient } = await import("~/core/lib/supa-admin.server");
      const adminClient = createAdminClient();

      const { error } = await adminClient
        .from("naver_inquiry_templates")
        .insert({ name, content, category });

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 저장되었습니다." });
    }

    // 템플릿 삭제
    if (actionType === "delete_template") {
      const templateId = formData.get("templateId") as string;

      if (!templateId) {
        return data({ success: false, error: "템플릿 ID가 필요합니다." });
      }

      const { createAdminClient } = await import("~/core/lib/supa-admin.server");
      const adminClient = createAdminClient();

      const { error } = await adminClient
        .from("naver_inquiry_templates")
        .delete()
        .eq("id", templateId);

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 삭제되었습니다." });
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
  const {
    isConnected,
    customerInquiries,
    productQnas,
    totalStats,
    productStats,
    filters,
    templates,
    error
  } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const syncFetcher = useFetcher();

  // 선택된 문의 (상세 패널용)
  const [selectedInquiry, setSelectedInquiry] = useState<NaverInquiry | null>(null);
  const [selectedProductQna, setSelectedProductQna] = useState<NaverProductQna | null>(null);
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [isProductQnaSheetOpen, setIsProductQnaSheetOpen] = useState(false);

  // 액션 결과 처리
  useEffect(() => {
    if (actionData) {
      if ("success" in actionData && actionData.success) {
        // 성공 시 toast 알림
        if ("message" in actionData && actionData.message) {
          toast.success(actionData.message);
        }
        setIsCustomerSheetOpen(false);
        setIsProductQnaSheetOpen(false);
        setSelectedInquiry(null);
        setSelectedProductQna(null);
      } else if ("error" in actionData && actionData.error) {
        // 실패 시 toast 알림
        toast.error(actionData.error);
      }
    }
  }, [actionData]);

  // 동기화 결과 처리
  useEffect(() => {
    if (syncFetcher.data) {
      if ("success" in syncFetcher.data && syncFetcher.data.success) {
        if ("message" in syncFetcher.data && syncFetcher.data.message) {
          toast.success(syncFetcher.data.message);
        }
      } else if ("error" in syncFetcher.data && syncFetcher.data.error) {
        toast.error(syncFetcher.data.error);
      }
    }
  }, [syncFetcher.data]);

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

  // 통합 동기화 핸들러
  const handleSyncAll = useCallback(() => {
    const formData = new FormData();
    formData.set("actionType", "sync_all");
    formData.set("syncDateRange", filters.dateRange);
    syncFetcher.submit(formData, { method: "POST" });
  }, [syncFetcher, filters.dateRange]);

  // 고객 문의 행 클릭 핸들러
  const handleCustomerRowClick = useCallback((inquiry: NaverInquiry) => {
    setSelectedInquiry(inquiry);
    setIsCustomerSheetOpen(true);
  }, []);

  // 상품 문의 행 클릭 핸들러
  const handleProductQnaRowClick = useCallback((qna: NaverProductQna) => {
    setSelectedProductQna(qna);
    setIsProductQnaSheetOpen(true);
  }, []);

  // 고객 문의 답변 제출 핸들러
  const handleCustomerAnswerSubmit = useCallback(
    (inquiryNo: number, content: string, isUpdate: boolean, answerContentId?: number) => {
      const formData = new FormData();
      formData.set("actionType", isUpdate ? "update_customer_answer" : "answer_customer");
      formData.set("inquiryNo", String(inquiryNo));
      formData.set("answerContent", content);
      if (isUpdate && answerContentId) {
        formData.set("answerContentId", String(answerContentId));
      }
      fetcher.submit(formData, { method: "POST" });
    },
    [fetcher]
  );

  // 상품 문의 답변 제출 핸들러
  const handleProductQnaAnswerSubmit = useCallback(
    (questionId: number, content: string) => {
      const formData = new FormData();
      formData.set("actionType", "answer_product_qna");
      formData.set("questionId", String(questionId));
      formData.set("commentContent", content);
      fetcher.submit(formData, { method: "POST" });
    },
    [fetcher]
  );

  // 템플릿 저장 핸들러
  const handleSaveTemplate = useCallback(
    (name: string, content: string, category: string) => {
      const formData = new FormData();
      formData.set("actionType", "save_template");
      formData.set("name", name);
      formData.set("content", content);
      formData.set("category", category);
      fetcher.submit(formData, { method: "POST" });
    },
    [fetcher]
  );

  // 템플릿 삭제 핸들러
  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      const formData = new FormData();
      formData.set("actionType", "delete_template");
      formData.set("templateId", templateId);
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
  const isSyncing = syncFetcher.state !== "idle";
  const totalCount = customerInquiries.length + productQnas.length;

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
              <MessageSquare className="h-6 w-6 text-blue-500" />
              네이버 문의 관리
            </h1>
            <p className="text-muted-foreground">
              고객 문의와 상품 문의를 확인하고 답변을 작성합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
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

      {/* 액션 결과 */}
      {actionData && "message" in actionData && actionData.message && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
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

      {/* 동기화 결과 */}
      {syncFetcher.data && "message" in syncFetcher.data && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Download className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700 dark:text-blue-400">동기화 완료</AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-300">
            {syncFetcher.data.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <InquiryStatsCards
        total={filters.productId && productStats ? productStats.total : totalStats.total}
        waiting={filters.productId && productStats ? productStats.waiting : totalStats.waiting}
        answered={filters.productId && productStats ? productStats.answered : totalStats.answered}
        holding={filters.productId && productStats ? productStats.holding : totalStats.holding}
        onStatusClick={handleStatusClick}
      />

      {/* 메인 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>문의 목록</CardTitle>
              <CardDescription>
                총 {totalCount}건
                {totalStats.waiting > 0 && (
                  <span className="ml-2 text-orange-500 font-medium">
                    (미답변 {totalStats.waiting}건)
                  </span>
                )}
                <span className="ml-2 text-muted-foreground">
                  | 고객문의 {customerInquiries.length}건, 상품문의 {productQnas.length}건
                </span>
              </CardDescription>
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={isSyncing}
            >
              <Download className={`h-4 w-4 mr-2 ${isSyncing ? "animate-pulse" : ""}`} />
              {isSyncing ? "동기화 중..." : "네이버 동기화"}
            </Button>
          </div>
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

          {/* 통합 테이블 */}
          <UnifiedInquiryTable
            customerInquiries={customerInquiries}
            productQnas={productQnas}
            isLoading={isLoading}
            onCustomerRowClick={handleCustomerRowClick}
            onProductQnaRowClick={handleProductQnaRowClick}
          />
        </CardContent>
      </Card>

      {/* 고객 문의 상세 패널 */}
      <InquiryDetailSheet
        inquiry={selectedInquiry}
        open={isCustomerSheetOpen}
        onOpenChange={setIsCustomerSheetOpen}
        onAnswerSubmit={(inquiryNo, content, isUpdate) =>
          handleCustomerAnswerSubmit(inquiryNo, content, isUpdate, selectedInquiry?.answerContentId)
        }
        isSubmitting={fetcher.state === "submitting"}
        templates={templates as InquiryTemplate[]}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* 상품 문의 상세 패널 */}
      <ProductQnaDetailSheet
        qna={selectedProductQna}
        open={isProductQnaSheetOpen}
        onOpenChange={setIsProductQnaSheetOpen}
        onAnswerSubmit={handleProductQnaAnswerSubmit}
        isSubmitting={fetcher.state === "submitting"}
        templates={templates as InquiryTemplate[]}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />
    </div>
  );
}
