/**
 * 이벤트 참여자 관리 페이지
 * - 승인/반려 처리
 * - 포인트 적립
 * - 사은품 발송 관리 (송장번호 입력)
 */
import type { Route } from "./+types/event-submissions";

import { useState } from "react";
import { Link, useLoaderData, useFetcher, data, redirect } from "react-router";
import { 
  ArrowLeft,
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Package,
  Truck,
  User,
  Phone,
  MapPin,
  Gift,
  Filter,
  Search
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import { Input } from "~/core/components/ui/input";
import { Textarea } from "~/core/components/ui/textarea";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "이벤트 참여자 관리 | 관리자" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { id: eventId } = params;

  // 이벤트 정보
  const { data: event } = await adminClient
    .from("review_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    throw redirect("/dashboard/events");
  }

  // 제품 목록
  const { data: products } = await adminClient
    .from("review_event_products")
    .select("*")
    .eq("event_id", eventId);

  // 사은품 목록
  const { data: gifts } = await adminClient
    .from("review_event_gifts")
    .select("*")
    .eq("event_id", eventId);

  // 참여자 목록
  const { data: submissions } = await adminClient
    .from("review_submissions")
    .select(`
      *,
      profiles:user_id (
        name,
        email,
        phone
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  // 통계
  const stats = {
    total: submissions?.length || 0,
    pending: submissions?.filter(s => s.status === "pending").length || 0,
    approved: submissions?.filter(s => s.status === "approved").length || 0,
    shipped: submissions?.filter(s => s.gift_status === "shipped").length || 0,
    delivered: submissions?.filter(s => s.gift_status === "delivered").length || 0,
  };

  return data({ 
    event,
    products: products || [],
    gifts: gifts || [],
    submissions: submissions || [],
    stats,
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const submissionId = formData.get("submission_id") as string;
  const { id: eventId } = params;

  // 승인 처리
  if (actionType === "approve") {
    // 제출 정보 조회
    const { data: submission } = await adminClient
      .from("review_submissions")
      .select("user_id, event_id")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return { success: false, error: "제출 정보를 찾을 수 없습니다." };
    }

    // 이벤트 포인트 조회
    const { data: event } = await adminClient
      .from("review_events")
      .select("reward_points")
      .eq("id", submission.event_id)
      .single();

    const rewardPoints = event?.reward_points || 0;

    // 상태 업데이트
    await adminClient
      .from("review_submissions")
      .update({
        status: "approved",
        gift_status: "approved",
        points_awarded: rewardPoints,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    // 포인트 적립
    if (rewardPoints > 0) {
      // 현재 포인트 조회
      const { data: profile } = await adminClient
        .from("profiles")
        .select("points")
        .eq("id", submission.user_id)
        .single();

      const currentPoints = profile?.points || 0;
      const newBalance = currentPoints + rewardPoints;

      // 프로필 포인트 업데이트
      await adminClient
        .from("profiles")
        .update({ points: newBalance })
        .eq("id", submission.user_id);

      // 포인트 내역 추가
      await adminClient
        .from("point_transactions")
        .insert({
          user_id: submission.user_id,
          amount: rewardPoints,
          balance_after: newBalance,
          type: "review_reward",
          description: "후기 이벤트 참여 보상",
          reference_type: "review_submission",
          reference_id: submissionId,
        });
    }

    return { success: true, message: "승인 완료! 포인트가 적립되었습니다." };
  }

  // 반려 처리
  if (actionType === "reject") {
    const rejectionReason = formData.get("rejection_reason") as string;

    await adminClient
      .from("review_submissions")
      .update({
        status: "rejected",
        gift_status: "cancelled",
        rejection_reason: rejectionReason || "조건 미충족",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    return { success: true, message: "반려 처리되었습니다." };
  }

  // 발송 처리 (송장번호 입력)
  if (actionType === "ship") {
    const trackingNumber = formData.get("tracking_number") as string;
    const trackingCarrier = formData.get("tracking_carrier") as string;

    await adminClient
      .from("review_submissions")
      .update({
        gift_status: "shipped",
        tracking_number: trackingNumber,
        tracking_carrier: trackingCarrier,
        shipped_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    return { success: true, message: "발송 처리되었습니다." };
  }

  // 배송 완료 처리
  if (actionType === "delivered") {
    await adminClient
      .from("review_submissions")
      .update({
        gift_status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    return { success: true, message: "배송 완료 처리되었습니다." };
  }

  return { success: false };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "검토 대기", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "승인됨", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "반려됨", color: "bg-red-100 text-red-700", icon: XCircle },
};

const giftStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-gray-100 text-gray-600" },
  approved: { label: "발송 대기", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "발송됨", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "배송완료", color: "bg-green-100 text-green-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-600" },
};

const carriers = [
  { value: "cj", label: "CJ대한통운" },
  { value: "hanjin", label: "한진택배" },
  { value: "lotte", label: "롯데택배" },
  { value: "logen", label: "로젠택배" },
  { value: "post", label: "우체국택배" },
  { value: "other", label: "기타" },
];

export default function EventSubmissionsScreen() {
  const { event, products, gifts, submissions, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("cj");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetcherData = fetcher.data as { success: boolean; error?: string; message?: string } | undefined;

  const handleApprove = (id: string) => {
    if (!confirm("승인하시겠습니까? 포인트가 자동 적립됩니다.")) return;
    
    fetcher.submit(
      { _action: "approve", submission_id: id },
      { method: "POST" }
    );
  };

  const openRejectModal = (id: string) => {
    setSelectedId(id);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = () => {
    if (!selectedId) return;
    
    fetcher.submit(
      { _action: "reject", submission_id: selectedId, rejection_reason: rejectionReason },
      { method: "POST" }
    );
    
    setShowRejectModal(false);
  };

  const openShipModal = (id: string) => {
    setSelectedId(id);
    setTrackingNumber("");
    setTrackingCarrier("cj");
    setShowShipModal(true);
  };

  const handleShip = () => {
    if (!selectedId || !trackingNumber) return;
    
    fetcher.submit(
      { 
        _action: "ship", 
        submission_id: selectedId, 
        tracking_number: trackingNumber,
        tracking_carrier: trackingCarrier,
      },
      { method: "POST" }
    );
    
    setShowShipModal(false);
  };

  const handleDelivered = (id: string) => {
    if (!confirm("배송 완료 처리하시겠습니까?")) return;
    
    fetcher.submit(
      { _action: "delivered", submission_id: id },
      { method: "POST" }
    );
  };

  // 필터링
  const filteredSubmissions = submissions.filter((sub: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return sub.status === "pending";
    if (statusFilter === "approved") return sub.status === "approved" && sub.gift_status === "approved";
    if (statusFilter === "shipped") return sub.gift_status === "shipped";
    if (statusFilter === "delivered") return sub.gift_status === "delivered";
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/dashboard/events"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-500">참여자 관리</p>
        </div>
      </div>

      {/* 알림 */}
      {fetcherData?.success && fetcherData?.message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700">✅ {fetcherData.message}</p>
        </div>
      )}

      {/* 통계 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">전체</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700">검토 대기</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-700">발송 대기</p>
          <p className="text-2xl font-bold text-blue-700">{stats.approved}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <p className="text-sm text-purple-700">발송됨</p>
          <p className="text-2xl font-bold text-purple-700">{stats.shipped}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">배송완료</p>
          <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-2">
          {[
            { value: "all", label: "전체" },
            { value: "pending", label: "검토 대기" },
            { value: "approved", label: "발송 대기" },
            { value: "shipped", label: "발송됨" },
            { value: "delivered", label: "배송완료" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">해당 상태의 참여자가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub: any) => {
            const status = statusConfig[sub.status as keyof typeof statusConfig] || statusConfig.pending;
            const giftStatus = giftStatusConfig[sub.gift_status as keyof typeof giftStatusConfig] || giftStatusConfig.pending;
            const StatusIcon = status.icon;
            const profile = sub.profiles;
            const product = products.find((p: any) => p.id === sub.event_product_id);
            const gift = gifts.find((g: any) => g.id === sub.selected_gift_id);
            
            return (
              <div 
                key={sub.id} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-5">
                  {/* 상단: 상태 및 날짜 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {status.label}
                      </Badge>
                      {sub.status === "approved" && (
                        <Badge className={giftStatus.color}>
                          <Gift className="w-3.5 h-3.5 mr-1" />
                          {giftStatus.label}
                        </Badge>
                      )}
                      {sub.points_awarded > 0 && (
                        <Badge className="bg-orange-100 text-orange-700">
                          +{sub.points_awarded}P
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(sub.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>

                  {/* 제품/사은품 정보 */}
                  <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">후기 제품</p>
                      <p className="font-medium text-gray-900">
                        {product?.product_name || sub.product_name || "-"}
                      </p>
                    </div>
                    {gift && (
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">선택 사은품</p>
                        <p className="font-medium text-gray-900">
                          {gift.gift_code && `[${gift.gift_code}] `}{gift.gift_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 고객/배송 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {sub.shipping_name || profile?.name || sub.buyer_name || "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {sub.shipping_phone || profile?.phone || sub.buyer_phone || "-"}
                        </span>
                      </div>
                    </div>
                    {sub.shipping_address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-600">
                          [{sub.shipping_zipcode}] {sub.shipping_address} {sub.shipping_address_detail}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 후기 링크 */}
                  <div className="flex items-center gap-4 mb-4">
                    <a 
                      href={sub.review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      맘카페 후기
                    </a>
                    {sub.mall_review_screenshot_urls?.length > 0 && (
                      <span className="text-sm text-gray-500">
                        쇼핑몰 스크린샷 {sub.mall_review_screenshot_urls.length}장
                      </span>
                    )}
                  </div>

                  {/* 송장 정보 (발송된 경우) */}
                  {sub.tracking_number && (
                    <div className="p-3 bg-purple-50 rounded-lg mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-700 font-medium">
                          {carriers.find(c => c.value === sub.tracking_carrier)?.label || sub.tracking_carrier}
                        </span>
                        <span className="text-purple-600">{sub.tracking_number}</span>
                      </div>
                    </div>
                  )}

                  {/* 반려 사유 */}
                  {sub.status === "rejected" && sub.rejection_reason && (
                    <div className="p-3 bg-red-50 rounded-lg mb-4">
                      <p className="text-sm text-red-700">
                        <strong>반려 사유:</strong> {sub.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    {sub.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(sub.id)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          승인 (+{event.reward_points}P)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectModal(sub.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          반려
                        </Button>
                      </>
                    )}
                    
                    {sub.status === "approved" && sub.gift_status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => openShipModal(sub.id)}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        발송 처리
                      </Button>
                    )}

                    {sub.gift_status === "shipped" && (
                      <Button
                        size="sm"
                        onClick={() => handleDelivered(sub.id)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        배송 완료
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 반려 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRejectModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">반려 처리</h3>
            
            <div className="mb-4">
              <label className="text-sm text-gray-700 font-medium mb-2 block">
                반려 사유
              </label>
              <Textarea
                placeholder="반려 사유를 입력해주세요"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleReject}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                반려 처리
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 발송 모달 */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowShipModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">발송 처리</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-700 font-medium mb-2 block">
                  택배사
                </label>
                <select
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                >
                  {carriers.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium mb-2 block">
                  송장번호
                </label>
                <Input
                  placeholder="송장번호를 입력하세요"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowShipModal(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleShip}
                disabled={!trackingNumber}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              >
                발송 처리
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


