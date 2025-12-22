/**
 * Sleep Analysis Schema
 *
 * This file defines the database schema for sleep analysis feature using Drizzle ORM.
 * Includes tables for analyses, feedback items, and references.
 */
import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole, anonRole } from "drizzle-orm/supabase";

/**
 * Sleep Analyses Table
 *
 * Stores main analysis results including summary and metadata
 */
export const sleepAnalyses = pgTable(
  "sleep_analyses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "set null" }),
    imageUrl: text("image_url"),
    imageBase64: text("image_base64"),
    birthDate: date("birth_date").notNull(),
    ageInMonths: integer("age_in_months").notNull(),
    summary: text().notNull(),
    reportSlides: jsonb("report_slides"),
    phoneNumber: text("phone_number"),
    instagramId: text("instagram_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_sleep_analyses_user_id").on(table.userId),
    index("idx_sleep_analyses_created_at").on(table.createdAt),
    // RLS Policies
    pgPolicy("users_can_view_own_analyses", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
    pgPolicy("users_can_insert_analyses", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = ${authUid} OR ${table.userId} IS NULL`,
    }),
    pgPolicy("users_can_update_own_analyses", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
    pgPolicy("anon_can_insert_analyses", {
      for: "insert",
      to: anonRole,
      withCheck: sql`${table.userId} IS NULL`,
    }),
    pgPolicy("anon_can_view_own_analyses", {
      for: "select",
      to: anonRole,
      using: sql`${table.userId} IS NULL`,
    }),
  ]
);

/**
 * Sleep Analysis Feedback Items Table
 *
 * Stores individual feedback items with risk levels and coordinates
 */
export const sleepAnalysisFeedbackItems = pgTable(
  "sleep_analysis_feedback_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => sleepAnalyses.id, { onDelete: "cascade" }),
    itemNumber: integer("item_number").notNull(),
    x: numeric().notNull(),
    y: numeric().notNull(),
    title: text().notNull(),
    feedback: text().notNull(),
    riskLevel: text("risk_level").notNull(), // 'High' | 'Medium' | 'Low' | 'Info'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_feedback_items_analysis_id").on(table.analysisId),
  ]
);

/**
 * Sleep Analysis References Table
 *
 * Stores reference links for analysis results
 */
export const sleepAnalysisReferences = pgTable(
  "sleep_analysis_references",
  {
    id: uuid().primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => sleepAnalyses.id, { onDelete: "cascade" }),
    title: text().notNull(),
    uri: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_references_analysis_id").on(table.analysisId),
  ]
);

// TypeScript types for use in application
export type SleepAnalysis = typeof sleepAnalyses.$inferSelect;
export type NewSleepAnalysis = typeof sleepAnalyses.$inferInsert;
export type FeedbackItem = typeof sleepAnalysisFeedbackItems.$inferSelect;
export type NewFeedbackItem = typeof sleepAnalysisFeedbackItems.$inferInsert;
export type Reference = typeof sleepAnalysisReferences.$inferSelect;
export type NewReference = typeof sleepAnalysisReferences.$inferInsert;

// Risk level type
export type RiskLevel = "High" | "Medium" | "Low" | "Info";

// Analysis report interface (matches Gemini output)
export interface AnalysisReport {
  safetyScore: number; // 0-100점
  scoreComment: string; // 점수에 대한 한 줄 코멘트
  summary: string;
  feedbackItems: {
    id: number;
    x: number;
    y: number;
    title: string;
    feedback: string;
    riskLevel: RiskLevel;
  }[];
  references: {
    title: string;
    uri: string;
  }[];
  // 카드뉴스용 텍스트 (AI가 각색)
  cardNews?: CardNewsText;
}

// 카드뉴스용 텍스트 인터페이스
export interface CardNewsText {
  // 1번 슬라이드: 목표 한 문장 (예: "콩이가 더 안전하게 꿀잠 잘 수 있도록 분석했어요")
  goal: string;
  // 2번 슬라이드: 엄마 입장 일기 (122자 내외, 친근한 어투)
  momsDiary: string;
  // 4번 슬라이드: Bad 피드백 (위험/주의 항목, 짧고 친근하게)
  badItems: {
    title: string;   // 20자 이내
    content: string; // 60자 이내
    badge: "위험" | "주의";
  }[];
  // 5번 슬라이드: Good 피드백 (잘한 점, 짧고 친근하게)
  goodItems: {
    title: string;   // 20자 이내
    content: string; // 60자 이내
  }[];
  // 5번 슬라이드: 양 캐릭터 총평 (50자 이내)
  summary: string;
}



