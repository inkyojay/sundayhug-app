/**
 * 보증서 상세 페이지 (관리자용)
 * - 주문 자동/수동 연결 기능 포함
 * - 1:1 매핑 (하나의 주문에는 하나의 보증서만 연결)
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
  SearchIcon,
  LinkIcon,
  UnlinkIcon,
  Loader2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Separator } from "~/core/components/ui/separator";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

import makeServerClient from "~/core/lib/supa-client.server";
import { createAdminClient } from "~/core/lib/supa-admin.server";
import { sendWarrantyApprovalAlimtalk, sendWarrantyRejectionAlimtalk } from "~/features/auth/lib/solapi.server";

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `${data?.warranty?.warranty_number || "보증서"} | Sundayhug Admin` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const adminClient = createAdminClient();
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

  // 자동 연동 후보 주문 검색 (order_id가 없고 pending 상태인 경우)
  let suggestedOrders: any[] = [];
  if (!warranty.order_id && warranty.status === "pending") {
    // 구매자명 (buyer_name)
    const buyerName = warranty.buyer_name?.trim() || "";
    
    // 전화번호로 검색 (하이픈 제거하고 뒤 8자리로 매칭)
    const phone = warranty.customer_phone?.replace(/-/g, "") || "";
    const phoneLast8 = phone.slice(-8);
    
    // 송장번호로 검색
    const trackingNumber = warranty.tracking_number;

    const orderSelectQuery = `
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
      invoice_no,
      pay_amt
    `;

    // 1. 구매자명 + 전화번호로 먼저 검색 (가장 정확한 매칭)
    if (buyerName && phoneLast8) {
      const { data: byNameAndPhone } = await adminClient
        .from("orders")
        .select(orderSelectQuery)
        .ilike("to_name", `%${buyerName}%`)
        .or(`to_tel.ilike.%${phoneLast8}%,to_htel.ilike.%${phoneLast8}%`)
        .order("ord_time", { ascending: false })
        .limit(20);
      
      if (byNameAndPhone && byNameAndPhone.length > 0) {
        suggestedOrders = byNameAndPhone;
      }
    }

    // 2. 송장번호로 검색
    if (suggestedOrders.length === 0 && trackingNumber) {
      const { data: byInvoice } = await adminClient
        .from("orders")
        .select(orderSelectQuery)
        .eq("invoice_no", trackingNumber)
        .limit(10);
      
      if (byInvoice && byInvoice.length > 0) {
        suggestedOrders = byInvoice;
      }
    }

    // 3. 구매자명만으로 검색
    if (suggestedOrders.length === 0 && buyerName) {
      const { data: byName } = await adminClient
        .from("orders")
        .select(orderSelectQuery)
        .ilike("to_name", `%${buyerName}%`)
        .order("ord_time", { ascending: false })
        .limit(20);
      
      if (byName) {
        suggestedOrders = byName;
      }
    }

    // 4. 전화번호만으로 검색 (폴백)
    if (suggestedOrders.length === 0 && phoneLast8) {
      const { data: byPhone } = await adminClient
        .from("orders")
        .select(orderSelectQuery)
        .or(`to_tel.ilike.%${phoneLast8}%,to_htel.ilike.%${phoneLast8}%`)
        .order("ord_time", { ascending: false })
        .limit(20);
      
      if (byPhone) {
        suggestedOrders = byPhone;
      }
    }

    // 이미 다른 보증서에 연결된 주문 제외
    if (suggestedOrders.length > 0) {
      const orderIds = suggestedOrders.map(o => o.id);
      const { data: linkedWarranties } = await adminClient
        .from("warranties")
        .select("order_id")
        .in("order_id", orderIds)
        .neq("id", id); // 현재 보증서 제외

      const linkedOrderIds = new Set(linkedWarranties?.map(w => w.order_id) || []);
      suggestedOrders = suggestedOrders.map(order => ({
        ...order,
        already_linked: linkedOrderIds.has(order.id),
      }));
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
    suggestedOrders,
    logs: logs || [],
    asRequests: asRequests || [],
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  // RLS를 우회하기 위해 Admin 클라이언트 사용
  const adminClient = createAdminClient();
  const { id } = params;
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  console.log("Detail action received:", { id, actionType });

  // 주문 검색
  if (actionType === "searchOrders") {
    const searchQuery = formData.get("searchQuery") as string;
    
    if (!searchQuery || searchQuery.length < 3) {
      return { success: false, error: "검색어를 3자 이상 입력해주세요." };
    }

    // 검색어로 주문 검색 (송장번호, 전화번호, 주문번호, 수령인명)
    const { data: searchResults, error } = await adminClient
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
        invoice_no,
        pay_amt
      `)
      .or(`invoice_no.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,to_htel.ilike.%${searchQuery}%,shop_ord_no.ilike.%${searchQuery}%,to_name.ilike.%${searchQuery}%`)
      .order("ord_time", { ascending: false })
      .limit(20);

    if (error) {
      return { success: false, error: error.message };
    }

    // 이미 다른 보증서에 연결된 주문 체크
    if (searchResults && searchResults.length > 0) {
      const orderIds = searchResults.map(o => o.id);
      const { data: linkedWarranties } = await adminClient
        .from("warranties")
        .select("order_id")
        .in("order_id", orderIds)
        .neq("id", id);

      const linkedOrderIds = new Set(linkedWarranties?.map(w => w.order_id) || []);
      const resultsWithStatus = searchResults.map(order => ({
        ...order,
        already_linked: linkedOrderIds.has(order.id),
      }));

      return { success: true, searchResults: resultsWithStatus };
    }

    return { success: true, searchResults: [] };
  }

  // 주문 연결
  if (actionType === "linkOrder") {
    const orderId = formData.get("orderId") as string;

    // 해당 주문이 이미 다른 보증서에 연결되어 있는지 확인
    const { data: existingLink } = await adminClient
      .from("warranties")
      .select("id, warranty_number")
      .eq("order_id", orderId)
      .neq("id", id)
      .single();

    if (existingLink) {
      return { 
        success: false, 
        error: `이 주문은 이미 다른 보증서(${existingLink.warranty_number})에 연결되어 있습니다.` 
      };
    }

    // 주문 정보 가져와서 보증서에 연결
    const { data: order } = await adminClient
      .from("orders")
      .select("id, shop_sale_name, shop_opt_name, invoice_no, ord_time, shop_name")
      .eq("id", orderId)
      .single();

    if (!order) {
      return { success: false, error: "주문을 찾을 수 없습니다." };
    }

    const { error } = await adminClient
      .from("warranties")
      .update({
        order_id: orderId,
        tracking_number: order.invoice_no,
        product_name: order.shop_sale_name,
        product_option: order.shop_opt_name,
        sales_channel: order.shop_name,
        order_date: order.ord_time ? new Date(order.ord_time).toISOString().split("T")[0] : null,
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: `연결 실패: ${error.message}` };
    }

    return { success: true, message: "주문이 연결되었습니다." };
  }

  // 주문 연결 해제
  if (actionType === "unlinkOrder") {
    const { error } = await adminClient
      .from("warranties")
      .update({
        order_id: null,
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: `연결 해제 실패: ${error.message}` };
    }

    return { success: true, message: "주문 연결이 해제되었습니다." };
  }

  // 승인
  if (actionType === "approve") {
    const today = new Date();
    const warrantyEnd = new Date(today);
    warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

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
      .eq("id", id)
      .select("*, customers(name)")
      .single();

    console.log("Detail approve result:", { data, error });

    if (error) {
      console.error("승인 오류:", error);
      return { success: false, error: `승인 실패: ${error.message}` };
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
            .eq("id", id);
          
          console.log("✅ 승인 알림톡 발송 완료:", alimtalkResult.messageId);
        } else {
          console.error("⚠️ 알림톡 발송 실패 (승인은 완료됨):", alimtalkResult.error);
        }
      } catch (alimtalkError) {
        console.error("⚠️ 알림톡 발송 중 오류 (승인은 완료됨):", alimtalkError);
      }
    }

    return { success: true, message: "승인되었습니다." };
  }

  // 거절
  if (actionType === "reject") {
    const reason = formData.get("reason") as string;
    const rejectionReason = reason || "관리자에 의해 거절됨";
    
    const { data, error } = await adminClient
      .from("warranties")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
      })
      .eq("id", id)
      .select("*, customers(name)")
      .single();

    console.log("Detail reject result:", { data, error });

    if (error) {
      console.error("거절 오류:", error);
      return { success: false, error: `거절 실패: ${error.message}` };
    }

    // 카카오 알림톡 발송 (거절)
    if (data?.customer_phone) {
      try {
        const alimtalkResult = await sendWarrantyRejectionAlimtalk(
          data.customer_phone,
          {
            customerName: data.buyer_name || data.customers?.name || "고객",
            rejectionReason: rejectionReason,
            registerUrl: "https://app-sundayhug-members.vercel.app/customer/warranty",
          }
        );

        if (alimtalkResult.success) {
          console.log("✅ 거절 알림톡 발송 완료:", alimtalkResult.messageId);
        } else {
          console.error("⚠️ 알림톡 발송 실패 (거절은 완료됨):", alimtalkResult.error);
        }
      } catch (alimtalkError) {
        console.error("⚠️ 알림톡 발송 중 오류 (거절은 완료됨):", alimtalkError);
      }
    }

    return { success: true, message: "거절되었습니다." };
  }

  // 카카오 알림톡 수동 발송
  if (actionType === "sendKakao") {
    // 먼저 보증서 정보 조회
    const { data: warranty, error: fetchError } = await adminClient
      .from("warranties")
      .select("*, customers(name)")
      .eq("id", id)
      .single();

    if (fetchError || !warranty) {
      return { success: false, error: "보증서 정보를 찾을 수 없습니다." };
    }

    if (!warranty.warranty_start || !warranty.warranty_end) {
      return { success: false, error: "보증 기간이 설정되지 않았습니다. 먼저 승인해주세요." };
    }

    // 알림톡 발송
    const alimtalkResult = await sendWarrantyApprovalAlimtalk(
      warranty.customer_phone,
      {
        customerName: warranty.buyer_name || warranty.customers?.name || "고객",
        productName: warranty.product_name || "제품",
        warrantyNumber: warranty.warranty_number,
        startDate: warranty.warranty_start,
        endDate: warranty.warranty_end,
      }
    );

    if (!alimtalkResult.success) {
      return { success: false, error: `카카오톡 발송 실패: ${alimtalkResult.error}` };
    }

    // 발송 기록 업데이트
    await adminClient
      .from("warranties")
      .update({
        kakao_sent: true,
        kakao_sent_at: new Date().toISOString(),
        kakao_message_id: alimtalkResult.messageId,
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
  const { warranty, orderInfo, orderItems, suggestedOrders, logs, asRequests } = loaderData;
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // 거절 다이얼로그 상태
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // fetcher가 완료되면 데이터 새로고침
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      if (fetcher.data.searchResults) {
        setSearchResults(fetcher.data.searchResults);
      } else {
        revalidator.revalidate();
        setShowSearchDialog(false);
        setSearchQuery("");
        setSearchResults([]);
        setShowRejectDialog(false);
        setRejectionReason("");
      }
    }
  }, [fetcher.state, fetcher.data]);
  
  const StatusIcon = statusConfig[warranty.status]?.icon || ClockIcon;
  const isSubmitting = fetcher.state !== "idle";

  const handleSearch = () => {
    if (searchQuery.length < 3) return;
    fetcher.submit(
      { action: "searchOrders", searchQuery },
      { method: "POST" }
    );
  };

  const handleLinkOrder = (orderId: string) => {
    if (confirm("이 주문을 보증서에 연결하시겠습니까?")) {
      fetcher.submit(
        { action: "linkOrder", orderId },
        { method: "POST" }
      );
    }
  };

  const handleUnlinkOrder = () => {
    if (confirm("주문 연결을 해제하시겠습니까?")) {
      fetcher.submit(
        { action: "unlinkOrder" },
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
      { action: "reject", reason: rejectionReason },
      { method: "POST" }
    );
  };

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
                <p className="text-sm text-muted-foreground">구매자명</p>
                <p className="font-medium text-lg">
                  {warranty.buyer_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">연락처</p>
                <p className="font-medium font-mono">{warranty.customer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">회원명</p>
                <p className="font-medium">
                  {warranty.customers?.name || warranty.customers?.kakao_nickname || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{warranty.customers?.email || "-"}</p>
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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <ShoppingCartIcon className="h-5 w-5" />
                      주문 정보 확인됨
                      <Badge variant="default" className="ml-2 bg-green-600">매칭 완료</Badge>
                    </CardTitle>
                    <CardDescription>
                      보증서 신청 정보와 실제 주문 이력이 일치합니다
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleUnlinkOrder}
                    disabled={isSubmitting}
                  >
                    <UnlinkIcon className="h-4 w-4 mr-1" />
                    연결 해제
                  </Button>
                </div>
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
                  연결된 주문 정보가 없습니다. 아래에서 주문을 검색하여 연결해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* 자동 연동 후보 주문 */}
                {suggestedOrders && suggestedOrders.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <SearchIcon className="h-4 w-4" />
                        연결 가능한 주문 ({suggestedOrders.length}건)
                      </p>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {suggestedOrders.map((order: any) => (
                          <div 
                            key={order.id} 
                            className={`p-3 rounded-lg border text-sm ${
                              order.already_linked 
                                ? "bg-muted/30 opacity-60" 
                                : "bg-background hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium">{order.shop_sale_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.shop_name} · {order.ord_time ? new Date(order.ord_time).toLocaleDateString("ko-KR") : "-"}
                                </p>
                                <div className="flex gap-3 mt-1 text-xs">
                                  <span>수령인: {order.to_name}</span>
                                  <span className="font-mono">{order.to_htel || order.to_tel}</span>
                                </div>
                                {order.invoice_no && (
                                  <p className="text-xs font-mono mt-1">송장: {order.invoice_no}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {order.already_linked ? (
                                  <Badge variant="secondary" className="text-xs">
                                    이미 연결됨
                                  </Badge>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleLinkOrder(order.id)}
                                    disabled={isSubmitting}
                                  >
                                    <LinkIcon className="h-3 w-3 mr-1" />
                                    연결
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 수동 검색 버튼 */}
                <Separator />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowSearchDialog(true)}
                >
                  <SearchIcon className="h-4 w-4 mr-2" />
                  주문 직접 검색
                </Button>
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

          {/* 인증 사진 */}
          {warranty.product_photo_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  제품 인증 사진
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a 
                  href={warranty.product_photo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img 
                    src={warranty.product_photo_url} 
                    alt="제품 인증 사진"
                    className="max-w-full h-auto rounded-lg border hover:opacity-90 transition-opacity"
                    style={{ maxHeight: "400px" }}
                  />
                </a>
                {warranty.photo_uploaded_at && (
                  <p className="text-sm text-muted-foreground mt-2">
                    업로드: {new Date(warranty.photo_uploaded_at).toLocaleString("ko-KR")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우측: 액션 & 이력 */}
        <div className="space-y-6">
          {/* 액션 버튼 */}
          {warranty.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>관리자 액션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <fetcher.Form method="POST">
                  <input type="hidden" name="action" value="approve" />
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                    )}
                    승인
                  </Button>
                </fetcher.Form>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isSubmitting}
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  거절
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 카카오 알림톡 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareIcon className="h-5 w-5" />
                카카오 알림톡
              </CardTitle>
            </CardHeader>
            <CardContent>
              {warranty.kakao_sent ? (
                <div className="text-sm">
                  <Badge variant="default" className="mb-2">발송됨</Badge>
                  <p className="text-muted-foreground">
                    {warranty.kakao_sent_at && new Date(warranty.kakao_sent_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              ) : (
                <fetcher.Form method="POST">
                  <input type="hidden" name="action" value="sendKakao" />
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full"
                    disabled={isSubmitting || warranty.status !== "approved"}
                  >
                    <MessageSquareIcon className="h-4 w-4 mr-2" />
                    알림톡 발송
                  </Button>
                </fetcher.Form>
              )}
            </CardContent>
          </Card>

          {/* 처리 이력 */}
          <Card>
            <CardHeader>
              <CardTitle>처리 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log: any) => (
                    <div key={log.id} className="text-sm border-l-2 pl-3 py-1">
                      <p className="font-medium">{log.action}</p>
                      {log.description && (
                        <p className="text-muted-foreground text-xs">{log.description}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {new Date(log.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">이력이 없습니다</p>
              )}
            </CardContent>
          </Card>

          {/* A/S 신청 이력 */}
          {asRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>A/S 신청 이력</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {asRequests.map((req: any) => (
                    <div key={req.id} className="text-sm border-l-2 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{req.request_type}</Badge>
                        <Badge variant={
                          req.status === "completed" ? "default" :
                          req.status === "processing" ? "secondary" :
                          "outline"
                        }>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {req.issue_description?.slice(0, 50)}...
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(req.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 주문 검색 다이얼로그 */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>주문 검색</DialogTitle>
            <DialogDescription>
              송장번호, 전화번호, 주문번호, 수령인명으로 검색할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="검색어 입력 (3자 이상)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSubmitting || searchQuery.length < 3}>
                {isSubmitting ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <SearchIcon className="h-4 w-4" />
                )}
              </Button>
            </div>

            {fetcher.data?.error && (
              <p className="text-sm text-destructive">{fetcher.data.error}</p>
            )}

            {searchResults.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((order: any) => (
                  <div 
                    key={order.id} 
                    className={`p-3 rounded-lg border text-sm ${
                      order.already_linked 
                        ? "bg-muted/30 opacity-60" 
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{order.shop_sale_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.shop_name} · 주문번호: {order.shop_ord_no}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.ord_time ? new Date(order.ord_time).toLocaleString("ko-KR") : "-"}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs">
                          <span>수령인: {order.to_name}</span>
                          <span className="font-mono">{order.to_htel || order.to_tel}</span>
                        </div>
                        {order.invoice_no && (
                          <p className="text-xs font-mono mt-1">송장: {order.invoice_no}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold mb-2">{Number(order.pay_amt || 0).toLocaleString()}원</p>
                        {order.already_linked ? (
                          <Badge variant="secondary" className="text-xs">
                            이미 연결됨
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleLinkOrder(order.id)}
                            disabled={isSubmitting}
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            연결
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 3 && fetcher.state === "idle" && fetcher.data?.searchResults ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                검색 결과가 없습니다.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSearchDialog(false);
              setSearchQuery("");
              setSearchResults([]);
            }}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거절 사유 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>보증서 거절</DialogTitle>
            <DialogDescription>
              {warranty.warranty_number} 보증서를 거절합니다.
              고객에게 안내할 거절 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="거절 사유를 입력하세요. (예: 제품 사진이 불명확합니다. 제품 전체가 보이는 사진으로 다시 등록해주세요.)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
            }}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? (
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircleIcon className="h-4 w-4 mr-2" />
              )}
              거절
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
