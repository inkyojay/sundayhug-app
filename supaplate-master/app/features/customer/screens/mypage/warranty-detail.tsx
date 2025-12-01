/**
 * 내 보증서 상세
 */
import type { Route } from "./+types/warranty-detail";

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { data } from "react-router";
import { 
  ArrowLeftIcon, 
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  PackageIcon,
  WrenchIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "보증서 상세 | 썬데이허그" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  
  if (!id) {
    return data({ warranty: null, asRequests: [] });
  }

  const [supabase] = makeServerClient(request);
  
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", id)
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
  pending: { label: "승인 대기", color: "bg-yellow-100 text-yellow-800", icon: ClockIcon },
  approved: { label: "승인 완료", color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
  rejected: { label: "거절됨", color: "bg-red-100 text-red-800", icon: XCircleIcon },
  expired: { label: "만료됨", color: "bg-gray-100 text-gray-800", icon: XCircleIcon },
};

export default function MypageWarrantyDetailScreen({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const params = useParams();
  const [warranty, setWarranty] = useState<any>(loaderData?.warranty);
  const [asRequests, setAsRequests] = useState<any[]>(loaderData?.asRequests || []);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      navigate("/customer/login");
    }
  }, [navigate]);

  if (!warranty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">보증서를 찾을 수 없습니다</p>
      </div>
    );
  }

  const status = statusConfig[warranty.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customer/mypage/warranties")}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">보증서 상세</h1>
        </div>

        {/* 상태 카드 */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${status.color}`}>
              <StatusIcon className="h-8 w-8" />
            </div>
            <Badge className={`${status.color} mb-2`}>
              {status.label}
            </Badge>
            <h2 className="text-lg font-semibold">{warranty.product_name}</h2>
            <p className="text-sm text-muted-foreground">{warranty.product_option}</p>
          </CardContent>
        </Card>

        {/* 보증서 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">보증서 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">보증서 번호</span>
              <span className="font-mono">{warranty.warranty_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">구매일</span>
              <span>{warranty.order_date || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">구매처</span>
              <span>{warranty.sales_channel || "-"}</span>
            </div>
            {warranty.warranty_start && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">보증 시작일</span>
                  <span>{warranty.warranty_start}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">보증 종료일</span>
                  <span>{warranty.warranty_end}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* A/S 신청 버튼 */}
        {warranty.status === "approved" && (
          <Link to={`/customer/as/${warranty.id}`}>
            <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/30">
              <CardContent className="flex items-center gap-3 p-4">
                <WrenchIcon className="h-6 w-6 text-orange-500" />
                <div className="flex-1">
                  <p className="font-medium">A/S 신청하기</p>
                  <p className="text-xs text-muted-foreground">수리, 교환, 환불 신청</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* A/S 이력 */}
        {asRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A/S 이력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {asRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <WrenchIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{req.request_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Badge variant="outline">{req.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

