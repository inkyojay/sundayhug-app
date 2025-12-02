/**
 * 수면 분석 이력 (개선된 디자인)
 */
import type { Route } from "./+types/analyses";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  Moon,
  ChevronRight,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Baby
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
  
  // 분석 데이터 조회 (피드백 항목 개수 포함)
  const { data: analyses, error } = await supabase
    .from("sleep_analyses")
    .select(`
      id, 
      age_in_months, 
      summary, 
      created_at,
      birth_date
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("수면 분석 이력 조회 오류:", error);
  }

  // 각 분석의 피드백 항목 가져오기
  const analysesWithFeedback = await Promise.all(
    (analyses || []).map(async (analysis) => {
      const { data: feedbackItems } = await supabase
        .from("sleep_analysis_feedback_items")
        .select("risk_level")
        .eq("analysis_id", analysis.id);

      return {
        ...analysis,
        feedbackItems: feedbackItems || [],
      };
    })
  );

  // 아이 정보 가져오기
  const { data: babies } = await supabase
    .from("baby_profiles")
    .select("id, name, birth_date")
    .eq("user_id", user.id);

  return data({ 
    analyses: analysesWithFeedback,
    babies: babies || [],
  });
}

// summary JSON에서 점수 추출 또는 feedbackItems 기반 계산
function parseAnalysisData(
  summary: string | null, 
  feedbackItems: { risk_level: string }[]
): { 
  score: number; 
  scoreComment: string;
  summaryText: string;
} {
  let score: number | null = null;
  let scoreComment = "";
  let summaryText = summary || "";
  
  // JSON에서 점수 추출 시도
  if (summary) {
    try {
      const parsed = JSON.parse(summary);
      score = parsed.safetyScore || null;
      scoreComment = parsed.scoreComment || "";
      summaryText = parsed.summary || summary;
    } catch {
      // JSON이 아니면 그대로
    }
  }
  
  // 점수가 없으면 feedbackItems 기반으로 계산
  if (!score && feedbackItems.length > 0) {
    const highCount = feedbackItems.filter(i => i.risk_level === "High").length;
    const mediumCount = feedbackItems.filter(i => i.risk_level === "Medium").length;
    const lowCount = feedbackItems.filter(i => ["Low", "Info"].includes(i.risk_level)).length;
    
    // 100점에서 감점: High -20, Medium -10, Low -5, Info +2
    score = Math.max(0, Math.min(100, 
      100 - (highCount * 20) - (mediumCount * 10) - (lowCount * 5) + (lowCount * 2)
    ));
    
    // 기본 코멘트 생성
    if (score >= 90) scoreComment = "매우 안전한 수면 환경입니다!";
    else if (score >= 75) scoreComment = "전반적으로 안전합니다.";
    else if (score >= 60) scoreComment = "몇 가지 개선이 필요합니다.";
    else if (score >= 40) scoreComment = "개선이 필요한 부분이 있습니다.";
    else scoreComment = "즉시 개선이 필요합니다.";
  }
  
  return { 
    score: score || 70, // 기본값 70점
    scoreComment, 
    summaryText 
  };
}

// 점수에 따른 색상
function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-lime-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

// 점수에 따른 배경색
function getScoreBgColor(score: number): string {
  if (score >= 90) return "bg-emerald-50";
  if (score >= 75) return "bg-lime-50";
  if (score >= 60) return "bg-yellow-50";
  if (score >= 40) return "bg-orange-50";
  return "bg-red-50";
}

// 점수 등급
function getScoreGrade(score: number): string {
  if (score >= 90) return "매우 안전";
  if (score >= 75) return "안전";
  if (score >= 60) return "보통";
  if (score >= 40) return "주의";
  return "위험";
}

// 아기 나이 계산
function calculateAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  
  if (months < 1) return "신생아";
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years}세`;
  return `${years}세 ${remainingMonths}개월`;
}

export default function MypageAnalysesScreen() {
  const { analyses, babies } = useLoaderData<typeof loader>();

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
          <div className="flex flex-col gap-4">
            {analyses.map((analysis) => {
              const highCount = analysis.feedbackItems.filter((i: any) => i.risk_level === "High").length;
              const mediumCount = analysis.feedbackItems.filter((i: any) => i.risk_level === "Medium").length;
              const lowCount = analysis.feedbackItems.filter((i: any) => ["Low", "Info"].includes(i.risk_level)).length;
              const { score, scoreComment, summaryText } = parseAnalysisData(analysis.summary, analysis.feedbackItems);
              
              return (
                <Link key={analysis.id} to={`/customer/sleep/result/${analysis.id}`} className="block">
                  <div className="bg-white rounded-2xl p-5 hover:shadow-lg transition-all group border border-gray-100">
                    <div className="flex gap-4">
                      {/* 점수 원형 */}
                      <div className={`w-16 h-16 rounded-2xl ${getScoreBgColor(score)} flex flex-col items-center justify-center flex-shrink-0`}>
                        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
                        <span className="text-[10px] text-gray-400">점</span>
                      </div>
                      
                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                            {getScoreGrade(score)}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {analysis.age_in_months ? `${analysis.age_in_months}개월` : calculateAge(analysis.birth_date)}
                          </span>
                        </div>
                        
                        {/* 날짜 */}
                        <p className="text-xs text-gray-400 mb-2">
                          {analysis.created_at 
                            ? new Date(analysis.created_at).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })
                            : ""}
                        </p>
                        
                        {/* 위험도 요약 */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {highCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              위험 {highCount}
                            </span>
                          )}
                          {mediumCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              주의 {mediumCount}
                            </span>
                          )}
                          {lowCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs">
                              <CheckCircle className="w-3 h-3" />
                              양호 {lowCount}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 화살표 */}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
                    </div>
                  </div>
                </Link>
              );
            })}
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
