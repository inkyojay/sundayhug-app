/**
 * A/S 신청 이력 (새로운 디자인)
 */
import type { Route } from "./+types/as-list";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "A/S 이력 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login");
  }
  
  // user_id로 보증서 조회 후 A/S 이력 조회
  const { data: warranties } = await supabase
    .from("warranties")
    .select("id")
    .eq("user_id", user.id);

  if (!warranties || warranties.length === 0) {
    return data({ asRequests: [] });
  }

  const warrantyIds = warranties.map(w => w.id);
  
  const { data: asRequests, error } = await supabase
    .from("as_requests")
    .select(`
      *,
      warranties (
        product_name,
        product_option,
        warranty_number
      )
    `)
    .in("warranty_id", warrantyIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("A/S 이력 조회 오류:", error);
    return data({ asRequests: [] });
  }

  return data({ asRequests: asRequests || [] });
}

const statusConfig = {
  received: { label: "접수됨", color: "bg-blue-100 text-blue-700", icon: Clock },
  processing: { label: "처리 중", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  completed: { label: "완료", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "취소됨", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

const typeLabels: Record<string, string> = {
  repair: "수리",
  exchange: "교환",
  refund: "환불",
  inquiry: "문의",
};

export default function MypageAsListScreen() {
  const { asRequests } = useLoaderData<typeof loader>();

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
          <h1 className="text-2xl font-bold text-gray-900">A/S 이력</h1>
        </div>

        {/* A/S 이력 목록 */}
        {asRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">A/S 신청 이력이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">
              보증서가 승인된 제품에 대해 A/S를 신청할 수 있습니다
            </p>
            <Link 
              to="/customer/mypage/warranties"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-white rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors border border-gray-200"
            >
              내 보증서 확인하기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {asRequests.map((req) => {
              const status = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.received;
              const StatusIcon = status.icon;
              
              return (
                <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-gray-600 border-gray-200">
                        {typeLabels[req.request_type] || req.request_type}
                      </Badge>
                      <Badge className={`${status.color} px-3 py-1 rounded-full font-medium`}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {req.warranties?.product_name || "제품"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {req.warranties?.product_option}
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {req.issue_description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      신청일: {new Date(req.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  
                  {req.resolution && (
                    <div className="mt-3 p-4 bg-green-50 rounded-xl">
                      <p className="font-medium text-green-800 text-sm mb-1">처리 결과</p>
                      <p className="text-green-700 text-sm">{req.resolution}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
