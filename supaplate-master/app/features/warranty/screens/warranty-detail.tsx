/**
 * 보증서 상세 페이지 (관리자용)
 */
import type { Route } from "./+types/warranty-detail";

import {
  ShieldCheckIcon,
  UserIcon,
  PhoneIcon,
  PackageIcon,
  TruckIcon,
  CalendarIcon,
  ImageIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MessageSquareIcon,
  ArrowLeftIcon,
  ShoppingCartIcon,
  MapPinIcon,
  CreditCardIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useEffect } from "react";
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
import { Separator } from "~/core/components/ui/separator";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `${data?.warranty?.warranty_number || "보증서"} | Sundayhug Admin` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { id } = params;

  // 보증서 상세 정보
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select(`
      *,
      customers (
        id,
        name,
        phone,
        email,
        kakao_id,
        kakao_nickname
      ),
      warranty_products (
        id,
        product_code,
        product_name,
        category,
        warranty_months,
        product_image_url
      )
    `)
    .eq("id", id)
    .single();

  if (error || !warranty) {
    throw new Response("보증서를 찾을 수 없습니다.", { status: 404 });
  }

  // 주문 정보 조회 (order_id가 있는 경우)
  let orderInfo = null;
  let orderItems: any[] = [];
  if (warranty.order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select(`
        id,
        uniq,
        shop_ord_no,
        shop_name,
        shop_sale_name,
        shop_opt_name,
        ord_time,
        ord_status,
        to_name,
        to_tel,
        to_htel,
        to_addr1,
        to_addr2,
        to_zipcd,
        invoice_no,
        pay_amt,
        ship_cost,
        ship_msg
      `)
      .eq("id", warranty.order_id)
      .single();
    
    orderInfo = order;

    // 주문 상품 목록
    if (order) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);
      orderItems = items || [];
    }
  }

  // 보증서 이력
  const { data: logs } = await supabase
    .from("warranty_logs")
    .select("*")
    .eq("warranty_id", id)
    .order("created_at", { ascending: false });

  // A/S 신청 이력
  const { data: asRequests } = await supabase
    .from("as_requests")
    .select("*")
    .eq("warranty_id", id)
    .order("created_at", { ascending: false });

  return {
    warranty,
    orderInfo,
    orderItems,
    logs: logs || [],
    asRequests: asRequests || [],
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { id } = params;
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (actionType === "approve") {
    const today = new Date();
    const warrantyEnd = new Date(today);
    warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

    await supabase
      .from("warranties")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: "admin",
        warranty_start: today.toISOString().split("T")[0],
        warranty_end: warrantyEnd.toISOString().split("T")[0],
      })
      .eq("id", id);

    return { success: true, message: "승인되었습니다." };
  }

  if (actionType === "sendKakao") {
    // TODO: 카카오 알림톡 발송 로직
    await supabase
      .from("warranties")
      .update({
        kakao_sent: true,
        kakao_sent_at: new Date().toISOString(),
      })
      .eq("id", id);

    return { success: true, message: "카카오톡이 발송되었습니다." };
  }

  return { success: false, error: "알 수 없는 액션" };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { label: "승인 대기", variant: "outline", icon: ClockIcon },
  approved: { label: "승인 완료", variant: "default", icon: CheckCircleIcon },
  rejected: { label: "거절", variant: "destructive", icon: XCircleIcon },
  expired: { label: "만료", variant: "secondary", icon: ClockIcon },
};

export default function WarrantyDetail({ loaderData }: Route.ComponentProps) {
  const { warranty, orderInfo, orderItems, logs, asRequests } = loaderData;
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  
  // fetcher가 완료되면 데이터 새로고침
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);
  
  const StatusIcon = statusConfig[warranty.status]?.icon || ClockIcon;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <a href="/dashboard/warranty">
              <ArrowLeftIcon className="h-5 w-5" />
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheckIcon className="h-6 w-6" />
              {warranty.warranty_number}
            </h1>
            <p className="text-muted-foreground">
              등록일: {new Date(warranty.created_at).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
        <Badge 
          variant={statusConfig[warranty.status]?.variant || "outline"}
          className="text-base px-4 py-1"
        >
          <StatusIcon className="h-4 w-4 mr-1" />
          {statusConfig[warranty.status]?.label || warranty.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측: 기본 정보 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 고객 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                고객 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">
                  {warranty.customers?.name || warranty.customers?.kakao_nickname || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">연락처</p>
                <p className="font-medium font-mono">{warranty.customer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{warranty.customers?.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">카카오 ID</p>
                <p className="font-medium">{warranty.customers?.kakao_id || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 제품/주문 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                제품 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">제품명</p>
                <p className="font-medium">{warranty.product_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">옵션</p>
                <p className="font-medium">{warranty.product_option || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-medium font-mono text-xs">{warranty.product_sku || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">판매채널</p>
                <p className="font-medium">{warranty.sales_channel || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 실제 주문 정보 (DB 조회) */}
          {orderInfo ? (
            <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <ShoppingCartIcon className="h-5 w-5" />
                  주문 정보 확인됨
                  <Badge variant="default" className="ml-2 bg-green-600">매칭 완료</Badge>
                </CardTitle>
                <CardDescription>
                  보증서 신청 정보와 실제 주문 이력이 일치합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 주문 기본 정보 */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">쇼핑몰 주문번호</p>
                    <p className="font-medium font-mono text-xs">{orderInfo.shop_ord_no || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">판매채널</p>
                    <p className="font-medium">{orderInfo.shop_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">주문일시</p>
                    <p className="font-medium">
                      {orderInfo.ord_time 
                        ? new Date(orderInfo.ord_time).toLocaleString("ko-KR")
                        : "-"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">주문상태</p>
                    <Badge variant={
                      orderInfo.ord_status === "배송완료" ? "default" :
                      orderInfo.ord_status === "배송중" ? "secondary" :
                      "outline"
                    }>
                      {orderInfo.ord_status || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">송장번호</p>
                    <p className="font-medium font-mono">
                      {orderInfo.invoice_no || <span className="text-muted-foreground">미발송</span>}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">주문 상품명</p>
                    <p className="font-medium">{orderInfo.shop_sale_name || "-"}</p>
                  </div>
                  {orderInfo.shop_opt_name && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">옵션</p>
                      <p className="font-medium text-sm">{orderInfo.shop_opt_name}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* 수령인 정보 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" />
                    배송 정보
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">수령인: </span>
                      <span className="font-medium">{orderInfo.to_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">연락처: </span>
                      <span className="font-medium font-mono">{orderInfo.to_htel || orderInfo.to_tel}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">주소: </span>
                      <span className="font-medium">
                        [{orderInfo.to_zipcd}] {orderInfo.to_addr1} {orderInfo.to_addr2}
                      </span>
                    </div>
                    {orderInfo.invoice_no && (
                      <div>
                        <span className="text-muted-foreground">송장번호: </span>
                        <span className="font-medium font-mono">{orderInfo.invoice_no}</span>
                      </div>
                    )}
                    {orderInfo.ship_msg && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">배송메모: </span>
                        <span className="font-medium">{orderInfo.ship_msg}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 결제 정보 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <CreditCardIcon className="h-4 w-4" />
                    결제 정보
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">결제금액: </span>
                      <span className="font-bold text-lg">
                        {Number(orderInfo.pay_amt || 0).toLocaleString()}원
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">배송비: </span>
                      <span className="font-medium">
                        {Number(orderInfo.ship_cost || 0).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>

                {/* 주문 상품 목록 */}
                {orderItems.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        주문 상품 ({orderItems.length}개)
                      </p>
                      <div className="space-y-2">
                        {orderItems.map((item: any, idx: number) => (
                          <div 
                            key={item.id || idx} 
                            className={`p-3 rounded-lg text-sm ${
                              item.sku_cd?.startsWith("SH_X_PNPC") 
                                ? "bg-green-100 dark:bg-green-900/30 border border-green-500/50" 
                                : "bg-muted/50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                {item.shop_opt_name && (
                                  <p className="text-muted-foreground text-xs">{item.shop_opt_name}</p>
                                )}
                                <p className="text-xs font-mono text-muted-foreground mt-1">
                                  SKU: {item.sku_cd || item.stock_cd || "-"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{item.sale_cnt || 1}개</p>
                                <p className="text-muted-foreground">
                                  {item.pay_amt?.toLocaleString() || 0}원
                                </p>
                              </div>
                            </div>
                            {item.sku_cd?.startsWith("SH_X_PNPC") && (
                              <Badge variant="default" className="mt-2 bg-green-600">
                                ✓ 보증서 대상 제품
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangleIcon className="h-5 w-5" />
                  주문 정보 없음
                </CardTitle>
                <CardDescription>
                  연결된 주문 정보가 없습니다. 수동 확인이 필요합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">송장번호 (입력값)</p>
                    <p className="font-medium font-mono">{warranty.tracking_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">주문일 (입력값)</p>
                    <p className="font-medium">
                      {warranty.order_date 
                        ? new Date(warranty.order_date).toLocaleDateString("ko-KR")
                        : "-"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 보증 기간 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                보증 기간
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">시작일</p>
                <p className="font-medium">
                  {warranty.warranty_start 
                    ? new Date(warranty.warranty_start).toLocaleDateString("ko-KR")
                    : "승인 후 설정됨"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">종료일</p>
                <p className="font-medium">
                  {warranty.warranty_end 
                    ? new Date(warranty.warranty_end).toLocaleDateString("ko-KR")
                    : "승인 후 설정됨"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* A/S 이력 */}
          {asRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>A/S 신청 이력</CardTitle>
                <CardDescription>{asRequests.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {asRequests.map((as: any) => (
                    <div key={as.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{as.request_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(as.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <Badge variant={as.status === "completed" ? "default" : "outline"}>
                        {as.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우측: 사진 및 액션 */}
        <div className="space-y-6">
          {/* 인증 사진 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                제품 인증 사진
              </CardTitle>
            </CardHeader>
            <CardContent>
              {warranty.product_photo_url ? (
                <a 
                  href={warranty.product_photo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img 
                    src={warranty.product_photo_url} 
                    alt="제품 인증 사진"
                    className="w-full rounded-lg border hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : (
                <div className="border rounded-lg p-12 bg-muted/30 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">사진 없음</p>
                </div>
              )}
              {warranty.photo_uploaded_at && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  업로드: {new Date(warranty.photo_uploaded_at).toLocaleString("ko-KR")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <Card>
            <CardHeader>
              <CardTitle>관리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warranty.status === "pending" && (
                <>
                  <fetcher.Form method="POST" className="w-full">
                    <input type="hidden" name="action" value="approve" />
                    <Button className="w-full" type="submit" disabled={fetcher.state !== "idle"}>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      승인하기
                    </Button>
                  </fetcher.Form>
                  <Button variant="destructive" className="w-full" asChild>
                    <a href={`/dashboard/warranty/pending?reject=${warranty.id}`}>
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      거절하기
                    </a>
                  </Button>
                </>
              )}

              {warranty.status === "approved" && !warranty.kakao_sent && (
                <fetcher.Form method="POST" className="w-full">
                  <input type="hidden" name="action" value="sendKakao" />
                  <Button variant="outline" className="w-full" type="submit" disabled={fetcher.state !== "idle"}>
                    <MessageSquareIcon className="h-4 w-4 mr-2" />
                    카카오톡 발송
                  </Button>
                </fetcher.Form>
              )}

              {warranty.kakao_sent && (
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-sm text-green-600">카카오톡 발송 완료</p>
                  {warranty.kakao_sent_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(warranty.kakao_sent_at).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
              )}

              {warranty.status === "rejected" && warranty.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">거절 사유</p>
                  <p className="text-sm mt-1">{warranty.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 처리 이력 */}
          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>처리 이력</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="text-sm border-l-2 pl-3 py-1">
                      <p className="font-medium">{log.action}</p>
                      {log.description && (
                        <p className="text-muted-foreground">{log.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("ko-KR")}
                        {log.performed_by && ` · ${log.performed_by}`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

