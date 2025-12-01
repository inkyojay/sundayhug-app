/**
 * 수면 분석 이력 (Supabase Auth 통합)
 */
import type { Route } from "./+types/analyses";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  ArrowLeftIcon, 
  MoonIcon,
  ChevronRightIcon,
  ImageIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent } from "~/core/components/ui/card";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "수면 분석 이력 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  // 로그인 안 되어 있으면 로그인 페이지로
  if (!user) {
    throw redirect("/customer/login");
  }
  
  // user_id로 수면 분석 이력 조회
  const { data: analyses, error } = await supabase
    .from("sleep_analyses")
    .select("id, image_url, age_in_months, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("수면 분석 이력 조회 오류:", error);
  }

  return data({ analyses: analyses || [] });
}

export default function MypageAnalysesScreen() {
  const { analyses } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/customer/mypage">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
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
        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <MoonIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">분석 이력이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              아기의 수면 환경을 AI로 분석해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <Link key={analysis.id} to={`/customer/sleep/result/${analysis.id}`}>
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
            <p>로그인한 상태에서 분석한 결과만 표시됩니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
