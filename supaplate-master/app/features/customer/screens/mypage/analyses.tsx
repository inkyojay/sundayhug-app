/**
 * 수면 분석 이력 (새로운 디자인)
 */
import type { Route } from "./+types/analyses";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  Moon,
  ChevronRight,
  Plus
} from "lucide-react";

import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "수면 분석 이력 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login");
  }
  
  const { data: analyses, error } = await supabase
    .from("sleep_analyses")
    .select("id, age_in_months, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("수면 분석 이력 조회 오류:", error);
  }

  return data({ analyses: analyses || [] });
}

// summary JSON 파싱 헬퍼 함수
function parseSummary(summary: string | null): string {
  if (!summary) return "";
  
  try {
    // JSON 형태인 경우 파싱
    const parsed = JSON.parse(summary);
    return parsed.summary || summary;
  } catch {
    // JSON이 아니면 그대로 반환
    return summary;
  }
}

export default function MypageAnalysesScreen() {
  const { analyses } = useLoaderData<typeof loader>();

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
          <h1 className="text-2xl font-bold text-gray-900">수면 분석 이력</h1>
        </div>

        {/* 새 분석 버튼 */}
        <Link to="/customer/sleep/analyze" className="block mb-6">
          <div className="bg-[#1A1A1A] rounded-2xl p-5 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">새로운 분석 시작</p>
                <p className="text-gray-400 text-sm">AI가 수면 환경을 분석해드려요</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 분석 이력 목록 */}
        {analyses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Moon className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">분석 이력이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">
              아기의 수면 환경을 AI로 분석해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <Link key={analysis.id} to={`/customer/sleep/result/${analysis.id}`}>
                <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-all group border border-gray-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                    <Moon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {analysis.age_in_months ? `${analysis.age_in_months}개월 아기` : "수면 환경 분석"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {analysis.created_at 
                        ? new Date(analysis.created_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })
                        : "날짜 미상"}
                    </p>
                    {analysis.summary && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-1">
                        {parseSummary(analysis.summary)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="mt-8 p-4 bg-white/60 rounded-2xl border border-gray-200/50 text-center">
          <p className="text-sm text-gray-400">
            로그인한 상태에서 분석한 결과만 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
