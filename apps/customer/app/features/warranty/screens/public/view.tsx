/**
 * 보증서 조회 페이지 (고객용 - Public)
 */
import type { Route } from "./+types/view";

import {
  ShieldCheckIcon,
  CalendarIcon,
  PackageIcon,
  PhoneIcon,
  WrenchIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    { title: `${data?.warranty?.warranty_number || "보증서"} | 썬데이허그` },
  ];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { id } = params;

  // 보증서 조회 (warranty_number 또는 id로 검색)
  let query = supabase
    .from("warranties")
    .select(`
      *,
      warranty_products (
        product_name,
        product_image_url
      )
    `);

  // UUID 형식이면 id로 검색, 아니면 warranty_number로 검색
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
  
  if (isUUID) {
    query = query.eq("id", id);
  } else {
    query = query.eq("warranty_number", id);
  }

  const { data: warranty, error } = await query.single();

  if (error || !warranty) {
    throw new Response("보증서를 찾을 수 없습니다.", { status: 404 });
  }

  return { warranty };
}

export default function WarrantyView({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation(["warranty", "common"]);
  const { warranty } = loaderData;

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: t("warranty:public.view.status.pending"), color: "text-yellow-600 bg-yellow-50", icon: ClockIcon },
    approved: { label: t("warranty:public.view.status.approved"), color: "text-green-600 bg-green-50", icon: CheckCircleIcon },
    rejected: { label: t("warranty:public.view.status.rejected"), color: "text-red-600 bg-red-50", icon: XCircleIcon },
    expired: { label: t("warranty:public.view.status.expired"), color: "text-gray-600 bg-gray-50", icon: ClockIcon },
  };

  const StatusIcon = statusConfig[warranty.status]?.icon || ClockIcon;
  const isExpired = warranty.warranty_end && new Date(warranty.warranty_end) < new Date();
  const displayStatus = isExpired && warranty.status === "approved" ? "expired" : warranty.status;

  // 남은 보증 기간 계산
  const daysRemaining = warranty.warranty_end 
    ? Math.ceil((new Date(warranty.warranty_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container max-w-lg mx-auto px-4 py-12">
        {/* 보증서 카드 */}
        <Card className="overflow-hidden border-2 border-amber-200 dark:border-amber-800">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 text-center">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-2" />
            <h1 className="text-xl font-bold">{t("warranty:public.view.digitalWarranty")}</h1>
            <p className="text-amber-100">{t("warranty:public.view.brand")}</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* 상태 배지 */}
            <div className="text-center">
              <Badge 
                className={`${statusConfig[displayStatus]?.color} px-4 py-2 text-base`}
                variant="outline"
              >
                <StatusIcon className="h-4 w-4 mr-2" />
                {statusConfig[displayStatus]?.label}
              </Badge>
            </div>

            {/* 제품 정보 */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {warranty.warranty_products?.product_image_url ? (
                  <img 
                    src={warranty.warranty_products.product_image_url}
                    alt={warranty.product_name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <PackageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="font-bold text-lg">{warranty.product_name}</h2>
                  {warranty.product_option && (
                    <p className="text-muted-foreground">{warranty.product_option}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 보증 기간 */}
            {warranty.status === "approved" && (
              <div className="text-center p-4 border-2 border-dashed rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t("warranty:public.view.warrantyPeriod")}</span>
                </div>
                <p className="text-xl font-bold">
                  {new Date(warranty.warranty_start).toLocaleDateString("ko-KR")}
                  {" ~ "}
                  {new Date(warranty.warranty_end).toLocaleDateString("ko-KR")}
                </p>
                {daysRemaining > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("warranty:public.view.remainingDays", { days: daysRemaining })}
                  </p>
                )}
              </div>
            )}

            {/* 보증서 번호 */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("warranty:public.view.warrantyNumber")}</p>
              <p className="font-mono font-bold text-lg">{warranty.warranty_number}</p>
            </div>

            {/* 구분선 */}
            <div className="border-t border-dashed" />

            {/* 액션 버튼 */}
            {warranty.status === "approved" && !isExpired && (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="flex-col h-auto py-4" asChild>
                  <a href={`/warranty/as/${warranty.id}`}>
                    <WrenchIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">{t("warranty:public.view.actions.requestAS")}</span>
                  </a>
                </Button>
                <Button variant="outline" className="flex-col h-auto py-4" asChild>
                  <a href="https://sundayhug.com/manual" target="_blank">
                    <BookOpenIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">{t("warranty:public.view.actions.manual")}</span>
                  </a>
                </Button>
              </div>
            )}

            {/* 승인 대기 안내 */}
            {warranty.status === "pending" && (
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <ClockIcon className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t("warranty:public.view.pendingNotice.title")}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                  {t("warranty:public.view.pendingNotice.description")}
                </p>
              </div>
            )}

            {/* 거절 안내 */}
            {warranty.status === "rejected" && (
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <XCircleIcon className="h-8 w-8 mx-auto text-red-600 mb-2" />
                <p className="font-medium text-red-800 dark:text-red-200">
                  {t("warranty:public.view.rejectedNotice.title")}
                </p>
                {warranty.rejection_reason && (
                  <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                    {t("warranty:public.view.rejectedNotice.reason", { reason: warranty.rejection_reason })}
                  </p>
                )}
                <Button className="mt-4" asChild>
                  <a href="/warranty">{t("warranty:public.view.rejectedNotice.reRegister")}</a>
                </Button>
              </div>
            )}

            {/* 만료 안내 */}
            {isExpired && warranty.status === "approved" && (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-muted-foreground">
                  {t("warranty:public.view.expiredNotice")}
                </p>
              </div>
            )}
          </CardContent>

          {/* 푸터 */}
          <div className="bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            <p>{t("warranty:public.view.contact", { phone: "1234-5678" })}</p>
            <p className="mt-1">sundayhug.com</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

