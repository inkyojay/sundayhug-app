/**
 * 관리자용 후기 인증 관리 페이지
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
  User,
  Calendar,
  Image as ImageIcon,
  Filter,
  RefreshCw
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

  let query = adminClient
    .from("review_submissions")
    .select(`
      *,
      profiles:user_id (
        name,
        email,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: submissions, error } = await query;

  if (error) {
    console.error("후기 목록 조회 오류:", error);
  }

  // 통계
  const { data: stats } = await adminClient
    .from("review_submissions")
    .select("status");

  const counts = {
    pending: stats?.filter(s => s.status === "pending").length || 0,
    approved: stats?.filter(s => s.status === "approved").length || 0,
    rejected: stats?.filter(s => s.status === "rejected").length || 0,
    total: stats?.length || 0,
  };

  return data({ 
    submissions: submissions || [],
    statusFilter,
    counts,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const submissionId = formData.get("submissionId") as string;
  const action = formData.get("action") as string;
  const rejectionReason = formData.get("rejectionReason") as string;

  if (!submissionId || !action) {
    return { success: false, error: "필수 정보가 누락되었습니다." };
  }

  const updateData: any = {
    reviewed_at: new Date().toISOString(),
  };

  if (action === "approve") {
    updateData.status = "approved";
  } else if (action === "reject") {
    updateData.status = "rejected";
    updateData.rejection_reason = rejectionReason || "조건 미충족";
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
    message: action === "approve" ? "승인되었습니다." : "반려되었습니다." 
  };
}

const reviewTypeConfig = {
  momcafe: { 
    name: "맘카페", 
    icon: MessageSquare, 
    color: "bg-pink-500",
    badge: "bg-pink-100 text-pink-700"
  },
  instagram: { 
    name: "인스타그램", 
    icon: Instagram, 
    color: "bg-purple-500",
    badge: "bg-purple-100 text-purple-700"
  },
  blog: { 
    name: "블로그", 
    icon: FileText, 
    color: "bg-green-500",
    badge: "bg-green-100 text-green-700"
  },
};

const statusConfig = {
  pending: { 
    label: "대기중", 
    color: "bg-yellow-100 text-yellow-700", 
    icon: Clock 
  },
  approved: { 
    label: "승인됨", 
    color: "bg-green-100 text-green-700", 
    icon: CheckCircle 
  },
  rejected: { 
    label: "반려됨", 
    color: "bg-red-100 text-red-700", 
    icon: XCircle 
  },
};

export default function AdminReviewListScreen() {
  const { submissions, statusFilter, counts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetcherData = fetcher.data as any;

  const handleApprove = (id: string) => {
    if (!confirm("이 후기를 승인하시겠습니까?")) return;
    
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">후기 인증 관리</h1>
        <p className="text-gray-500">고객이 신청한 후기를 검토하고 승인/반려 처리합니다.</p>
      </div>

      {/* 알림 */}
      {fetcherData?.success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700">✅ {fetcherData.message}</p>
        </div>
      )}
      {fetcherData?.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700">❌ {fetcherData.error}</p>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">전체</p>
          <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700">대기중</p>
          <p className="text-2xl font-bold text-yellow-700">{counts.pending}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">승인됨</p>
          <p className="text-2xl font-bold text-green-700">{counts.approved}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-sm text-red-700">반려됨</p>
          <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-2">
          {[
            { value: "pending", label: "대기중" },
            { value: "approved", label: "승인됨" },
            { value: "rejected", label: "반려됨" },
            { value: "all", label: "전체" },
          ].map((filter) => (
            <a
              key={filter.value}
              href={`?status=${filter.value}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </a>
          ))}
        </div>
        
        <a 
          href="?status=pending"
          className="ml-auto flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </a>
      </div>

      {/* 목록 */}
      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">해당 상태의 후기가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub: any) => {
            const typeConfig = reviewTypeConfig[sub.review_type as keyof typeof reviewTypeConfig];
            const status = statusConfig[sub.status as keyof typeof statusConfig];
            const TypeIcon = typeConfig?.icon || MessageSquare;
            const StatusIcon = status?.icon || Clock;
            const profile = sub.profiles;
            
            return (
              <div 
                key={sub.id} 
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  {/* 왼쪽: 유형 및 상태 */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeConfig?.color || "bg-gray-100"}`}>
                      <TypeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={typeConfig?.badge}>
                          {typeConfig?.name || sub.review_type}
                        </Badge>
                        <Badge className={status?.color}>
                          <StatusIcon className="w-3.5 h-3.5 mr-1" />
                          {status?.label}
                        </Badge>
                      </div>
                      {sub.product_name && (
                        <p className="text-sm text-gray-600">제품: {sub.product_name}</p>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 액션 버튼 */}
                  {sub.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(sub.id)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        disabled={fetcher.state !== "idle"}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRejectModal(sub.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={fetcher.state !== "idle"}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        반려
                      </Button>
                    </div>
                  )}
                </div>

                {/* 상세 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 신청자 정보 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{profile?.name || "이름 없음"}</span>
                    {profile?.phone && (
                      <span className="text-gray-400">({profile.phone})</span>
                    )}
                  </div>
                  
                  {/* 신청일 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(sub.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                </div>

                {/* 후기 링크 */}
                <div className="mb-4">
                  <a 
                    href={sub.review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    후기 링크 열기
                  </a>
                </div>

                {/* 스크린샷 */}
                {sub.screenshot_urls && sub.screenshot_urls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <ImageIcon className="w-4 h-4" />
                      첨부 스크린샷
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {sub.screenshot_urls.map((url: string, idx: number) => (
                        <a 
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={url} 
                            alt={`스크린샷 ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 반려 사유 (반려된 경우) */}
                {sub.status === "rejected" && sub.rejection_reason && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>반려 사유:</strong> {sub.rejection_reason}
                    </p>
                  </div>
                )}

                {/* 검토 정보 */}
                {sub.reviewed_at && (
                  <p className="text-xs text-gray-400 mt-3">
                    검토일: {new Date(sub.reviewed_at).toLocaleString("ko-KR")}
                  </p>
                )}
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">후기 반려</h3>
            
            <div className="mb-4">
              <label className="text-sm text-gray-700 font-medium mb-2 block">
                반려 사유
              </label>
              <Textarea
                placeholder="반려 사유를 입력해주세요 (고객에게 전달됩니다)"
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
    </div>
  );
}

