/**
 * Sleep Analysis Result Page (Customer)
 *
 * 분석 페이지와 동일한 UI (사진, 종합분석, 세부분석, 다운로드)
 */
import type { Route } from "./+types/result";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { data, Link, useLoaderData } from "react-router";

import makeServerClient from "~/core/lib/supa-client.server";
import { AnalysisResult } from "../components/analysis-result";
import { StoryCardModal } from "../components/story-card-modal";
import type { AnalysisReport, RiskLevel } from "../schema";
import type { SleepAnalysisResult } from "../lib/sleep-analysis.server";

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

  // feedbackItems를 summary JSON에서 추출 (테이블이 아닌 JSON에 저장됨)
  let feedbackItems: SleepAnalysisResult["feedbackItems"] = [];
  if (analysis.summary) {
    try {
      const parsed = JSON.parse(analysis.summary);
      feedbackItems = parsed.feedbackItems || [];
    } catch {
      // 파싱 실패 시 빈 배열
    }
  }

  return data({
    analysisId: id,
    analysis,
    feedbackItems,
  });
}

// DB 데이터를 AnalysisReport 형태로 변환
function convertToReport(
  analysis: { summary: string },
  feedbackItems: SleepAnalysisResult["feedbackItems"]
): AnalysisReport {
  let safetyScore = 70;
  let summary = "";
  let scoreComment = "";
  let references: { title: string; uri: string }[] = [];
  
  // summary JSON 파싱
  if (analysis.summary) {
    try {
      const parsed = JSON.parse(analysis.summary);
      safetyScore = parsed.safetyScore || 70;
      summary = parsed.summary || "";
      scoreComment = parsed.scoreComment || "";
      references = parsed.references || [];
    } catch {
      summary = analysis.summary;
    }
  }
  
  // feedbackItems 변환 (id, x, y, riskLevel 모두 포함)
  const convertedFeedback = feedbackItems.map((item, index) => ({
    id: item.id || item.itemNumber || index + 1,
    x: typeof item.x === 'number' ? item.x : parseFloat(item.x) || 50,
    y: typeof item.y === 'number' ? item.y : parseFloat(item.y) || 50,
    title: item.title || "",
    feedback: item.feedback || "",
    riskLevel: (item.riskLevel || item.risk_level || "Low") as RiskLevel,
  }));
  
  return {
    safetyScore,
    summary,
    scoreComment,
    feedbackItems: convertedFeedback,
    references,
  };
}

export default function ResultPage() {
  const { t } = useTranslation(["sleep-analysis", "common"]);
  const { analysisId, analysis, feedbackItems } = useLoaderData<typeof loader>();
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [storyCardData, setStoryCardData] = useState<{ url: string; score: number } | null>(null);

  // 이미지 URL 결정 (image_url > image_base64 > 없음)
  const imageUrl = analysis.image_url || 
    (analysis.image_base64?.startsWith("data:") 
      ? analysis.image_base64 
      : analysis.image_base64 
        ? `data:image/jpeg;base64,${analysis.image_base64}` 
        : ""); // 이미지 없으면 빈 문자열

  // DB 데이터를 AnalysisReport로 변환
  const report = convertToReport(analysis, feedbackItems);

  // 스토리 카드 공유 (한 장짜리 인스타 스토리 카드)
  const handleShareStoryCard = async () => {
    if (!analysisId) return;
    
    setIsGeneratingCard(true);
    try {
      // 스토리 카드 API 호출
      const response = await fetch(`/api/sleep/${analysisId}/story-card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data?.storyCardUrl) {
        throw new Error(responseData.error || t("sleep-analysis:errors.analysisFailed"));
      }
      
      const storyCardUrl = responseData.data.storyCardUrl as string;
      const score = responseData.data.score as number;
        
      // 모달로 이미지 표시 (모바일에서 길게 눌러서 저장)
      setStoryCardData({ url: storyCardUrl, score });
      
    } catch (err) {
      console.error("Story card error:", err);
      alert(err instanceof Error ? err.message : t("sleep-analysis:errors.analysisFailed"));
    } finally {
      setIsGeneratingCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/customer/mypage/analyses"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("sleep-analysis:result.title")}</h1>
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

        {/* 분석 결과 - 동일한 컴포넌트 재사용 */}
        <AnalysisResult 
          report={report}
          imagePreview={imageUrl}
          analysisId={analysisId}
          onReset={() => window.location.href = "/customer/sleep/analyze"}
          onShareStoryCard={handleShareStoryCard}
          isGeneratingCard={isGeneratingCard}
        />

        {/* 하단 안내 */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>{t("sleep-analysis:result.disclaimer", { defaultValue: "AI 분석 결과는 참고용이며, 전문가 상담을 권장합니다." })}</p>
        </div>
      </div>

      {/* 스토리 카드 모달 */}
      {storyCardData && (
        <StoryCardModal
          imageUrl={storyCardData.url}
          score={storyCardData.score}
          onClose={() => setStoryCardData(null)}
        />
      )}
    </div>
  );
}
