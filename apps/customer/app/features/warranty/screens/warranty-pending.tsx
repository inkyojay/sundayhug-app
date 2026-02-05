/**
 * 보증서 관리 - 승인 대기 목록 (관리자용)
 */
import type { Route } from "./+types/warranty-pending";

import {
  ClockIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  PhoneIcon,
  PackageIcon,
  TruckIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useRevalidator } from "react-router";

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
import { Textarea } from "~/core/components/ui/textarea";

import makeServerClient from "~/core/lib/supa-client.server";
import { createAdminClient } from "~/core/lib/supa-admin.server";
import { sendWarrantyApprovalAlimtalk, sendWarrantyRejectionAlimtalk } from "~/shared/services/notification";

export const meta: Route.MetaFunction = () => {
  return [{ title: `승인 대기 | 보증서 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  // 승인 대기 보증서 목록
  const { data: pendingList } = await supabase
    .from("warranty_pending_list")
    .select("*")
    .order("created_at", { ascending: true });

  return {
    pendingList: pendingList || [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  // RLS를 우회하기 위해 Admin 클라이언트 사용
  const adminClient = createAdminClient();
  const formData = await request.formData();
  
  const warrantyId = formData.get("warrantyId") as string;
  const actionType = formData.get("action") as string;
  const rejectionReason = formData.get("rejectionReason") as string;

  if (actionType === "approve") {
    // 승인 처리
    const today = new Date();
    const warrantyEnd = new Date(today);
    warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1); // 1년 보증

    const warrantyStartStr = today.toISOString().split("T")[0];
    const warrantyEndStr = warrantyEnd.toISOString().split("T")[0];

    const { data, error } = await adminClient
      .from("warranties")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: "admin",
        warranty_start: warrantyStartStr,
        warranty_end: warrantyEndStr,
      })
      .eq("id", warrantyId)
      .select("*, customers(name)")
      .single();

    if (error) {
      console.error("Approve error:", error);
      return { success: false, error: error.message };
    }

    // 카카오 알림톡 발송
    if (data?.customer_phone) {
      try {
        const alimtalkResult = await sendWarrantyApprovalAlimtalk(
          data.customer_phone,
          {
            customerName: data.buyer_name || data.customers?.name || "고객",
            productName: data.product_name || "제품",
            warrantyNumber: data.warranty_number,
            startDate: warrantyStartStr,
            endDate: warrantyEndStr,
          }
        );

        if (alimtalkResult.success) {
          // 알림톡 발송 성공 기록
          await adminClient
            .from("warranties")
            .update({
              kakao_sent: true,
              kakao_sent_at: new Date().toISOString(),
              kakao_message_id: alimtalkResult.messageId,
            })
            .eq("id", warrantyId);
          
        } else {
          console.error("⚠️ 알림톡 발송 실패 (승인은 완료됨):", alimtalkResult.error);
        }
      } catch (alimtalkError) {
        console.error("⚠️ 알림톡 발송 중 오류 (승인은 완료됨):", alimtalkError);
      }
    }

    return { success: true, message: "보증서가 승인되었습니다." };
  } else if (actionType === "reject") {
    // 거절 처리
    const { data, error } = await adminClient
      .from("warranties")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
      })
      .eq("id", warrantyId)
      .select("*, customers(name)")
      .single();

    if (error) {
      console.error("Reject error:", error);
      return { success: false, error: error.message };
    }

    // 카카오 알림톡 발송 (거절)
    if (data?.customer_phone) {
      try {
        const alimtalkResult = await sendWarrantyRejectionAlimtalk(
          data.customer_phone,
          {
            customerName: data.buyer_name || data.customers?.name || "고객",
            rejectionReason: rejectionReason || "제출하신 정보 확인이 어렵습니다.",
            registerUrl: "https://app-sundayhug-members.vercel.app/customer/warranty",
          }
        );

        if (alimtalkResult.success) {
        } else {
          console.error("⚠️ 알림톡 발송 실패 (거절은 완료됨):", alimtalkResult.error);
        }
      } catch (alimtalkError) {
        console.error("⚠️ 알림톡 발송 중 오류 (거절은 완료됨):", alimtalkError);
      }
    }

    return { success: true, message: "보증서가 거절되었습니다." };
  }

  return { success: false, error: "알 수 없는 액션입니다." };
}

export default function WarrantyPending({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation(["warranty", "common"]);
  const { pendingList } = loaderData;
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // fetcher가 완료되면 데이터 새로고침
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);

  const handleApprove = (warranty: any) => {
    if (confirm(`${warranty.warranty_number} 보증서를 승인하시겠습니까?`)) {
      fetcher.submit(
        { warrantyId: warranty.id, action: "approve" },
        { method: "POST" }
      );
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }
    
    fetcher.submit(
      { 
        warrantyId: selectedWarranty.id, 
        action: "reject",
        rejectionReason: rejectionReason,
      },
      { method: "POST" }
    );
    
    setShowRejectDialog(false);
    setSelectedWarranty(null);
    setRejectionReason("");
  };

  const openRejectDialog = (warranty: any) => {
    setSelectedWarranty(warranty);
    setShowRejectDialog(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClockIcon className="h-6 w-6 text-yellow-500" />
            {t("warranty:admin.pendingApproval.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("warranty:admin.pendingApproval.subtitle", { count: pendingList.length })}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/dashboard/warranty">{t("warranty:admin.pendingApproval.backToList")}</a>
        </Button>
      </div>

      {/* 대기 목록 */}
      {pendingList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckIcon className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">{t("warranty:admin.pendingApproval.allProcessed")}</p>
            <p className="text-muted-foreground">{t("warranty:admin.pendingApproval.noPending")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingList.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              {/* 카드 헤더 - 클릭 시 상세 페이지 이동 */}
              <a href={`/dashboard/warranty/${item.id}`} className="block hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-mono flex items-center gap-2">
                        {item.warranty_number}
                        <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
                      </CardTitle>
                      <CardDescription>
                        {new Date(item.created_at).toLocaleString("ko-KR")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                      {t("warranty:admin.pendingApproval.waiting")}
                    </Badge>
                  </div>
                </CardHeader>
              </a>
              <CardContent className="space-y-4">
                {/* 고객 정보 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t("warranty:admin.pendingApproval.buyer")}:</span>
                    <span className="font-medium">{item.buyer_name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t("warranty:admin.pendingApproval.memberName")}:</span>
                    <span>{item.member_name || item.customer_name || item.kakao_nickname || t("warranty:admin.pendingApproval.unverified")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <PhoneIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono">{item.customer_phone}</span>
                  </div>
                </div>

                {/* 제품 정보 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <PackageIcon className="h-3 w-3 text-muted-foreground" />
                    <span>{item.product_name || t("warranty:admin.pendingApproval.noProductInfo")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TruckIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-xs">{item.tracking_number}</span>
                  </div>
                </div>

                {/* 인증 사진 */}
                {item.product_photo_url ? (
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    <a
                      href={item.product_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={item.product_photo_url}
                        alt={t("warranty:admin.pendingApproval.productAuthPhoto")}
                        className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 bg-muted/30 text-center">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">{t("warranty:admin.pendingApproval.noPhoto")}</p>
                  </div>
                )}

                {/* 상세 보기 버튼 */}
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a href={`/dashboard/warranty/${item.id}`}>
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    {t("warranty:admin.pendingApproval.checkOrderAndApprove")}
                  </a>
                </Button>

                {/* 빠른 액션 버튼 */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(item)}
                    disabled={fetcher.state !== "idle"}
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    {t("warranty:admin.pendingApproval.quickApprove")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openRejectDialog(item)}
                    disabled={fetcher.state !== "idle"}
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    {t("warranty:admin.warrantyDetail.adminActions.reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 거절 사유 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("warranty:admin.warrantyDetail.rejectDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("warranty:admin.warrantyDetail.rejectDialog.description", { warrantyNumber: selectedWarranty?.warranty_number })}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("warranty:admin.warrantyDetail.rejectDialog.placeholder")}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t("common:buttons.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t("warranty:admin.warrantyDetail.adminActions.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

