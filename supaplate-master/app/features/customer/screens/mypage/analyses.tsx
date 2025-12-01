/**
 * 수면 분석 이력
 */
import type { Route } from "./+types/analyses";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { 
  ArrowLeftIcon, 
  MoonIcon,
  ChevronRightIcon,
  ImageIcon
} from "lucide-react";

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
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      navigate("/customer/login");
      return;
    }

    // 수면 분석은 현재 익명으로 저장되므로 localStorage에서 이력 관리
    // 추후 user_id 연동 시 서버에서 조회
    const savedAnalyses = localStorage.getItem("sleepAnalyses");
    if (savedAnalyses) {
      try {
        setAnalyses(JSON.parse(savedAnalyses));
      } catch (e) {
        console.error("분석 이력 파싱 오류:", e);
      }
    }
    setIsLoading(false);
  }, [navigate]);

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
                      {analysis.imagePreview ? (
                        <img 
                          src={analysis.imagePreview} 
                          alt="분석 이미지"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {analysis.ageInMonths ? `${analysis.ageInMonths}개월 아기` : "수면 환경 분석"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.createdAt 
                          ? new Date(analysis.createdAt).toLocaleDateString("ko-KR")
                          : "날짜 미상"}
                      </p>
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

