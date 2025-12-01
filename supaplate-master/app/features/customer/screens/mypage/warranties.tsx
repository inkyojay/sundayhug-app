/**
 * 내 보증서 목록
 */
import type { Route } from "./+types/warranties";

import { useEffect, useState } from "react";
import { Link, useNavigate, useRouteLoaderData } from "react-router";
import { 
  ArrowLeftIcon, 
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon
} from "lucide-react";

import { createClient } from "@supabase/supabase-js";
import { Button } from "~/core/components/ui/button";
import { Card, CardContent } from "~/core/components/ui/card";
import { Badge } from "~/core/components/ui/badge";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "내 보증서 | 썬데이허그" },
  ];
}

const statusConfig = {
  pending: { label: "승인 대기", color: "bg-yellow-100 text-yellow-800", icon: ClockIcon },
  approved: { label: "승인 완료", color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
  rejected: { label: "거절됨", color: "bg-red-100 text-red-800", icon: XCircleIcon },
  expired: { label: "만료됨", color: "bg-gray-100 text-gray-800", icon: XCircleIcon },
};

export default function MypageWarrantiesScreen() {
  const navigate = useNavigate();
  const rootData = useRouteLoaderData("root") as { env?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string } } | undefined;
  const [warranties, setWarranties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      navigate("/customer/login");
      return;
    }

    // 클라이언트에서 직접 Supabase 호출
    if (rootData?.env) {
      fetchWarranties(customerId, rootData.env);
    }
  }, [navigate, rootData]);

  const fetchWarranties = async (
    memberId: string, 
    env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
  ) => {
    try {
      // 클라이언트용 Supabase 인스턴스 생성
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

      const { data, error } = await supabase
        .from("warranties")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("보증서 조회 오류:", error);
        setWarranties([]);
      } else {
        setWarranties(data || []);
      }
    } catch (error) {
      console.error("보증서 조회 오류:", error);
      setWarranties([]);
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
          <h1 className="text-xl font-semibold">내 보증서</h1>
        </div>

        {/* 보증서 등록 버튼 */}
        <Link to="/customer/warranty">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldCheckIcon className="h-6 w-6" />
              <span className="font-medium">새 보증서 등록하기</span>
              <ChevronRightIcon className="h-5 w-5 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        {/* 보증서 목록 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            로딩 중...
          </div>
        ) : warranties.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">등록된 보증서가 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
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
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{warranty.product_name || "제품"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {warranty.product_option}
                          </p>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>보증서 번호: {warranty.warranty_number}</p>
                        {warranty.warranty_start && (
                          <p>
                            보증 기간: {warranty.warranty_start} ~ {warranty.warranty_end}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

