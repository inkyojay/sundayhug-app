/**
 * Sleep Analysis Result Page
 *
 * Displays a specific analysis result by ID.
 */
import type { Route } from "./+types/result";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { data, Link, useLoaderData } from "react-router";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

import { AnalysisResult } from "../components/analysis-result";
import { getSleepAnalysis } from "../queries";
import type { AnalysisReport, FeedbackItem, Reference, RiskLevel } from "../schema";

export const meta: Route.MetaFunction = () => {
  return [
    { title: `분석 결과 | ${import.meta.env.VITE_APP_NAME}` },
  ];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  
  if (!id) {
    throw new Response("Analysis ID is required", { status: 400 });
  }

  const [client] = makeServerClient(request);
  const { data: { user } } = await client.auth.getUser();

  const result = await getSleepAnalysis(id);
  
  if (!result) {
    throw new Response("Analysis not found", { status: 404 });
  }

  // Check if user owns this analysis
  if (result.analysis.userId && result.analysis.userId !== user?.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  // Convert to AnalysisReport format
  const report: AnalysisReport = {
    summary: result.analysis.summary,
    feedbackItems: result.feedbackItems.map((item: FeedbackItem) => ({
      id: item.itemNumber,
      x: Number(item.x),
      y: Number(item.y),
      title: item.title,
      feedback: item.feedback,
      riskLevel: item.riskLevel as RiskLevel,
    })),
    references: result.references.map((ref: Reference) => ({
      title: ref.title,
      uri: ref.uri,
    })),
  };

  // Build image preview from URL or base64
  let imagePreview: string | null = null;
  if (result.analysis.imageUrl) {
    imagePreview = result.analysis.imageUrl;
  } else if (result.analysis.imageBase64) {
    // Check if it already has data URL prefix
    if (result.analysis.imageBase64.startsWith("data:")) {
      imagePreview = result.analysis.imageBase64;
    } else {
      imagePreview = `data:image/jpeg;base64,${result.analysis.imageBase64}`;
    }
  }

  return data({
    report,
    analysisId: id,
    imagePreview,
    createdAt: result.analysis.createdAt,
  });
}

export default function ResultPage() {
  const { report, analysisId, imagePreview, createdAt } = useLoaderData<typeof loader>();
  const [isDownloading, setIsDownloading] = useState(false);

  // Use placeholder if no image available
  const displayImage = imagePreview || "/images/placeholder.png";

  const handleDownloadSlides = async () => {
    if (!analysisId) return;
    
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
      
      // Download each slide as blob (직접 다운로드)
      const slideUrls = responseData.data.slideUrls as string[];
      
      for (let i = 0; i < slideUrls.length; i++) {
        const slideUrl = slideUrls[i];
        
        // Fetch the image as blob
        const imgResponse = await fetch(slideUrl);
        const blob = await imgResponse.blob();
        
        // Create blob URL and download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `수면분석-슬라이드-${i + 1}.png`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Release blob URL
        URL.revokeObjectURL(blobUrl);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      alert(`${slideUrls.length}장의 슬라이드가 사진 폴더에 저장되었습니다!`);
    } catch (err) {
      console.error("Download error:", err);
      alert(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/sleep/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            분석 이력으로 돌아가기
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold">분석 결과</h1>
        <p className="text-muted-foreground mt-1">
          {new Date(createdAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </header>

      <AnalysisResult
        report={report}
        imagePreview={displayImage}
        analysisId={analysisId}
        onReset={() => window.location.href = "/sleep"}
        onDownloadSlides={handleDownloadSlides}
        isDownloading={isDownloading}
      />
    </div>
  );
}

