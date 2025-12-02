/**
 * Sleep Analysis Types
 */

export interface UploadFormData {
  imageBase64: string;
  imageMimeType: string;
  imagePreview: string;
  birthDate: string;
  phoneNumber?: string;
  instagramId?: string;
  newBabyName?: string;
  newBabyGender?: string;
}

export interface FeedbackItem {
  emoji: string;
  keyword: string;
  danger_level: "safe" | "caution" | "danger";
  description: string;
  improvement: string;
  reference?: string;
}

export interface AnalysisReport {
  overall_score: number;
  overall_comment: string;
  feedback_items: FeedbackItem[];
  comprehensive_recommendation: string;
}

export interface SleepAnalysis {
  id: string;
  user_id?: string;
  phone_number?: string;
  instagram_id?: string;
  birth_date: string;
  age_in_months: number;
  image_url?: string;
  overall_score: number;
  overall_comment: string;
  comprehensive_recommendation: string;
  feedback_items?: FeedbackItem[];
  slides_generated: boolean;
  slide_urls?: string[];
  created_at: string;
}


