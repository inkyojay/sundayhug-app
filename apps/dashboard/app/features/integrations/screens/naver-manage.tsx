/**
 * 네이버 스마트스토어 통합 관리 페이지
 *
 * 클레임/정산/문의/상품/주문변경 탭이 있는 통합 관리 페이지
 */
import type { Route } from "./+types/naver-manage";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { data, Link, useFetcher } from "react-router";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";
import { Textarea } from "~/core/components/ui/textarea";

export const meta: Route.MetaFunction = () => {
  return [{ title: `네이버 통합 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "claims";

  // 동적 import로 서버 전용 모듈 로드
  const { getNaverToken } = await import("../lib/naver.server");

  // 토큰 조회
  const token = await getNaverToken();

  if (!token) {
    return data({
      isConnected: false,
      tab,
      claims: [],
      settlements: [],
      inquiries: [],
      changedOrders: [],
      error: "네이버 스마트스토어가 연동되지 않았습니다.",
    });
  }

  // 탭에 따라 데이터 로드
  let claims: any[] = [];
  let settlements: any[] = [];
  let inquiries: any[] = [];
  let changedOrders: any[] = [];
  let error: string | null = null;

  try {
    if (tab === "claims") {
      const { getClaims } = await import("../lib/naver/naver-claims.server");
      const result = await getClaims({});
      if (result.success) {
        claims = result.claims || [];
      } else {
        error = result.error || null;
      }
    } else if (tab === "settlements") {
      const { getSettlements } = await import("../lib/naver/naver-settlements.server");
      const result = await getSettlements({});
      if (result.success) {
        settlements = result.settlements || [];
      } else {
        error = result.error || null;
      }
    } else if (tab === "inquiries") {
      const { getInquiries } = await import("../lib/naver/naver-inquiries.server");
      const result = await getInquiries({});
      if (result.success) {
        inquiries = result.inquiries || [];
      } else {
        error = result.error || null;
      }
    } else if (tab === "orders") {
      const { getLastChangedOrders } = await import("../lib/naver/naver-orders.server");
      const result = await getLastChangedOrders({});
      if (result.success) {
        changedOrders = result.orders || [];
      } else {
        error = result.error || null;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "데이터 로드 중 오류가 발생했습니다.";
  }

  return data({
    isConnected: true,
    tab,
    claims,
    settlements,
    inquiries,
    changedOrders,
    error,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    // 클레임 처리
    if (actionType?.startsWith("claim_")) {
      const claimAction = actionType.replace("claim_", "");
      const productOrderId = formData.get("productOrderId") as string;
      const reason = formData.get("reason") as string;

      const claims = await import("../lib/naver/naver-claims.server");

      let result: { success: boolean; error?: string };

      switch (claimAction) {
        case "approve_cancel":
          result = await claims.approveCancelClaim({ productOrderId });
          break;
        case "reject_cancel":
          result = await claims.rejectCancelClaim({ productOrderId, rejectReason: reason });
          break;
        case "approve_return":
          result = await claims.approveReturnClaim({ productOrderId });
          break;
        case "reject_return":
          result = await claims.rejectReturnClaim({ productOrderId, rejectReason: reason });
          break;
        case "hold_return":
          result = await claims.holdReturnClaim({ productOrderId, holdReason: reason });
          break;
        case "release_return_hold":
          result = await claims.releaseReturnClaimHold(productOrderId);
          break;
        case "collect_exchange":
          result = await claims.completeExchangeCollect(productOrderId);
          break;
        case "reject_exchange":
          result = await claims.rejectExchangeClaim({ productOrderId, rejectReason: reason });
          break;
        default:
          return data({ success: false, error: "알 수 없는 클레임 액션" });
      }

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      return data({ success: true, message: `${claimAction} 처리가 완료되었습니다.` });
    }

    // 문의 답변
    if (actionType === "answer_inquiry") {
      const inquiryNo = formData.get("inquiryNo") as string;
      const answerContent = formData.get("answerContent") as string;

      const { answerInquiry } = await import("../lib/naver/naver-inquiries.server");
      const result = await answerInquiry({
        inquiryNo: Number(inquiryNo),
        answerContent,
      });

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      return data({ success: true, message: "답변이 등록되었습니다." });
    }

    return data({ success: false, error: "알 수 없는 액션" });
  } catch (e) {
    return data({
      success: false,
      error: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.",
    });
  }
}

// 클레임 상태 배지
function ClaimStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    CANCEL_REQUEST: { label: "취소요청", variant: "destructive" },
    CANCEL_DONE: { label: "취소완료", variant: "secondary" },
    RETURN_REQUEST: { label: "반품요청", variant: "destructive" },
    RETURN_DONE: { label: "반품완료", variant: "secondary" },
    EXCHANGE_REQUEST: { label: "교환요청", variant: "destructive" },
    EXCHANGE_DONE: { label: "교환완료", variant: "secondary" },
    COLLECT_DONE: { label: "수거완료", variant: "outline" },
    HOLDING: { label: "보류중", variant: "outline" },
  };

  const config = statusMap[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// 정산 상태 배지
function SettlementStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    SETTLEMENT_IN_PROGRESS: { label: "정산중", variant: "outline" },
    SETTLEMENT_DONE: { label: "정산완료", variant: "default" },
    SETTLEMENT_HOLD: { label: "정산보류", variant: "destructive" },
  };

  const config = statusMap[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// 문의 상태 배지
function InquiryStatusBadge({ answered }: { answered: boolean }) {
  return answered ? (
    <Badge variant="default">답변완료</Badge>
  ) : (
    <Badge variant="destructive">미답변</Badge>
  );
}

export default function NaverManage({ loaderData, actionData }: Route.ComponentProps) {
  const { isConnected, tab, claims, settlements, inquiries, changedOrders, error } = loaderData;
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  // 다이얼로그 상태
  const [claimDialog, setClaimDialog] = useState<{
    open: boolean;
    action: string;
    productOrderId: string;
    needsReason: boolean;
  }>({ open: false, action: "", productOrderId: "", needsReason: false });

  const [inquiryDialog, setInquiryDialog] = useState<{
    open: boolean;
    inquiryNo: number;
    title: string;
    content: string;
  }>({ open: false, inquiryNo: 0, title: "", content: "" });

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
          <h1 className="text-2xl font-bold">네이버 통합 관리</h1>
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
              네이버 통합 관리
            </h1>
            <p className="text-muted-foreground">
              클레임, 정산, 문의, 주문변경 내역을 관리합니다
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={isSubmitting}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSubmitting ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* 성공/에러 메시지 */}
      {actionData?.message && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-700 dark:text-green-400">성공</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            {actionData.message}
          </AlertDescription>
        </Alert>
      )}

      {(error || actionData?.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error || actionData?.error}</AlertDescription>
        </Alert>
      )}

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="claims" asChild>
            <Link to="?tab=claims" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">클레임</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="settlements" asChild>
            <Link to="?tab=settlements" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">정산</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="inquiries" asChild>
            <Link to="?tab=inquiries" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">문의</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="products" asChild>
            <Link to="?tab=products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">상품</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="orders" asChild>
            <Link to="?tab=orders" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">주문변경</span>
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* 클레임 탭 */}
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>클레임 관리</CardTitle>
              <CardDescription>
                취소/반품/교환 요청을 승인하거나 거부합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>처리할 클레임이 없습니다</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>클레임유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>요청일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim: any) => (
                      <TableRow key={claim.productOrderId}>
                        <TableCell className="font-medium">
                          {claim.productOrderId}
                        </TableCell>
                        <TableCell>{claim.productName || "-"}</TableCell>
                        <TableCell>{claim.claimType}</TableCell>
                        <TableCell>
                          <ClaimStatusBadge status={claim.claimStatus} />
                        </TableCell>
                        <TableCell>
                          {claim.claimRequestDate
                            ? new Date(claim.claimRequestDate).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {claim.claimStatus === "CANCEL_REQUEST" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "approve_cancel",
                                      productOrderId: claim.productOrderId,
                                      needsReason: false,
                                    })
                                  }
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "reject_cancel",
                                      productOrderId: claim.productOrderId,
                                      needsReason: true,
                                    })
                                  }
                                >
                                  거부
                                </Button>
                              </>
                            )}
                            {claim.claimStatus === "RETURN_REQUEST" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "approve_return",
                                      productOrderId: claim.productOrderId,
                                      needsReason: false,
                                    })
                                  }
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "hold_return",
                                      productOrderId: claim.productOrderId,
                                      needsReason: true,
                                    })
                                  }
                                >
                                  보류
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "reject_return",
                                      productOrderId: claim.productOrderId,
                                      needsReason: true,
                                    })
                                  }
                                >
                                  거부
                                </Button>
                              </>
                            )}
                            {claim.claimStatus === "EXCHANGE_REQUEST" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "collect_exchange",
                                      productOrderId: claim.productOrderId,
                                      needsReason: false,
                                    })
                                  }
                                >
                                  수거완료
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setClaimDialog({
                                      open: true,
                                      action: "reject_exchange",
                                      productOrderId: claim.productOrderId,
                                      needsReason: true,
                                    })
                                  }
                                >
                                  거부
                                </Button>
                              </>
                            )}
                            {claim.claimStatus === "HOLDING" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setClaimDialog({
                                    open: true,
                                    action: "release_return_hold",
                                    productOrderId: claim.productOrderId,
                                    needsReason: false,
                                  })
                                }
                              >
                                보류해제
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정산 탭 */}
        <TabsContent value="settlements">
          <Card>
            <CardHeader>
              <CardTitle>정산 내역</CardTitle>
              <CardDescription>정산 내역을 조회합니다</CardDescription>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>정산 내역이 없습니다</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>정산ID</TableHead>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">정산금액</TableHead>
                      <TableHead className="text-right">수수료</TableHead>
                      <TableHead>정산일</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((settlement: any) => (
                      <TableRow key={settlement.settlementTargetId}>
                        <TableCell className="font-medium">
                          {settlement.settlementTargetId}
                        </TableCell>
                        <TableCell>{settlement.productOrderId || "-"}</TableCell>
                        <TableCell>{settlement.productName || "-"}</TableCell>
                        <TableCell className="text-right">
                          {settlement.settlementAmount?.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right">
                          {settlement.commissionFee?.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          {settlement.settleDate
                            ? new Date(settlement.settleDate).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <SettlementStatusBadge status={settlement.settlementStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 문의 탭 */}
        <TabsContent value="inquiries">
          <Card>
            <CardHeader>
              <CardTitle>고객 문의</CardTitle>
              <CardDescription>고객 문의에 답변합니다</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>문의 내역이 없습니다</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>문의번호</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>문의일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inquiries.map((inquiry: any) => (
                      <TableRow key={inquiry.inquiryNo}>
                        <TableCell className="font-medium">
                          {inquiry.inquiryNo}
                        </TableCell>
                        <TableCell>{inquiry.inquiryTypeName || inquiry.inquiryType}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {inquiry.title || inquiry.content?.slice(0, 30)}
                        </TableCell>
                        <TableCell>
                          {inquiry.createDate
                            ? new Date(inquiry.createDate).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <InquiryStatusBadge answered={inquiry.answered} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={inquiry.answered ? "outline" : "default"}
                            onClick={() =>
                              setInquiryDialog({
                                open: true,
                                inquiryNo: inquiry.inquiryNo,
                                title: inquiry.title || "",
                                content: inquiry.content || "",
                              })
                            }
                          >
                            {inquiry.answered ? "보기" : "답변"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상품 탭 */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>상품 관리</CardTitle>
              <CardDescription>
                네이버 스마트스토어 상품을 등록/수정/삭제합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">상품 관리 기능은 준비 중입니다</p>
                <p className="text-sm">
                  API는 구현되어 있으며, UI는 추후 업데이트될 예정입니다.
                </p>
                <div className="mt-4 text-xs text-left max-w-md mx-auto bg-muted p-4 rounded-md">
                  <p className="font-medium mb-2">지원 API:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>상품 등록 (POST /api/integrations/naver/products/manage)</li>
                    <li>상품 수정</li>
                    <li>상품 삭제</li>
                    <li>재고 수정</li>
                    <li>옵션 재고/가격 수정</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 주문변경 탭 */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>주문 변경 내역</CardTitle>
              <CardDescription>
                최근 24시간 내 변경된 주문 내역을 조회합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>변경된 주문이 없습니다</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상품주문번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>변경유형</TableHead>
                      <TableHead>변경일시</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changedOrders.map((order: any, index: number) => (
                      <TableRow key={order.productOrderId || index}>
                        <TableCell className="font-medium">
                          {order.orderId}
                        </TableCell>
                        <TableCell>{order.productOrderId}</TableCell>
                        <TableCell>{order.productName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.lastChangedType || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          {order.lastChangedDate
                            ? new Date(order.lastChangedDate).toLocaleString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge>{order.productOrderStatus || "-"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 클레임 처리 다이얼로그 */}
      <Dialog open={claimDialog.open} onOpenChange={(open) => setClaimDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <fetcher.Form method="post">
            <DialogHeader>
              <DialogTitle>
                {claimDialog.action === "approve_cancel" && "취소 승인"}
                {claimDialog.action === "reject_cancel" && "취소 거부"}
                {claimDialog.action === "approve_return" && "반품 승인"}
                {claimDialog.action === "reject_return" && "반품 거부"}
                {claimDialog.action === "hold_return" && "반품 보류"}
                {claimDialog.action === "release_return_hold" && "보류 해제"}
                {claimDialog.action === "collect_exchange" && "교환 수거완료"}
                {claimDialog.action === "reject_exchange" && "교환 거부"}
              </DialogTitle>
              <DialogDescription>
                주문번호: {claimDialog.productOrderId}
              </DialogDescription>
            </DialogHeader>

            <input type="hidden" name="actionType" value={`claim_${claimDialog.action}`} />
            <input type="hidden" name="productOrderId" value={claimDialog.productOrderId} />

            {claimDialog.needsReason && (
              <div className="py-4">
                <Label htmlFor="reason">사유</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="처리 사유를 입력하세요"
                  required
                  className="mt-2"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setClaimDialog((prev) => ({ ...prev, open: false }))}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                확인
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>

      {/* 문의 답변 다이얼로그 */}
      <Dialog open={inquiryDialog.open} onOpenChange={(open) => setInquiryDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl">
          <fetcher.Form method="post">
            <DialogHeader>
              <DialogTitle>문의 답변</DialogTitle>
              <DialogDescription>문의번호: {inquiryDialog.inquiryNo}</DialogDescription>
            </DialogHeader>

            <input type="hidden" name="actionType" value="answer_inquiry" />
            <input type="hidden" name="inquiryNo" value={inquiryDialog.inquiryNo} />

            <div className="py-4 space-y-4">
              <div>
                <Label>문의 내용</Label>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  {inquiryDialog.title && <p className="font-medium mb-2">{inquiryDialog.title}</p>}
                  <p>{inquiryDialog.content || "내용 없음"}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="answerContent">답변 내용</Label>
                <Textarea
                  id="answerContent"
                  name="answerContent"
                  placeholder="답변 내용을 입력하세요"
                  required
                  rows={5}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInquiryDialog((prev) => ({ ...prev, open: false }))}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                답변 등록
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
