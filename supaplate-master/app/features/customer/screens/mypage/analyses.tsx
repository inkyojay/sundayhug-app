/**
 * 수면 분석 이력
 */
import type { Route } from "./+types/analyses";

import { useEffect, useState } from "react";
import { Link, useNavigate, useRouteLoaderData } from "react-router";
import { 
  ArrowLeftIcon, 
  MoonIcon,
  ChevronRightIcon,
  ImageIcon
} from "lucide-react";

import { createClient } from "@supabase/supabase-js";
import { Button } from "~/core/components/ui/button";
import { Card, CardContent } from "~/core/components/ui/card";
import { Badge } from "~/core/components/ui/badge";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "수면 분석 이력 | 썬데이허그" },
  ];
}

export default function MypageAnalysesScreen() {
  const navigate = useNavigate();
  const rootData = useRouteLoaderData("root") as { env?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string } } | undefined;
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    const customerPhone = localStorage.getItem("customerPhone");
    
    console.log("📱 Analyses page - customerId:", customerId, "phone:", customerPhone, "rootData:", rootData);
    
    if (!customerId) {
      navigate("/customer/login");
      return;
    }

    // DB에서 수면 분석 이력 조회 (전화번호 기준)
    if (customerPhone) {
      // 환경변수 직접 사용 (VITE_ 접두사)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || rootData?.env?.SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || rootData?.env?.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        fetchAnalyses(customerPhone, { SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: supabaseKey });
      } else {
        console.error("Supabase 환경변수가 없습니다");
        setIsLoading(false);
      }
    } else {
      // 전화번호가 없으면 localStorage에서 가져오기 (폴백)
      const savedAnalyses = localStorage.getItem("sleepAnalyses");
      if (savedAnalyses) {
        try {
          setAnalyses(JSON.parse(savedAnalyses));
        } catch (e) {
          console.error("분석 이력 파싱 오류:", e);
        }
      }
      setIsLoading(false);
    }
  }, [navigate, rootData]);

  const fetchAnalyses = async (
    phone: string,
    env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
  ) => {
    try {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

      // 전화번호 정규화 (하이픈 제거)
      const normalizedPhone = phone.replace(/-/g, "");

      const { data, error } = await supabase
        .from("sleep_analyses")
        .select("id, image_url, age_in_months, summary, created_at")
        .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${phone}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("수면 분석 이력 조회 오류:", error);
        setAnalyses([]);
      } else {
        setAnalyses(data || []);
      }
    } catch (error) {
      console.error("수면 분석 이력 조회 오류:", error);
      setAnalyses([]);
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
          <h1 className="text-xl font-semibold">수면 분석 이력</h1>
        </div>

        {/* 새 분석 버튼 */}
        <Link to="/customer/sleep">
          <Card className="bg-purple-500 text-white">
            <CardContent className="flex items-center gap-3 p-4">
              <MoonIcon className="h-6 w-6" />
              <span className="font-medium">새로운 수면 환경 분석하기</span>
              <ChevronRightIcon className="h-5 w-5 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        {/* 분석 이력 목록 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            로딩 중...
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-12">
            <MoonIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">분석 이력이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              아기의 수면 환경을 AI로 분석해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis, index) => (
              <Link key={analysis.id || index} to={`/customer/sleep/result/${analysis.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {analysis.image_url ? (
                        <img 
                          src={analysis.image_url} 
                          alt="분석 이미지"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {analysis.age_in_months ? `${analysis.age_in_months}개월 아기` : "수면 환경 분석"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.created_at 
                          ? new Date(analysis.created_at).toLocaleDateString("ko-KR")
                          : "날짜 미상"}
                      </p>
                      {analysis.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {analysis.summary}
                        </p>
                      )}
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* 안내 메시지 */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <p>수면 분석 결과는 기기에 저장됩니다.</p>
            <p>다른 기기에서 확인하려면 결과 URL을 저장해주세요.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

