/**
 * A/S 신청 이력
 */
import type { Route } from "./+types/as-list";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { data } from "react-router";
import { 
  ArrowLeftIcon, 
  WrenchIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent } from "~/core/components/ui/card";
import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "A/S 이력 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId");
  
  if (!memberId) {
    return data({ asRequests: [] });
  }

  const [supabase] = makeServerClient(request);
  
  // 회원의 보증서를 통해 A/S 이력 조회
  const { data: warranties } = await supabase
    .from("warranties")
    .select("id")
    .eq("member_id", memberId);

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
  received: { label: "접수됨", color: "bg-blue-100 text-blue-800", icon: ClockIcon },
  processing: { label: "처리 중", color: "bg-yellow-100 text-yellow-800", icon: ClockIcon },
  completed: { label: "완료", color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
  cancelled: { label: "취소됨", color: "bg-gray-100 text-gray-800", icon: XCircleIcon },
};

const typeLabels: Record<string, string> = {
  repair: "수리",
  exchange: "교환",
  refund: "환불",
  inquiry: "문의",
};

export default function MypageAsListScreen({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [asRequests, setAsRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      navigate("/customer/login");
      return;
    }

    fetchAsRequests(customerId);
  }, [navigate]);

  const fetchAsRequests = async (memberId: string) => {
    try {
      const response = await fetch(`/customer/mypage/as?memberId=${memberId}`);
      const result = await response.json();
      setAsRequests(result.asRequests || []);
    } catch (error) {
      console.error("A/S 이력 조회 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customer/mypage")}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">A/S 이력</h1>
        </div>

        {/* A/S 이력 목록 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            로딩 중...
          </div>
        ) : asRequests.length === 0 ? (
          <div className="text-center py-12">
            <WrenchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">A/S 신청 이력이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              보증서가 승인된 제품에 대해 A/S를 신청할 수 있습니다
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/customer/mypage/warranties")}
            >
              내 보증서 확인하기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {asRequests.map((req) => {
              const status = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.received;
              const StatusIcon = status.icon;
              
              return (
                <Card key={req.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {typeLabels[req.request_type] || req.request_type}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <h3 className="font-medium">
                          {req.warranties?.product_name || "제품"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {req.warranties?.product_option}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {req.issue_description}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      신청일: {new Date(req.created_at).toLocaleDateString("ko-KR")}
                    </p>
                    
                    {req.resolution && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded text-sm">
                        <p className="font-medium text-green-800 dark:text-green-200">처리 결과</p>
                        <p className="text-green-700 dark:text-green-300">{req.resolution}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

