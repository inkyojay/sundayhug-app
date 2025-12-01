/**
 * Sleep Analysis Server Utils
 */
import { createClient } from "@supabase/supabase-js";
import type { AnalysisReport } from "../types";

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
      .from("sleep-analysis-images")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (!uploadError && uploadData) {
      const { data: publicUrl } = supabase.storage
        .from("sleep-analysis-images")
        .getPublicUrl(fileName);
      imageUrl = publicUrl.publicUrl;
    }
  }

  // Save analysis record
  // summary에 전체 결과를 JSON으로 저장
  const summary = JSON.stringify({
    overall_score: report.overall_score,
    overall_comment: report.overall_comment,
    comprehensive_recommendation: report.comprehensive_recommendation,
    feedback_items: report.feedback_items,
  });

  const { data, error } = await supabase
    .from("sleep_analyses")
    .insert({
      phone_number: metadata.phoneNumber,
      instagram_id: metadata.instagramId,
      birth_date: metadata.birthDate,
      age_in_months: metadata.ageInMonths,
      image_url: imageUrl,
      summary: summary,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save analysis:", error);
    throw new Error(`Failed to save analysis: ${error.message}`);
  }

  console.log("✅ Analysis saved with ID:", data.id);
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

  // summary에서 JSON 파싱
  let report = null;
  if (data.summary) {
    try {
      report = JSON.parse(data.summary);
    } catch (e) {
      console.error("Failed to parse summary:", e);
    }
  }

  return {
    ...data,
    report,
    feedback_items: report?.feedback_items || [],
  };
}

