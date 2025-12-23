/**
 * Sleep Analysis Page (Authenticated)
 *
 * Main page for authenticated users to analyze baby sleep environments.
 */
import type { Route } from "./+types/analyze";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { data, useFetcher, useRouteLoaderData } from "react-router";

import makeServerClient from "~/core/lib/supa-client.server";

import { AnalysisResult } from "../components/analysis-result";
import { StoryCardModal } from "../components/story-card-modal";
import { UploadForm, type UploadFormData } from "../components/upload-form";
import { analyzeSleepEnvironment } from "../lib/gemini.server";
import { calculateAgeInMonths } from "../lib/utils";
import { saveSleepAnalysis } from "../queries";
import type { AnalysisReport } from "../schema";

export const meta: Route.MetaFunction = () => {
  return [
    { title: `수면 환경 분석 | ${import.meta.env.VITE_APP_NAME}` },
    { name: "description", content: "AI로 아기의 수면 환경을 분석하고 안전 피드백을 받으세요." },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const { data: { user } } = await client.auth.getUser();
  
  return data({ userId: user?.id ?? null });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const imageBase64 = formData.get("imageBase64") as string;
  const imageMimeType = formData.get("imageMimeType") as string;
  const birthDate = formData.get("birthDate") as string;
  const phoneNumber = formData.get("phoneNumber") as string | null;
  const instagramId = formData.get("instagramId") as string | null;

  if (!imageBase64 || !birthDate) {
    return data({ error: "이미지와 생년월일은 필수입니다." }, { status: 400 });
  }

  try {
    const [client] = makeServerClient(request);
    const { data: { user } } = await client.auth.getUser();

    // Analyze with Gemini
    const report = await analyzeSleepEnvironment(imageBase64, imageMimeType, birthDate);
    const ageInMonths = calculateAgeInMonths(birthDate);

    // Save to database
    const analysisId = await saveSleepAnalysis(report, {
      birthDate,
      ageInMonths,
      imageBase64,
      phoneNumber,
      instagramId,
      userId: user?.id ?? null,
    });

    return data({
      success: true,
      report,
      analysisId,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return data(
      { error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export default function AnalyzePage() {
  const loaderData = useRouteLoaderData<typeof loader>("routes/features/sleep-analysis/screens/analyze");
  const fetcher = useFetcher<typeof action>();
  const [formData, setFormData] = useState<UploadFormData | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [storyCardData, setStoryCardData] = useState<{ url: string; score: number } | null>(null);

  const isLoading = fetcher.state === "submitting";
  const result = fetcher.data;
  const report = result && "report" in result ? result.report as AnalysisReport : null;
  const analysisId = result && "analysisId" in result ? result.analysisId as string : undefined;
  const error = result && "error" in result ? result.error as string : null;

  const handleSubmit = (data: UploadFormData) => {
    setFormData(data);
    
    const form = new FormData();
    form.append("imageBase64", data.imageBase64);
    form.append("imageMimeType", data.imageMimeType);
    form.append("birthDate", data.birthDate);
    if (data.phoneNumber) form.append("phoneNumber", data.phoneNumber);
    if (data.instagramId) form.append("instagramId", data.instagramId);

    fetcher.submit(form, { method: "post" });
  };

  const handleReset = () => {
    setFormData(null);
  };

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
        throw new Error(responseData.error || "스토리 카드 생성에 실패했습니다.");
      }
      
      const storyCardUrl = responseData.data.storyCardUrl as string;
      const score = responseData.data.score as number;
      
      // 모달로 이미지 표시 (모바일에서 길게 눌러서 저장)
      setStoryCardData({ url: storyCardUrl, score });
      
    } catch (err) {
      console.error("Story card error:", err);
      alert(err instanceof Error ? err.message : "카드 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingCard(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold">AI 아기 수면 환경 분석기</h1>
        <p className="text-muted-foreground mt-2">
          Gemini AI를 사용하여 아기의 수면 공간 안전을 점검하세요.
        </p>
      </header>

      <main>
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary h-12 w-12 animate-spin" />
            <p className="text-muted-foreground mt-4 font-semibold">
              AI가 이미지를 분석하고 있습니다. 잠시만 기다려주세요...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-destructive/10 border-destructive text-destructive mx-auto max-w-2xl rounded-lg border px-4 py-3">
            <strong className="font-bold">오류 발생: </strong>
            <span>{error}</span>
          </div>
        )}

        {/* Result or Upload Form */}
        {!isLoading && (
          report && formData ? (
            <AnalysisResult
              report={report}
              imagePreview={formData.imagePreview}
              analysisId={analysisId}
              onReset={handleReset}
              onShareStoryCard={handleShareStoryCard}
              isGeneratingCard={isGeneratingCard}
            />
          ) : (
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          )
        )}
      </main>

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

