/**
 * Sleep Analysis Result Page (Customer)
 *
 * 점수 + 종합 분석 + 상세 내용 표시
 */
import type { Route } from "./+types/result";

import { ArrowLeft, AlertTriangle, CheckCircle, AlertCircle, Moon } from "lucide-react";
import { data, Link, useLoaderData, redirect } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [
    { title: `분석 결과 | 썬데이허그` },
  ];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  
  if (!id) {
    throw new Response("Analysis ID is required", { status: 400 });
  }

  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  // 분석 데이터 조회
  const { data: analysis, error: analysisError } = await supabase
    .from("sleep_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (analysisError || !analysis) {
    console.error("분석 조회 오류:", analysisError);
    throw new Response("Analysis not found", { status: 404 });
  }

  // 권한 체크
  if (user && analysis.user_id && analysis.user_id !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  // 피드백 항목 조회
  const { data: feedbackItems } = await supabase
    .from("sleep_analysis_feedback_items")
    .select("*")
    .eq("analysis_id", id)
    .order("item_number", { ascending: true });

  return data({
    analysis,
    feedbackItems: feedbackItems || [],
  });
}

// 영문 키 사용 (Gemini API 응답 형식)
const riskConfig = {
  High: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, iconColor: "text-red-500", label: "위험" },
  Medium: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle, iconColor: "text-amber-500", label: "주의" },
  Low: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle, iconColor: "text-emerald-500", label: "양호" },
  Info: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle, iconColor: "text-blue-500", label: "정보" },
};

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
    
    // 100점에서 감점: High -20, Medium -10
    score = Math.max(0, Math.min(100, 
      100 - (highCount * 20) - (mediumCount * 10)
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
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// 점수 등급
function getScoreGrade(score: number): string {
  if (score >= 90) return "매우 안전한 환경이에요! 🎉";
  if (score >= 75) return "안전한 환경이에요! 👍";
  if (score >= 60) return "괜찮지만 개선이 필요해요";
  if (score >= 40) return "주의가 필요한 환경이에요 ⚠️";
  return "즉시 개선이 필요해요! 🚨";
}

// 별점 렌더링
function renderStars(score: number) {
  const starCount = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-lg ${i < starCount ? "text-yellow-400" : "text-gray-200"}`}>
          ⭐
        </span>
      ))}
    </div>
  );
}

export default function ResultPage() {
  const { analysis, feedbackItems } = useLoaderData<typeof loader>();
  const { score, scoreComment, summaryText } = parseAnalysisData(analysis.summary, feedbackItems);

  // 이미지 URL 결정
  const imageUrl = analysis.image_url || 
    (analysis.image_base64?.startsWith("data:") 
      ? analysis.image_base64 
      : analysis.image_base64 
        ? `data:image/jpeg;base64,${analysis.image_base64}` 
        : null);

  // 위험도별 개수
  const highCount = feedbackItems.filter((i: any) => i.risk_level === "High").length;
  const mediumCount = feedbackItems.filter((i: any) => i.risk_level === "Medium").length;
  const lowCount = feedbackItems.filter((i: any) => ["Low", "Info"].includes(i.risk_level)).length;

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/mypage/analyses"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">수면 분석 결과</h1>
            <p className="text-sm text-gray-500">
              {analysis.created_at 
                ? new Date(analysis.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </p>
          </div>
        </div>

        {/* 점수 카드 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-6 text-white">
          <div className="flex items-center gap-6">
            {/* 점수 원형 */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={getScoreColor(score)}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 251} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{score}</span>
                <span className="text-white/50 text-xs">/ 100</span>
              </div>
            </div>
            
            {/* 점수 정보 */}
            <div className="flex-1">
              {renderStars(score)}
              <h2 className="text-lg font-bold mt-2 mb-1">
                {getScoreGrade(score)}
              </h2>
              {scoreComment && (
                <p className="text-white/70 text-sm">{scoreComment}</p>
              )}
            </div>
          </div>

          {/* 위험도 요약 */}
          <div className="flex gap-3 mt-5 pt-5 border-t border-white/10">
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 text-red-300 text-sm">
                <AlertTriangle className="w-4 h-4" />
                위험 {highCount}
              </span>
            )}
            {mediumCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4" />
                주의 {mediumCount}
              </span>
            )}
            {lowCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-sm">
                <CheckCircle className="w-4 h-4" />
                양호 {lowCount}
              </span>
            )}
          </div>
        </div>

        {/* 분석 이미지 */}
        {imageUrl && (
          <div className="bg-white rounded-2xl overflow-hidden mb-6 border border-gray-100">
            <img 
              src={imageUrl} 
              alt="수면 환경 사진"
              className="w-full object-cover max-h-80"
            />
          </div>
        )}

        {/* 종합 분석 */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">종합 분석</h2>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {summaryText}
          </p>
        </div>

        {/* 상세 분석 항목 */}
        {feedbackItems.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-4">📋 상세 분석</h2>
            
            <div className="space-y-4">
              {feedbackItems.map((item: any, index: number) => {
                const risk = riskConfig[item.risk_level as keyof typeof riskConfig] || riskConfig["Low"];
                const RiskIcon = risk.icon;
                
                return (
                  <div 
                    key={item.id || index} 
                    className={`rounded-xl p-4 border ${risk.color}`}
                  >
                    <div className="flex items-start gap-3">
                      <RiskIcon className={`w-5 h-5 ${risk.iconColor} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          <Badge variant="outline" className={`text-xs ${risk.color}`}>
                            {risk.label}
                          </Badge>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {item.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 새 분석 버튼 */}
        <div className="mt-8">
          <Link to="/customer/sleep/analyze" className="block">
            <div className="bg-[#1A1A1A] rounded-2xl p-5 flex items-center justify-center hover:bg-[#2A2A2A] transition-colors">
              <span className="text-white font-medium">새로운 분석 시작하기</span>
            </div>
          </Link>
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>AI 분석 결과는 참고용이며, 전문가 상담을 권장합니다.</p>
        </div>
      </div>
    </div>
  );
}
