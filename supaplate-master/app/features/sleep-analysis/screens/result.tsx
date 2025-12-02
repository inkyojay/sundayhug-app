/**
 * Sleep Analysis Result Page (Customer)
 *
 * 사진 + 종합 분석 + 상세 내용만 표시
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

const riskConfig = {
  높음: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle, iconColor: "text-red-500" },
  중간: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertCircle, iconColor: "text-yellow-500" },
  낮음: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, iconColor: "text-green-500" },
};

export default function ResultPage() {
  const { analysis, feedbackItems } = useLoaderData<typeof loader>();

  // 이미지 URL 결정
  const imageUrl = analysis.image_url || 
    (analysis.image_base64?.startsWith("data:") 
      ? analysis.image_base64 
      : analysis.image_base64 
        ? `data:image/jpeg;base64,${analysis.image_base64}` 
        : null);

  // summary 파싱 (JSON 형식일 수 있음)
  let summaryText = analysis.summary;
  try {
    const parsed = JSON.parse(analysis.summary);
    summaryText = parsed.summary || analysis.summary;
  } catch {
    // JSON이 아니면 그대로 사용
  }

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
                const risk = riskConfig[item.risk_level as keyof typeof riskConfig] || riskConfig["낮음"];
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
                            위험도: {item.risk_level}
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
