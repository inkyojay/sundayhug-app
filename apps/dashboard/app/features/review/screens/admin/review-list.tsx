/**
 * 관리자용 후기 인증 관리 페이지 (개선 버전)
 * 
 * - 이벤트/일반 후기 구분
 * - 보증서 인증 여부 표시
 * - 첨부 사진 크게 보기
 * - 선물 상태 관리
 */
import type { Route } from "./+types/review-list";

import { useState } from "react";
import { useLoaderData, useFetcher, data } from "react-router";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  MessageSquare,
  Instagram,
  FileText,
  Image as ImageIcon,
  Filter,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Gift,
  Truck,
  Package,
  Star,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  User,
  Calendar,
  Tag,
  Award
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import { Textarea } from "~/core/components/ui/textarea";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "후기 인증 관리 | 관리자" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "pending";

  // 1. review_submissions + 관련 테이블 조회
  let query = adminClient
    .from("review_submissions")
    .select(`
      *,
      event:review_events(id, name, event_type),
      event_product:review_event_products(id, product_name, product_image_url),
      selected_gift:review_event_gifts(id, gift_name, gift_image_url),
      warranty:warranties(id, warranty_number, status, product_name, warranty_start, warranty_end)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: submissions, error } = await query;

  if (error) {
    console.error("후기 목록 조회 오류:", error);
  }

  // 2. profiles 조회 (user_id로 매핑)
  const userIds = [...new Set((submissions || []).map(s => s.user_id).filter(Boolean))];
  let profilesMap: Record<string, any> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, name, email, phone")
      .in("id", userIds);
    
    profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);
  }

  // 3. submissions에 profiles 병합
  const submissionsWithProfiles = (submissions || []).map(sub => ({
    ...sub,
    profiles: profilesMap[sub.user_id] || null,
  }));

  // 통계
  const { data: stats } = await adminClient
    .from("review_submissions")
    .select("status, event_id");

  const counts = {
    pending: stats?.filter(s => s.status === "pending").length || 0,
    approved: stats?.filter(s => s.status === "approved").length || 0,
    rejected: stats?.filter(s => s.status === "rejected").length || 0,
    total: stats?.length || 0,
    events: stats?.filter(s => s.event_id).length || 0,
    general: stats?.filter(s => !s.event_id).length || 0,
  };

  return data({ 
    submissions: submissionsWithProfiles,
    statusFilter,
    counts,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const submissionId = formData.get("submissionId") as string;
  const actionType = formData.get("action") as string;
  const rejectionReason = formData.get("rejectionReason") as string;

  if (!submissionId || !actionType) {
    return { success: false, error: "필수 정보가 누락되었습니다." };
  }

  const updateData: any = {
    reviewed_at: new Date().toISOString(),
  };

  if (actionType === "approve") {
    updateData.status = "approved";
    updateData.gift_status = "approved";
  } else if (actionType === "reject") {
    updateData.status = "rejected";
    updateData.rejection_reason = rejectionReason || "조건 미충족";
    updateData.gift_status = "cancelled";
  } else {
    return { success: false, error: "잘못된 액션입니다." };
  }

  const { error } = await adminClient
    .from("review_submissions")
    .update(updateData)
    .eq("id", submissionId);

  if (error) {
    console.error("후기 상태 업데이트 오류:", error);
    return { success: false, error: "처리 중 오류가 발생했습니다." };
  }

  return { 
    success: true, 
    message: actionType === "approve" ? "승인되었습니다." : "반려되었습니다." 
  };
}

const reviewTypeConfig = {
  momcafe: { 
    name: "맘카페", 
    icon: MessageSquare, 
    color: "bg-pink-500",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
  },
  instagram: { 
    name: "인스타그램", 
    icon: Instagram, 
    color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
  },
  blog: { 
    name: "블로그", 
    icon: FileText, 
    color: "bg-green-500",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
  },
};

const statusConfig = {
  pending: { 
    label: "대기중", 
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", 
    icon: Clock 
  },
  approved: { 
    label: "승인됨", 
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", 
    icon: CheckCircle 
  },
  rejected: { 
    label: "반려됨", 
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", 
    icon: XCircle 
  },
};

const giftStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "대기", color: "bg-gray-100 text-gray-600", icon: Clock },
  approved: { label: "승인", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  shipped: { label: "발송완료", color: "bg-purple-100 text-purple-700", icon: Truck },
  delivered: { label: "배송완료", color: "bg-green-100 text-green-700", icon: Package },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700", icon: XCircle },
};

// 이미지 뷰어 컴포넌트
function ImageViewer({ 
  images, 
  onClose 
}: { 
  images: string[]; 
  onClose: () => void 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
      >
        <X className="w-8 h-8" />
      </button>
      
      <div className="max-w-4xl max-h-[90vh] px-4">
        <img 
          src={images[currentIndex]} 
          alt={`이미지 ${currentIndex + 1}`}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 후기 카드 컴포넌트 (컴팩트 버전)
function ReviewCard({ 
  sub, 
  onApprove, 
  onReject,
  isProcessing
}: { 
  sub: any; 
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  
  const typeConfig = reviewTypeConfig[sub.review_type as keyof typeof reviewTypeConfig];
  const status = statusConfig[sub.status as keyof typeof statusConfig];
  const giftStatus = giftStatusConfig[sub.gift_status as keyof typeof giftStatusConfig];
  const TypeIcon = typeConfig?.icon || MessageSquare;
  const StatusIcon = status?.icon || Clock;
  const profile = sub.profiles;
  
  const isEventReview = !!sub.event_id;
  const hasWarranty = !!sub.warranty;
  const warrantyApproved = sub.warranty?.status === "approved";
  
  const allImages = [
    ...(sub.screenshot_urls || []),
    ...(sub.mall_review_screenshot_urls || []),
  ];
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
        {/* 컴팩트 헤더 */}
        <div className={`px-3 py-1.5 flex items-center justify-between ${
          isEventReview 
            ? "bg-gradient-to-r from-orange-500 to-pink-500" 
            : "bg-gradient-to-r from-blue-500 to-cyan-500"
        }`}>
          <span className="text-white text-xs font-medium flex items-center gap-1.5">
            {isEventReview ? <Gift className="w-3 h-3" /> : <Star className="w-3 h-3" />}
            {isEventReview ? sub.event?.name || "이벤트" : "일반 후기"}
            </span>
          <Badge className={`${status?.color} text-xs py-0`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status?.label}
          </Badge>
          </div>
        
        <div className="p-3">
          {/* 메인 정보 영역 */}
          <div className="flex gap-3">
            {/* 이미지 썸네일 */}
            {allImages.length > 0 && (
              <button
                onClick={() => setViewingImages(allImages)}
                className="relative shrink-0"
              >
                <img 
                  src={allImages[0]} 
                  alt="첨부사진"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
                {allImages.length > 1 && (
                  <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full">
                    +{allImages.length - 1}
            </span>
                )}
              </button>
        )}
        
            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* 제품명 */}
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {sub.event_product?.product_name || sub.product_name || "제품 미지정"}
                  </p>
                  
                  {/* 구매자/신청자 정보 */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{sub.buyer_name || profile?.name || "-"}</span>
                    <span>·</span>
                    <span>{sub.buyer_phone || profile?.phone || "-"}</span>
              </div>
              
                  {/* 뱃지들 */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <Badge className={`${typeConfig?.badge} text-xs py-0`}>
                    {typeConfig?.name || sub.review_type}
                  </Badge>
                    {hasWarranty && (
                      <Badge className={`text-xs py-0 ${warrantyApproved 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                        <ShieldCheck className="w-3 h-3 mr-0.5" />
                        {warrantyApproved ? "인증" : "미인증"}
                      </Badge>
                    )}
                    {isEventReview && sub.selected_gift && (
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs py-0">
                        🎁 {sub.selected_gift.gift_name}
                    </Badge>
                  )}
                  </div>
                </div>
                </div>
                
              {/* 액션 영역 */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <a 
                    href={sub.review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    링크
                  </a>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 flex items-center gap-0.5"
                  >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    상세
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(sub.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                
                {/* 승인/반려 버튼 */}
            {sub.status === "pending" && (
                  <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => onApprove(sub.id)}
                      className="h-7 px-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                  disabled={isProcessing}
                >
                      <CheckCircle className="w-3 h-3 mr-1" />
                  승인
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(sub.id)}
                      className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50 text-xs"
                  disabled={isProcessing}
                >
                      <XCircle className="w-3 h-3 mr-1" />
                  반려
                </Button>
              </div>
            )}
              </div>
            </div>
          </div>
          
          {/* 확장 영역 */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {/* 상세 정보 그리드 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">구매자</p>
                  <p className="text-gray-900 dark:text-white font-medium">{sub.buyer_name || "-"}</p>
                  <p className="text-gray-600 dark:text-gray-400">{sub.buyer_phone || "-"}</p>
                  {sub.purchase_channel && <p className="text-gray-500">구매처: {sub.purchase_channel}</p>}
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">신청 회원</p>
                  <p className="text-gray-900 dark:text-white font-medium">{profile?.name || "-"}</p>
                  <p className="text-gray-600 dark:text-gray-400">{profile?.phone || "-"}</p>
                </div>
                  </div>
              
              {/* 보증서 정보 */}
              {hasWarranty && (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs">
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-1">보증서 정보</p>
                  <p className="text-gray-700 dark:text-gray-300">{sub.warranty.warranty_number}</p>
                  <p className="text-gray-600 dark:text-gray-400">{sub.warranty.product_name}</p>
                </div>
              )}
              
              {/* 배송 정보 */}
              {isEventReview && sub.shipping_address && (
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs">
                  <p className="text-purple-600 dark:text-purple-400 font-medium mb-1">배송지</p>
                  <p className="text-gray-700 dark:text-gray-300">{sub.shipping_name} / {sub.shipping_phone}</p>
                  <p className="text-gray-600 dark:text-gray-400">({sub.shipping_zipcode}) {sub.shipping_address} {sub.shipping_address_detail}</p>
                </div>
              )}
              
              {/* 반려 사유 */}
              {sub.status === "rejected" && sub.rejection_reason && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
                  <p className="text-red-700 dark:text-red-400"><strong>반려 사유:</strong> {sub.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {viewingImages && (
        <ImageViewer images={viewingImages} onClose={() => setViewingImages(null)} />
      )}
    </>
  );
}

export default function AdminReviewListScreen() {
  const { submissions, statusFilter, counts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetcherData = fetcher.data as any;

  const handleApprove = (id: string) => {
    if (!confirm("이 후기를 승인하시겠습니까?\n승인 시 사은품 상태도 '승인'으로 변경됩니다.")) return;
    
    fetcher.submit(
      { submissionId: id, action: "approve" },
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
      { 
        submissionId: selectedId, 
        action: "reject",
        rejectionReason,
      },
      { method: "POST" }
    );
    
    setShowRejectModal(false);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 고정 헤더 영역 */}
      <div className="sticky top-0 z-10 bg-background border-b">
      {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          후기 인증 관리
        </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
          고객이 신청한 후기를 검토하고 승인/반려 처리합니다.
        </p>
      </div>

            {/* 통계 요약 (작게) */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{counts.pending}</span>
        </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{counts.approved}</span>
        </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">{counts.rejected}</span>
        </div>
        </div>
        </div>
      </div>

        {/* 필터 - 상단 고정 */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex gap-1">
          {[
              { value: "pending", label: "대기중", count: counts.pending, color: "amber" },
              { value: "approved", label: "승인됨", count: counts.approved, color: "emerald" },
              { value: "rejected", label: "반려됨", count: counts.rejected, color: "red" },
              { value: "all", label: "전체", count: counts.total, color: "gray" },
          ].map((filter) => (
            <a
              key={filter.value}
              href={`?status=${filter.value}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter.value
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {filter.label}
                <span className={`ml-1.5 text-xs ${statusFilter === filter.value ? "opacity-70" : "opacity-50"}`}>
                  {filter.count}
                </span>
            </a>
          ))}
        </div>
          
          <div className="flex-1" />
        
        <a 
          href="?status=pending"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </a>
      </div>
        
        {/* 알림 */}
        {fetcherData?.success && (
          <div className="mx-4 mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">✅ {fetcherData.message}</p>
          </div>
        )}
        {fetcherData?.error && (
          <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">❌ {fetcherData.error}</p>
          </div>
        )}
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto p-4">

      {/* 목록 */}
      {submissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">해당 상태의 후기가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
          {submissions.map((sub: any) => (
            <ReviewCard 
              key={sub.id}
              sub={sub}
              onApprove={handleApprove}
              onReject={openRejectModal}
              isProcessing={fetcher.state !== "idle"}
            />
          ))}
        </div>
      )}
      </div>

      {/* 반려 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRejectModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">후기 반려</h3>
            
            <div className="mb-4">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2 block">
                반려 사유
              </label>
              <Textarea
                placeholder="반려 사유를 입력해주세요 (고객에게 전달됩니다)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px] dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 dark:border-gray-600 dark:text-gray-300"
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
    </div>
  );
}
