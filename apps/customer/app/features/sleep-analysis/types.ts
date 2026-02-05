/**
 * Sleep Analysis Types
 *
 * @deprecated Use types from ./schema.ts instead:
 * - SleepAnalysis, AnalysisReport, FeedbackItem, RiskLevel
 * - SleepAnalysisResult from ./lib/sleep-analysis.server.ts
 *
 * This file is kept for reference but is not imported anywhere.
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

