/**
 * Sleep Analysis Page (새로운 디자인)
 */
import type { Route } from "./+types/analyze-public";

import { useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, useFetcher, useLoaderData, data } from "react-router";
import { Loader2, ArrowLeft } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import { UploadForm } from "../components/upload-form";
import { LoadingWithTips } from "../components/loading-with-tips";
import { StoryCardModal } from "../components/story-card-modal";
const AnalysisResult = lazy(() =>
  import("../components/analysis-result").then((mod) => ({ default: mod.AnalysisResult }))
);
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
              <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>}>
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
              </Suspense>
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
