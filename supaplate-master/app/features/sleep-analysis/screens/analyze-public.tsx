/**
 * Sleep Analysis Page (Public/Customer)
 *
 * 고객용 수면 분석 페이지
 */
import type { Route } from "./+types/analyze-public";

import { useState } from "react";
import { Link, useFetcher, data } from "react-router";
import { Loader2 } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { UploadForm } from "../components/upload-form";
import { AnalysisResult } from "../components/analysis-result";
import { analyzeSleepEnvironment } from "../lib/gemini.server";
import { saveSleepAnalysis, calculateAgeInMonths } from "../lib/sleep-analysis.server";
import type { AnalysisReport, UploadFormData } from "../types";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "수면 환경 분석 | 썬데이허그" },
    { name: "description", content: "AI가 아기 수면 환경을 분석해드립니다." },
  ];
};

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
    // Analyze with Gemini
    const report = await analyzeSleepEnvironment(imageBase64, imageMimeType, birthDate);

    // Try to save to database (optional - don't fail if DB is not ready)
    let analysisId: string | undefined;
    try {
      const ageInMonths = calculateAgeInMonths(birthDate);
      analysisId = await saveSleepAnalysis(report, {
        birthDate,
        ageInMonths,
        imageBase64,
        phoneNumber,
        instagramId,
        userId: null,
      });
    } catch (dbError) {
      console.warn("Failed to save to database (continuing):", dbError);
    }

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

export default function AnalyzePublicPage() {
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

  const handleDownloadSlides = async () => {
    if (!analysisId) {
      alert("분석 ID가 없어 슬라이드를 생성할 수 없습니다.");
      return;
    }
    
    setIsDownloading(true);
    try {
      // Generate slides via API
      const response = await fetch(`/api/sleep/${analysisId}/slides`, {
        method: "POST",
      });
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data?.slideUrls) {
        throw new Error(responseData.error || "슬라이드 생성에 실패했습니다.");
      }
      
      // Download each slide as blob
      const slideUrls = responseData.data.slideUrls as string[];
      
      for (let i = 0; i < slideUrls.length; i++) {
        const slideUrl = slideUrls[i];
        
        const imgResponse = await fetch(slideUrl);
        const blob = await imgResponse.blob();
        
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `수면분석-슬라이드-${i + 1}.png`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(blobUrl);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      alert(`${slideUrls.length}장의 슬라이드가 저장되었습니다!`);
    } catch (err) {
      console.error("Download error:", err);
      alert(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">AI 수면 환경 분석기</h1>
        <p className="text-muted-foreground mt-2">
          아기의 수면 공간 사진을 올려주세요
        </p>
      </header>

      <main>
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary h-12 w-12 animate-spin" />
            <p className="text-muted-foreground mt-4 font-semibold">
              AI가 이미지를 분석하고 있습니다...
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
