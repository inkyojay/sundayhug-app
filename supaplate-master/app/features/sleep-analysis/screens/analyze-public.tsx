/**
 * Sleep Analysis Page (새로운 디자인)
 */
import type { Route } from "./+types/analyze-public";

import { useState, useEffect } from "react";
import { Link, useFetcher, useLoaderData, data } from "react-router";
import { Loader2, Moon, Baby, Shield, Clock, Thermometer, Music, ArrowLeft } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import { UploadForm } from "../components/upload-form";
import { AnalysisResult } from "../components/analysis-result";
import { analyzeSleepEnvironment } from "../lib/gemini.server";
import { saveSleepAnalysis, calculateAgeInMonths } from "../lib/sleep-analysis.server";
import type { AnalysisReport } from "../schema";
import type { UploadFormData } from "../types";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "수면 환경 분석 | 썬데이허그" },
    { name: "description", content: "AI가 아기 수면 환경을 분석해드립니다." },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  let defaultPhoneNumber = "";
  let babies: { id: string; name: string; birth_date: string; gender: string | null }[] = [];
  
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();
    
    defaultPhoneNumber = profile?.phone || "";
    
    // 등록된 아이 정보 가져오기
    const { data: babyProfiles } = await supabase
      .from("baby_profiles")
      .select("id, name, birth_date, gender")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    
    babies = babyProfiles || [];
  }
  
  return data({ 
    isLoggedIn: !!user,
    userId: user?.id || null,
    defaultPhoneNumber,
    babies,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const imageBase64 = formData.get("imageBase64") as string;
  const imageMimeType = formData.get("imageMimeType") as string;
  const birthDate = formData.get("birthDate") as string;
  const phoneNumber = formData.get("phoneNumber") as string | null;
  const instagramId = formData.get("instagramId") as string | null;
  
  // 새 아이 정보 (프로필에 저장할 때 사용)
  const newBabyName = formData.get("newBabyName") as string | null;
  const newBabyGender = formData.get("newBabyGender") as string | null;

  if (!imageBase64 || !birthDate) {
    return data({ error: "이미지와 생년월일은 필수입니다." }, { status: 400 });
  }

  const [client] = makeServerClient(request);
  const { data: { user } } = await client.auth.getUser();
  const userId = user?.id ?? null;

  // 로그인한 사용자의 경우 전화번호를 프로필에 저장
  if (userId && phoneNumber) {
    try {
      await client
        .from("profiles")
        .update({ 
          phone: phoneNumber.replace(/-/g, ""),
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);
    } catch (profileError) {
      console.warn("Failed to update phone number in profile:", profileError);
    }
  }
  
  // 새 아이 정보가 있으면 baby_profiles에 저장
  if (userId && newBabyName && birthDate) {
    try {
      await client
        .from("baby_profiles")
        .insert({
          user_id: userId,
          name: newBabyName,
          birth_date: birthDate,
          gender: newBabyGender || null,
        });
    } catch (babyError) {
      console.warn("Failed to save baby profile:", babyError);
    }
  }

  try {
    const report = await analyzeSleepEnvironment(imageBase64, imageMimeType, birthDate);

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
    bgColor: "bg-indigo-50",
  },
  {
    icon: Shield,
    title: "안전한 수면 환경",
    tip: "아기는 단단하고 평평한 매트리스에서 등을 대고 자야 해요. 베개, 이불, 인형은 질식 위험이 있어요.",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
  },
  {
    icon: Thermometer,
    title: "적정 실내 온도",
    tip: "아기 방의 적정 온도는 20~22°C예요. 너무 덥거나 추우면 수면의 질이 떨어지고 영아돌연사 위험이 높아져요.",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
  },
  {
    icon: Clock,
    title: "수면 루틴의 중요성",
    tip: "생후 3개월부터 일정한 수면 루틴을 만들어주세요. 목욕 → 수유 → 자장가 순서로 규칙적인 패턴이 도움돼요.",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Music,
    title: "백색소음 효과",
    tip: "엄마 배 속 소리와 비슷한 백색소음은 아기를 안정시켜요. 볼륨은 50dB 이하로 아기와 거리를 두고 사용하세요.",
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
  },
  {
    icon: Baby,
    title: "낮잠 vs 밤잠",
    tip: "생후 4개월이 지나면 낮잠을 줄이고 밤잠을 늘려주세요. 저녁 7~8시 취침이 성장 호르몬 분비에 좋아요.",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
  },
];

// 로딩 중 수면 팁 카드 컴포넌트
function LoadingWithTips() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % sleepTips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentTip = sleepTips[currentTipIndex];
  const Icon = currentTip.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* 로딩 스피너와 메시지 */}
      <div className="flex items-center gap-3 mb-10">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">AI가 분석 중입니다...</p>
      </div>

      {/* 수면 팁 카드 */}
      <div className="w-full max-w-md">
        <div 
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentTip.color} p-8 text-white shadow-xl transition-all duration-500`}
        >
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
            <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white" />
          </div>

          {/* 콘텐츠 */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="rounded-2xl bg-white/20 p-3">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold">{currentTip.title}</h3>
            </div>
            <p className="text-white/90 leading-relaxed">
              {currentTip.tip}
            </p>
          </div>
        </div>

        {/* 인디케이터 */}
        <div className="flex justify-center gap-2 mt-6">
          {sleepTips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentTipIndex 
                  ? "w-8 bg-[#FF6B35]" 
                  : "w-2.5 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        {/* 안내 메시지 */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
          💡 분석에는 약 10~20초가 소요됩니다
        </p>
      </div>
    </div>
  );
}

export default function AnalyzePublicPage() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [formData, setFormData] = useState<UploadFormData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const defaultPhoneNumber = loaderData?.defaultPhoneNumber || "";
  const babies = loaderData?.babies || [];
  const isLoggedIn = loaderData?.isLoggedIn || false;

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
    if (data.newBabyName) form.append("newBabyName", data.newBabyName);
    if (data.newBabyGender) form.append("newBabyGender", data.newBabyGender);
    
    fetcher.submit(form, { method: "post" });
  };

  const handleReset = () => {
    setFormData(null);
  };

  // 이미지 다운로드 (모바일 사진첩 저장 지원)
  const handleDownloadSlides = async () => {
    if (!analysisId) {
      alert("분석 ID가 없어 이미지를 생성할 수 없습니다.");
      return;
    }
    
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/sleep/${analysisId}/slides`, {
        method: "POST",
      });
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data?.slideUrls) {
        throw new Error(responseData.error || "이미지 생성에 실패했습니다.");
      }
      
      const slideUrls = responseData.data.slideUrls as string[];
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      for (let i = 0; i < slideUrls.length; i++) {
        const slideUrl = slideUrls[i];
        const imgResponse = await fetch(slideUrl);
        const blob = await imgResponse.blob();
        const fileName = `수면분석-${i + 1}.png`;
        
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
        alert(`${slideUrls.length}장의 이미지가 저장되었습니다!`);
      }
    } catch (err) {
      console.error("Download error:", err);
      alert(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212] transition-colors duration-300">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <Link 
            to="/customer/sleep"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">수면 분석</span>
          </Link>
          
          <div className="w-16 h-16 bg-[#1A1A1A] dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Moon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI 수면 환경 분석</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            아기의 수면 공간 사진을 올려주세요
          </p>
        </div>

        <main>
          {/* Loading State with Sleep Tips */}
          {isLoading && <LoadingWithTips />}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 mb-6">
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-700">
                <UploadForm 
                  onSubmit={handleSubmit} 
                  isLoading={isLoading} 
                  defaultPhoneNumber={defaultPhoneNumber}
                  babies={babies}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
