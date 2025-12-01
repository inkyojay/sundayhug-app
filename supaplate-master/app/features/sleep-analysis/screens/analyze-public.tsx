/**
 * Sleep Analysis Page (Public/Customer)
 *
 * 고객용 수면 분석 페이지
 */
import type { Route } from "./+types/analyze-public";

import { useState, useEffect } from "react";
import { Link, useFetcher, data } from "react-router";
import { Loader2, Moon, Baby, Shield, Clock, Thermometer, Music } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
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

  // Supabase Auth로 로그인한 사용자 ID 가져오기
  const [client] = makeServerClient(request);
  const { data: { user } } = await client.auth.getUser();
  const userId = user?.id ?? null;

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
        userId,
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

// 수면 팁 데이터
const sleepTips = [
  {
    icon: Moon,
    title: "신생아 수면 시간",
    tip: "신생아는 하루 16~17시간의 수면이 필요해요. 낮과 밤의 구분 없이 2~4시간 간격으로 잠을 자는 것이 정상이에요.",
    color: "from-indigo-500 to-purple-600",
  },
  {
    icon: Shield,
    title: "안전한 수면 환경",
    tip: "아기는 단단하고 평평한 매트리스에서 등을 대고 자야 해요. 베개, 이불, 인형은 질식 위험이 있어요.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Thermometer,
    title: "적정 실내 온도",
    tip: "아기 방의 적정 온도는 20~22°C예요. 너무 덥거나 추우면 수면의 질이 떨어지고 영아돌연사 위험이 높아져요.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Clock,
    title: "수면 루틴의 중요성",
    tip: "생후 3개월부터 일정한 수면 루틴을 만들어주세요. 목욕 → 수유 → 자장가 순서로 규칙적인 패턴이 도움돼요.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Music,
    title: "백색소음 효과",
    tip: "엄마 배 속 소리와 비슷한 백색소음은 아기를 안정시켜요. 볼륨은 50dB 이하로 아기와 거리를 두고 사용하세요.",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Baby,
    title: "낮잠 vs 밤잠",
    tip: "생후 4개월이 지나면 낮잠을 줄이고 밤잠을 늘려주세요. 저녁 7~8시 취침이 성장 호르몬 분비에 좋아요.",
    color: "from-violet-500 to-purple-600",
  },
];

// 로딩 중 수면 팁 카드 컴포넌트
function LoadingWithTips() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % sleepTips.length);
    }, 4000); // 4초마다 전환

    return () => clearInterval(interval);
  }, []);

  const currentTip = sleepTips[currentTipIndex];
  const Icon = currentTip.icon;

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* 로딩 스피너와 메시지 */}
      <div className="flex items-center gap-3 mb-8">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-lg font-semibold">AI가 이미지를 분석하고 있습니다...</p>
      </div>

      {/* 수면 팁 카드 */}
      <div className="w-full max-w-md">
        <div 
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTip.color} p-6 text-white shadow-xl transition-all duration-500`}
        >
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white" />
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white" />
          </div>

          {/* 콘텐츠 */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-white/20 p-2">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{currentTip.title}</h3>
            </div>
            <p className="text-white/90 leading-relaxed text-sm">
              {currentTip.tip}
            </p>
          </div>
        </div>

        {/* 인디케이터 */}
        <div className="flex justify-center gap-2 mt-4">
          {sleepTips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentTipIndex 
                  ? "w-6 bg-primary" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* 안내 메시지 */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          💡 분석에는 약 10~20초가 소요됩니다
        </p>
      </div>
    </div>
  );
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
    
    // user_id는 서버에서 Supabase Auth 세션으로 자동 처리됨
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
        {/* Loading State with Sleep Tips */}
        {isLoading && <LoadingWithTips />}

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
