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
  const [isDownloading, setIsDownloading] = useState(false);

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

  // 카드뉴스 이미지 다운로드 (Placid API 사용)
  const handleDownloadSlides = async () => {
    if (!analysisId) return;
    
    setIsDownloading(true);
    try {
      // 아기 이름 가져오기
      const babyName = formData?.newBabyName || "우리 아기";
      
      // 새 카드뉴스 API 호출 (Placid)
      const response = await fetch(`/api/sleep/${analysisId}/cardnews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ babyName }),
      });
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data?.slideUrls) {
        if (responseData.error?.includes("Card news text not generated")) {
          alert("이 분석 결과는 카드뉴스 생성을 지원하지 않습니다.\n새로 분석을 진행해주세요.");
          return;
        }
        throw new Error(responseData.error || "카드뉴스 이미지 생성에 실패했습니다.");
      }
      
      const slideUrls = responseData.data.slideUrls as string[];
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      for (let i = 0; i < slideUrls.length; i++) {
        const slideUrl = slideUrls[i];
        const imgResponse = await fetch(slideUrl);
        const blob = await imgResponse.blob();
        const fileName = `카드뉴스-${i + 1}.png`;
        
        // 모바일: Web Share API 시도
        if (isMobile && navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file] });
              continue;
            } catch { /* 공유 취소 시 일반 다운로드 */ }
          }
        }
        
        // 일반 다운로드
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!isMobile) {
        alert(`📸 ${slideUrls.length}장의 카드뉴스가 저장되었습니다!`);
      }
    } catch (err) {
      console.error("Card news download error:", err);
      alert(err instanceof Error ? err.message : "카드뉴스 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
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
              onDownloadSlides={handleDownloadSlides}
              isDownloading={isDownloading}
            />
          ) : (
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          )
        )}
      </main>
    </div>
  );
}

