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
  const { data, error } = await supabase
    .from("sleep_analyses")
    .insert({
      user_id: metadata.userId,
      phone_number: metadata.phoneNumber,
      instagram_id: metadata.instagramId,
      birth_date: metadata.birthDate,
      age_in_months: metadata.ageInMonths,
      image_url: imageUrl,
      overall_score: report.overall_score,
      overall_comment: report.overall_comment,
      comprehensive_recommendation: report.comprehensive_recommendation,
      slides_generated: false,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save analysis: ${error.message}`);
  }

  // Save feedback items
  if (report.feedback_items && report.feedback_items.length > 0) {
    const feedbackItems = report.feedback_items.map((item) => ({
      analysis_id: data.id,
      emoji: item.emoji,
      keyword: item.keyword,
      danger_level: item.danger_level,
      description: item.description,
      improvement: item.improvement,
      reference: item.reference,
    }));

    await supabase.from("sleep_analysis_feedback_items").insert(feedbackItems);
  }

  return data.id;
}

export async function getSleepAnalysis(id: string): Promise<any> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("sleep_analyses")
    .select(`
      *,
      sleep_analysis_feedback_items (*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to get analysis: ${error.message}`);
  }

  return {
    ...data,
    feedback_items: data.sleep_analysis_feedback_items,
  };
}

