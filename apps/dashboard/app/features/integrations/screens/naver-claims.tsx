/**
 * 네이버 스마트스토어 클레임 관리 페이지
 *
 * 취소/반품/교환 요청을 조회하고 처리합니다.
 */
import type { Route } from "./+types/naver-claims";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { data, Link, useFetcher, useSearchParams } from "react-router";

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
  ClaimStatsCards,
  ClaimFilters,
  ClaimTable,
  ClaimDetailSheet,
  ClaimRejectDialog,
  type ClaimTypeFilter,
  type ClaimStatusFilter,
} from "../components/claim";

export const meta: Route.MetaFunction = () => {
  return [{ title: `클레임 관리 | 네이버 스마트스토어 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const dateRange = url.searchParams.get("dateRange") || "30days";
  const claimType = url.searchParams.get("claimType") || "all";
  const claimStatus = url.searchParams.get("claimStatus") || "all";
  const search = url.searchParams.get("search") || "";

  // 동적 import로 서버 전용 모듈 로드
  const { getNaverToken } = await import("../lib/naver.server");

  // 토큰 조회
  const token = await getNaverToken();

  if (!token) {
    return data({
      isConnected: false,
      claims: [],
      stats: { total: 0, cancel: 0, return: 0, exchange: 0 },
      error: "네이버 스마트스토어가 연동되지 않았습니다.",
    });
  }

  try {
    const { getClaims } = await import("../lib/naver/naver-claims.server");

    // 날짜 범위 계산
    const now = new Date();
    let fromDate: Date | undefined;

    switch (dateRange) {
      case "today":
        fromDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "7days":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = undefined;
    }

    const params: Record<string, any> = {};
    if (fromDate) {
      params.claimRequestDateFrom = fromDate.toISOString();
    }
    if (claimType !== "all") {
      params.claimType = claimType;
    }
    if (claimStatus !== "all") {
      params.claimStatus = claimStatus;
    }

    const result = await getClaims(params);

    if (!result.success) {
      return data({
        isConnected: true,
        claims: [],
        stats: { total: 0, cancel: 0, return: 0, exchange: 0 },
        error: result.error,
      });
    }

    let claims = result.claims || [];

    // 검색 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      claims = claims.filter(
        (c: any) =>
          c.productOrderId?.toLowerCase().includes(searchLower) ||
          c.productName?.toLowerCase().includes(searchLower) ||
          c.buyerName?.toLowerCase().includes(searchLower)
      );
    }

    // 통계 계산
    const stats = {
      total: claims.length,
      cancel: claims.filter((c: any) => c.claimType === "CANCEL").length,
      return: claims.filter((c: any) => c.claimType === "RETURN").length,
      exchange: claims.filter((c: any) => c.claimType === "EXCHANGE").length,
    };

    return data({
      isConnected: true,
      claims,
      stats,
      error: null,
    });
  } catch (e) {
    return data({
      isConnected: true,
      claims: [],
      stats: { total: 0, cancel: 0, return: 0, exchange: 0 },
      error: e instanceof Error ? e.message : "데이터 로드 중 오류가 발생했습니다.",
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const productOrderId = formData.get("productOrderId") as string;
  const reason = formData.get("reason") as string;
  const detailReason = formData.get("detailReason") as string;
  const deliveryCompanyCode = formData.get("deliveryCompanyCode") as string;
  const trackingNumber = formData.get("trackingNumber") as string;

  try {
    const claims = await import("../lib/naver/naver-claims.server");

    let result: { success: boolean; error?: string };

    switch (actionType) {
      case "approve_cancel":
        result = await claims.approveCancelClaim({ productOrderId });
        break;
      case "reject_cancel":
        result = await claims.rejectCancelClaim({
          productOrderId,
          rejectReason: reason,
          rejectDetailedReason: detailReason,
        });
        break;
      case "approve_return":
        result = await claims.approveReturnClaim({ productOrderId });
        break;
      case "reject_return":
        result = await claims.rejectReturnClaim({
          productOrderId,
          rejectReason: reason,
          rejectDetailedReason: detailReason,
        });
        break;
      case "hold_return":
        result = await claims.holdReturnClaim({
          productOrderId,
          holdReason: reason,
          holdDetailedReason: detailReason,
        });
        break;
      case "release_return_hold":
        result = await claims.releaseReturnClaimHold(productOrderId);
        break;
      case "collect_exchange":
        result = await claims.completeExchangeCollect(productOrderId);
        break;
      case "dispatch_exchange":
        result = await claims.dispatchExchange({
          productOrderId,
          deliveryCompanyCode,
          trackingNumber,
        });
        break;
      case "hold_exchange":
        result = await claims.holdExchangeClaim({
          productOrderId,
          holdReason: reason,
          holdDetailedReason: detailReason,
        });
        break;
      case "release_exchange_hold":
        result = await claims.releaseExchangeClaimHold(productOrderId);
        break;
      case "reject_exchange":
        result = await claims.rejectExchangeClaim({
          productOrderId,
          rejectReason: reason,
          rejectDetailedReason: detailReason,
        });
        break;
      default:
        return data({ success: false, error: "알 수 없는 액션" });
    }

    if (!result.success) {
      return data({ success: false, error: result.error });
    }

    return data({ success: true, message: "처리가 완료되었습니다." });
  } catch (e) {
    return data({
      success: false,
      error: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.",
    });
  }
}

export default function NaverClaims({ loaderData, actionData }: Route.ComponentProps) {
  const { isConnected, claims, stats, error } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";

  // 필터 상태
  const dateRange = searchParams.get("dateRange") || "30days";
  const claimType = (searchParams.get("claimType") || "all") as ClaimTypeFilter;
  const claimStatus = (searchParams.get("claimStatus") || "all") as ClaimStatusFilter;
  const searchQuery = searchParams.get("search") || "";

  // UI 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    actionType: "reject" | "hold";
    claimType: string;
    productOrderId: string;
  }>({ open: false, actionType: "reject", claimType: "", productOrderId: "" });

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

  // 액션 핸들러
  const handleAction = (actionType: string, claim: any, extraData?: Record<string, string>) => {
    const formData = new FormData();
    formData.set("actionType", actionType);
    formData.set("productOrderId", claim.productOrderId);
    if (extraData) {
      Object.entries(extraData).forEach(([key, value]) => {
        formData.set(key, value);
      });
    }
    fetcher.submit(formData, { method: "post" });
  };

  const handleApprove = (claim: any) => {
    const actionType =
      claim.claimType === "CANCEL"
        ? "approve_cancel"
        : claim.claimType === "RETURN"
          ? "approve_return"
          : "collect_exchange";
    handleAction(actionType, claim);
  };

  const handleReject = (claim: any) => {
    setRejectDialog({
      open: true,
      actionType: "reject",
      claimType: claim.claimType,
      productOrderId: claim.productOrderId,
    });
    setSelectedClaim(claim);
  };

  const handleHold = (claim: any) => {
    setRejectDialog({
      open: true,
      actionType: "hold",
      claimType: claim.claimType,
      productOrderId: claim.productOrderId,
    });
    setSelectedClaim(claim);
  };

  const handleReleaseHold = (claim: any) => {
    const actionType =
      claim.claimType === "RETURN" ? "release_return_hold" : "release_exchange_hold";
    handleAction(actionType, claim);
  };

  const handleCollectDone = (claim: any) => {
    handleAction("collect_exchange", claim);
  };

  const handleDispatch = (deliveryCompanyCode: string, trackingNumber: string) => {
    if (selectedClaim) {
      handleAction("dispatch_exchange", selectedClaim, {
        deliveryCompanyCode,
        trackingNumber,
      });
      setDetailOpen(false);
    }
  };

  const handleRejectConfirm = (reason: string, detailReason?: string) => {
    if (!selectedClaim) return;

    const claimTypePrefix = selectedClaim.claimType.toLowerCase();
    const actionType =
      rejectDialog.actionType === "reject"
        ? `reject_${claimTypePrefix}`
        : `hold_${claimTypePrefix}`;

    handleAction(actionType, selectedClaim, {
      reason,
      detailReason: detailReason || "",
    });

    setRejectDialog((prev) => ({ ...prev, open: false }));
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
          <h1 className="text-2xl font-bold">클레임 관리</h1>
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
              <ShoppingCart className="h-6 w-6 text-green-500" />
              클레임 관리
            </h1>
            <p className="text-muted-foreground">
              취소/반품/교환 요청을 조회하고 처리합니다
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
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 성공/에러 메시지 */}
      {actionData && "message" in actionData && actionData.message && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-700 dark:text-green-400">성공</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            {actionData.message}
          </AlertDescription>
        </Alert>
      )}

      {(error || (actionData && "error" in actionData && actionData.error)) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>
            {error || (actionData && "error" in actionData ? actionData.error : null)}
          </AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <ClaimStatsCards
        total={stats.total}
        cancelCount={stats.cancel}
        returnCount={stats.return}
        exchangeCount={stats.exchange}
        currentFilter={claimType}
        onFilterChange={(type) => handleFilterChange("claimType", type)}
      />

      {/* 메인 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>클레임 목록</CardTitle>
          <CardDescription>
            클레임 요청 {stats.total}건
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터 */}
          <ClaimFilters
            dateRange={dateRange}
            claimType={claimType}
            claimStatus={claimStatus}
            searchQuery={searchQuery}
            onDateRangeChange={(v) => handleFilterChange("dateRange", v)}
            onClaimTypeChange={(v) => handleFilterChange("claimType", v)}
            onClaimStatusChange={(v) => handleFilterChange("claimStatus", v)}
            onSearchChange={(v) => handleFilterChange("search", v)}
          />

          {/* 테이블 */}
          <ClaimTable
            claims={claims}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onViewDetail={(claim) => {
              setSelectedClaim(claim);
              setDetailOpen(true);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
            onHold={handleHold}
            onReleaseHold={handleReleaseHold}
            onCollectDone={handleCollectDone}
            onDispatch={() => {}}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* 상세 Sheet */}
      <ClaimDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        claim={selectedClaim}
        onApprove={() => selectedClaim && handleApprove(selectedClaim)}
        onReject={() => selectedClaim && handleReject(selectedClaim)}
        onHold={() => selectedClaim && handleHold(selectedClaim)}
        onReleaseHold={() => selectedClaim && handleReleaseHold(selectedClaim)}
        onCollectDone={() => selectedClaim && handleCollectDone(selectedClaim)}
        onDispatch={handleDispatch}
        isLoading={isLoading}
      />

      {/* 거부/보류 다이얼로그 */}
      <ClaimRejectDialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
        actionType={rejectDialog.actionType}
        claimType={rejectDialog.claimType}
        productOrderId={rejectDialog.productOrderId}
        onConfirm={handleRejectConfirm}
        isLoading={isLoading}
      />
    </div>
  );
}
