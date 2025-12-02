/**
 * 내 보증서 목록 (새로운 디자인)
 */
import type { Route } from "./+types/warranties";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Plus
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "내 보증서 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login");
  }
  
  // user_id로 보증서 조회
  const { data: warranties, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("보증서 조회 오류:", error);
  }

  return data({ warranties: warranties || [] });
}

const statusConfig = {
  pending: { label: "승인 대기", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "승인 완료", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "거절됨", color: "bg-red-100 text-red-700", icon: XCircle },
  expired: { label: "만료됨", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

export default function MypageWarrantiesScreen() {
  const { warranties } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/mypage"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">내 보증서</h1>
        </div>

        {/* 보증서 등록 버튼 */}
        <Link to="/customer/warranty" className="block mb-6">
          <div className="bg-[#FF6B35] rounded-2xl p-5 flex items-center justify-between hover:bg-[#FF6B35]/90 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">새 보증서 등록</p>
                <p className="text-white/80 text-sm">제품 구매 후 보증서를 등록하세요</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 보증서 목록 */}
        {warranties.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">등록된 보증서가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">
              제품을 구매하셨다면 보증서를 등록해주세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {warranties.map((warranty) => {
              const status = statusConfig[warranty.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <Link key={warranty.id} to={`/customer/mypage/warranty/${warranty.id}`}>
                  <div className="bg-white rounded-2xl p-5 hover:shadow-md transition-all group border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {warranty.product_name || "제품"}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {warranty.product_option}
                        </p>
                      </div>
                      <Badge className={`${status.color} px-3 py-1 rounded-full font-medium`}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-400 space-y-0.5">
                        <p>보증서 번호: {warranty.warranty_number}</p>
                        {warranty.warranty_start && (
                          <p>
                            보증 기간: {warranty.warranty_start} ~ {warranty.warranty_end}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
