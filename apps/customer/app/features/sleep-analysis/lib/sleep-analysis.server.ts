/**
 * Sleep Analysis Server Utils
 */
import { createClient } from "@supabase/supabase-js";
// schema.ts의 AnalysisReport를 사용 (Gemini 반환 형식)
import type { AnalysisReport } from "../schema";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function calculateAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  return years * 12 + months;
}

export async function saveSleepAnalysis(
  report: AnalysisReport,
  metadata: {
    birthDate: string;
    ageInMonths: number;
    imageBase64: string;
    phoneNumber?: string | null;
    instagramId?: string | null;
    userId?: string | null;
  }
): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Upload image to storage
  let imageUrl: string | null = null;
  if (metadata.imageBase64) {
    const fileName = `analysis_${Date.now()}.jpg`;
    const base64Data = metadata.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("sleep-analysis")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (!uploadError && uploadData) {
      const { data: publicUrl } = supabase.storage
        .from("sleep-analysis")
        .getPublicUrl(fileName);
      imageUrl = publicUrl.publicUrl;
    } else if (uploadError) {
      console.warn("이미지 업로드 실패:", uploadError.message);
    }
  }

  // Save analysis record
  // summary에 전체 결과를 JSON으로 저장 (Gemini 반환 형식: summary, feedbackItems, references, safetyScore, scoreComment, cardNews)
  const summaryJson = JSON.stringify({
    summary: report.summary,
    feedbackItems: report.feedbackItems,
    references: report.references,
    safetyScore: report.safetyScore,
    scoreComment: report.scoreComment,
    cardNews: report.cardNews, // 카드뉴스용 텍스트 추가
  });

  const { data, error } = await supabase
    .from("sleep_analyses")
    .insert({
      phone_number: metadata.phoneNumber,
      instagram_id: metadata.instagramId,
      birth_date: metadata.birthDate,
      age_in_months: metadata.ageInMonths,
      image_url: imageUrl,
      image_base64: metadata.imageBase64, // 이미지 base64도 저장 (storage 실패 대비)
      summary: summaryJson,
      user_id: metadata.userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save analysis:", error);
    throw new Error(`Failed to save analysis: ${error.message}`);
  }

  return data.id;
}

export async function getSleepAnalysis(id: string): Promise<any> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("sleep_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to get analysis: ${error.message}`);
  }

  // summary에서 JSON 파싱 (Gemini 형식: summary, feedbackItems, references)
  let report = null;
  if (data.summary) {
    try {
      report = JSON.parse(data.summary);
    } catch (e) {
      console.error("Failed to parse summary:", e);
      // 파싱 실패 시 문자열 그대로 사용
      report = { summary: data.summary };
    }
  }

  return {
    ...data,
    report,
    // feedbackItems 형식으로 반환 (schema.ts 형식)
    feedbackItems: report?.feedbackItems || [],
    references: report?.references || [],
    safetyScore: report?.safetyScore,
    scoreComment: report?.scoreComment,
  };
}

