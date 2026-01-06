/**
 * Sleep Analysis Page (새로운 디자인)
 */
import type { Route } from "./+types/analyze-public";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useFetcher, useLoaderData, data } from "react-router";
import { Loader2, Moon, Baby, Shield, Clock, Thermometer, Music, ArrowLeft } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import { UploadForm } from "../components/upload-form";
import { AnalysisResult } from "../components/analysis-result";
import { StoryCardModal } from "../components/story-card-modal";
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
  
  // 추천 제품 목록 가져오기
  const { data: recommendedProducts } = await supabase
    .from("sleep_recommended_products")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  
  return data({ 
    isLoggedIn: !!user,
    userId: user?.id || null,
    defaultPhoneNumber,
    babies,
    products: recommendedProducts || [],
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

    // 생년월일로 월령 계산
    const ageInMonthsForResult = calculateAgeInMonths(birthDate);
    
    return data({
      success: true,
      report,
      analysisId,
      babyAgeMonths: ageInMonthsForResult,
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
function LoadingWithTips({ t }: { t: (key: string, options?: Record<string, unknown>) => string }) {
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
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{t("sleep-analysis:upload.analyzing")}</p>
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
          {t("sleep-analysis:upload.analyzingDescription")}
        </p>
      </div>
    </div>
  );
}

export default function AnalyzePublicPage() {
  const { t } = useTranslation(["sleep-analysis", "common"]);
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [formData, setFormData] = useState<UploadFormData | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [storyCardData, setStoryCardData] = useState<{ url: string; score: number } | null>(null);

  const defaultPhoneNumber = loaderData?.defaultPhoneNumber || "";
  const babies = loaderData?.babies || [];
  const isLoggedIn = loaderData?.isLoggedIn || false;
  const products = loaderData?.products || [];

  const isLoading = fetcher.state === "submitting";
  const result = fetcher.data;
  const report = result && "report" in result ? result.report as AnalysisReport : null;
  const analysisId = result && "analysisId" in result ? result.analysisId as string : undefined;
  const babyAgeMonths = result && "babyAgeMonths" in result ? result.babyAgeMonths as number : undefined;
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

  // 스토리 카드 공유 (한 장짜리 인스타 스토리 카드)
  const handleShareStoryCard = async () => {
    if (!analysisId) {
      alert(t("sleep-analysis:errors.analysisFailed"));
      return;
    }
    
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/30 to-white dark:from-[#0f0f0f] dark:via-[#121212] dark:to-[#1a1a1a]">
      <div className="mx-auto max-w-lg px-4 py-6 pb-24">
        {/* Compact Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/customer/sleep"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("sleep-analysis:title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("sleep-analysis:subtitle")}</p>
          </div>
        </div>

        <main>
          {/* Loading State with Sleep Tips */}
          {isLoading && <LoadingWithTips t={t} />}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-4 flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <strong className="font-semibold">{t("sleep-analysis:errors.analysisFailed")}</strong>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result or Upload Form */}
          {!isLoading && (
            report && formData ? (
              <AnalysisResult
                report={report}
                imagePreview={formData.imagePreview}
                analysisId={analysisId}
                babyAgeMonths={babyAgeMonths}
                products={products}
                onReset={handleReset}
                onShareStoryCard={handleShareStoryCard}
                isGeneratingCard={isGeneratingCard}
              />
            ) : (
              <UploadForm 
                onSubmit={handleSubmit} 
                isLoading={isLoading} 
                defaultPhoneNumber={defaultPhoneNumber}
                babies={babies}
                isLoggedIn={isLoggedIn}
              />
            )
          )}
        </main>
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
