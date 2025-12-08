/**
 * Sleep Analysis Queries
 *
 * Database query functions for sleep analysis feature using Drizzle ORM.
 */
import { desc, eq } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";

import type {
  AnalysisReport,
  NewFeedbackItem,
  NewReference,
  NewSleepAnalysis,
} from "./schema";
import {
  sleepAnalyses,
  sleepAnalysisFeedbackItems,
  sleepAnalysisReferences,
} from "./schema";

/**
 * Save a complete sleep analysis with feedback items and references
 */
export async function saveSleepAnalysis(
  report: AnalysisReport,
  data: {
    birthDate: string;
    ageInMonths: number;
    imageBase64?: string;
    imageUrl?: string;
    reportSlides?: string[];
    phoneNumber?: string | null;
    instagramId?: string | null;
    userId?: string | null;
  }
): Promise<string> {
  // Insert main analysis
  const [analysis] = await db
    .insert(sleepAnalyses)
    .values({
      userId: data.userId ?? null,
      birthDate: data.birthDate,
      ageInMonths: data.ageInMonths,
      summary: report.summary,
      imageBase64: data.imageBase64 ?? null,
      imageUrl: data.imageUrl ?? null,
      reportSlides: data.reportSlides ?? null,
      phoneNumber: data.phoneNumber ?? null,
      instagramId: data.instagramId ?? null,
    } as NewSleepAnalysis)
    .returning({ id: sleepAnalyses.id });

  const analysisId = analysis.id;

  // Insert feedback items
  if (report.feedbackItems.length > 0) {
    const feedbackItems: NewFeedbackItem[] = report.feedbackItems.map((item) => ({
      analysisId,
      itemNumber: item.id,
      x: String(item.x),
      y: String(item.y),
      title: item.title,
      feedback: item.feedback,
      riskLevel: item.riskLevel,
    }));

    await db.insert(sleepAnalysisFeedbackItems).values(feedbackItems);
  }

  // Insert references
  if (report.references.length > 0) {
    const references: NewReference[] = report.references.map((ref) => ({
      analysisId,
      title: ref.title,
      uri: ref.uri,
    }));

    await db.insert(sleepAnalysisReferences).values(references);
  }

  return analysisId;
}

/**
 * Get a single sleep analysis by ID with all related data
 */
export async function getSleepAnalysis(analysisId: string) {
  const [analysis] = await db
    .select()
    .from(sleepAnalyses)
    .where(eq(sleepAnalyses.id, analysisId))
    .limit(1);

  if (!analysis) {
    return null;
  }

  const feedbackItems = await db
    .select()
    .from(sleepAnalysisFeedbackItems)
    .where(eq(sleepAnalysisFeedbackItems.analysisId, analysisId))
    .orderBy(sleepAnalysisFeedbackItems.itemNumber);

  const references = await db
    .select()
    .from(sleepAnalysisReferences)
    .where(eq(sleepAnalysisReferences.analysisId, analysisId));

  return {
    analysis,
    feedbackItems,
    references,
  };
}

/**
 * Get recent sleep analyses for a user
 */
export async function getRecentAnalyses(userId: string | null, limit = 10) {
  if (userId) {
    return db
      .select({
        id: sleepAnalyses.id,
        summary: sleepAnalyses.summary,
        birthDate: sleepAnalyses.birthDate,
        ageInMonths: sleepAnalyses.ageInMonths,
        createdAt: sleepAnalyses.createdAt,
        imageUrl: sleepAnalyses.imageUrl,
      })
      .from(sleepAnalyses)
      .where(eq(sleepAnalyses.userId, userId))
      .orderBy(desc(sleepAnalyses.createdAt))
      .limit(limit);
  }
  
  return [];
}

/**
 * Update analysis with slide URLs
 */
export async function updateAnalysisSlides(
  analysisId: string,
  slideUrls: string[]
) {
  await db
    .update(sleepAnalyses)
    .set({ reportSlides: slideUrls })
    .where(eq(sleepAnalyses.id, analysisId));
}

/**
 * Update analysis image URL
 */
export async function updateAnalysisImageUrl(
  analysisId: string,
  imageUrl: string
) {
  await db
    .update(sleepAnalyses)
    .set({ imageUrl })
    .where(eq(sleepAnalyses.id, analysisId));
}

/**
 * Get analysis count for a user
 */
export async function getAnalysisCount(userId: string): Promise<number> {
  const result = await db
    .select()
    .from(sleepAnalyses)
    .where(eq(sleepAnalyses.userId, userId));
  
  return result.length;
}

