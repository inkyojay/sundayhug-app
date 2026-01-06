/**
 * 내 보증서 상세 (밝은 테마)
 */
import type { Route } from "./+types/warranty-detail";

import { Link, useNavigate } from "react-router";
import { data, redirect } from "react-router";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Package,
  Wrench,
  ChevronRight,
  FileText
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "보증서 상세 | 썬데이허그" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  const [supabase] = makeServerClient(request);
  
  // 로그인 체크
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw redirect("/customer/login");
  }
  
  if (!id) {
    return data({ warranty: null, asRequests: [] });
  }
  
  // 해당 user의 보증서인지 확인
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("보증서 조회 오류:", error);
    return data({ warranty: null, asRequests: [] });
  }

  // A/S 이력 조회
  const { data: asRequests } = await supabase
    .from("as_requests")
    .select("*")
    .eq("warranty_id", id)
    .order("created_at", { ascending: false });

  return data({ warranty, asRequests: asRequests || [] });
}

const statusConfig = {
  pending: { 
    label: "승인 대기", 
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    badgeColor: "bg-yellow-100 text-yellow-700",
    iconBg: "bg-yellow-100",
    icon: Clock 
  },
  approved: { 
    label: "승인 완료", 
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    badgeColor: "bg-green-100 text-green-700",
    iconBg: "bg-green-100",
    icon: CheckCircle 
  },
  rejected: { 
    label: "거절됨", 
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    badgeColor: "bg-red-100 text-red-700",
    iconBg: "bg-red-100",
    icon: XCircle 
  },
  expired: { 
    label: "만료됨", 
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    badgeColor: "bg-gray-100 text-gray-600",
    iconBg: "bg-gray-100",
    icon: XCircle 
  },
};

export default function MypageWarrantyDetailScreen({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const warranty = loaderData?.warranty;
  const asRequests = loaderData?.asRequests || [];
  const { t } = useTranslation(["customer", "common"]);

  if (!warranty) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t("customer:warrantyDetail.notFound")}</p>
          <button
            onClick={() => navigate("/customer/mypage/warranties")}
            className="mt-4 text-[#FF6B35] font-medium"
          >
            {t("customer:warrantyDetail.backToList")}
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[warranty.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/customer/mypage/warranties")}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t("customer:warrantyDetail.title")}</h1>
        </div>

        {/* 상태 카드 */}
        <div className={`${status.bgColor} rounded-2xl p-6 mb-6 border border-gray-100`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${status.iconBg} rounded-full flex items-center justify-center`}>
              <StatusIcon className={`w-7 h-7 ${status.textColor}`} />
            </div>
            <div className="flex-1">
              <Badge className={`${status.badgeColor} px-3 py-1 rounded-full font-medium mb-1`}>
                {t(`customer:warrantyDetail.status.${warranty.status}`)}
              </Badge>
              <h2 className="text-xl font-bold text-gray-900">{warranty.product_name}</h2>
              {warranty.product_option && (
                <p className="text-sm text-gray-500 mt-0.5">{warranty.product_option}</p>
              )}
            </div>
          </div>
        </div>

        {/* 보증서 정보 */}
        <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            {t("customer:warrantyDetail.info.title")}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">{t("customer:warrantyDetail.info.warrantyNumber")}</span>
              <span className="font-mono text-gray-900 font-medium">{warranty.warranty_number}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">{t("customer:warrantyDetail.info.buyer")}</span>
              <span className="text-gray-900">{warranty.buyer_name || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">{t("customer:warrantyDetail.info.purchaseDate")}</span>
              <span className="text-gray-900">{warranty.order_date || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">{t("customer:warrantyDetail.info.purchaseChannel")}</span>
              <span className="text-gray-900">{warranty.sales_channel || "-"}</span>
            </div>
            {warranty.warranty_start && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-500">{t("customer:warrantyDetail.info.warrantyStart")}</span>
                  <span className="text-gray-900">{warranty.warranty_start}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">{t("customer:warrantyDetail.info.warrantyEnd")}</span>
                  <span className="text-gray-900">{warranty.warranty_end}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">{t("customer:warrantyDetail.info.registeredDate")}</span>
              <span className="text-gray-900">
                {warranty.created_at ? new Date(warranty.created_at).toLocaleDateString("ko-KR") : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* 제품 사진 */}
        {warranty.product_photo_url && (
          <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              {t("customer:warrantyDetail.productPhoto")}
            </h3>
            <img
              src={warranty.product_photo_url}
              alt={t("customer:warrantyDetail.productPhoto")}
              className="w-full rounded-xl object-cover max-h-64"
            />
          </div>
        )}

        {/* A/S 신청 버튼 */}
        {warranty.status === "approved" && (
          <Link to="/customer/mypage/as" className="block mb-4">
            <div className="bg-[#FF6B35] rounded-2xl p-5 flex items-center justify-between hover:bg-[#FF6B35]/90 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-semibold text-lg">{t("customer:warrantyDetail.requestAS")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* 거절 사유 */}
        {warranty.status === "rejected" && warranty.rejection_reason && (
          <div className="bg-red-50 rounded-2xl p-5 mb-4 border border-red-100">
            <h3 className="font-semibold text-red-700 mb-2">{t("customer:warrantyDetail.rejectionReason")}</h3>
            <p className="text-red-600 text-sm">{warranty.rejection_reason}</p>
          </div>
        )}

        {/* 승인 대기 안내 */}
        {warranty.status === "pending" && (
          <div className="bg-yellow-50 rounded-2xl p-5 mb-4 border border-yellow-100">
            <h3 className="font-semibold text-yellow-700 mb-2">{t("customer:warrantyDetail.pendingTitle")}</h3>
            <p className="text-yellow-600 text-sm">
              {t("customer:warrantyDetail.pendingDescription")}
            </p>
          </div>
        )}

        {/* A/S 이력 */}
        {asRequests.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gray-400" />
              {t("customer:warrantyDetail.asHistory")}
            </h3>
            <div className="space-y-3">
              {asRequests.map((req: any) => (
                <div key={req.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Wrench className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{req.request_type}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(req.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-gray-600">{req.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <a
            href="https://pf.kakao.com/_crxgDxj/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-[#FAE100] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            {t("customer:warrantyDetail.haveQuestions")}
          </a>
        </div>
      </div>
    </div>
  );
}
