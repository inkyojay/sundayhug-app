/**
 * Sleep Analysis API - Story Card Endpoint
 *
 * POST /api/sleep/:id/story-card
 * Generates a single Instagram story card (1080x1920)
 */
import type { Route } from "./+types/story-card";

import { data } from "react-router";

import type { AnalysisReport } from "../schema";

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data(
      { success: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  const { id } = params;

  if (!id) {
    return data(
      { success: false, error: "Analysis ID is required" },
      { status: 400 }
    );
  }

  // Dynamic imports for server-only modules
  const { getSleepAnalysis } = await import("../lib/sleep-analysis.server");
  const { generateStoryCardImage, getDefaultComment } = await import(
    "../lib/story-card.server"
  );

  try {
    console.log(`[StoryCard] Starting generation for analysis ${id}...`);

    // 1. 분석 결과 가져오기
    const result = await getSleepAnalysis(id);

    if (!result) {
      return data(
        { success: false, error: "Analysis not found" },
        { status: 404 }
      );
    }

    const report = result.report as AnalysisReport | null;

    if (!report) {
      return data(
        { success: false, error: "Analysis report not found" },
        { status: 404 }
      );
    }

    // 2. 점수와 코멘트 추출 (0점도 유효한 값이므로 typeof 체크)
    const score = typeof report.safetyScore === 'number' ? report.safetyScore : 70;
    const comment = report.scoreComment || getDefaultComment(score);
    const summary = report.summary || "";
    
    console.log(`[StoryCard] Extracted - score: ${score}, comment: ${comment?.substring(0, 30)}..., summary: ${summary?.substring(0, 30)}...`);

    // 3. 이미지 URL (선택적)
    const imageUrl = result.image_url || undefined;

    // 4. 스토리 카드 생성
    console.log(`[StoryCard] Generating card with score ${score}...`);
    const storyCardUrl = await generateStoryCardImage({
      score,
      comment,
      summary,
      imageUrl,
    });

    console.log(`[StoryCard] Story card generated: ${storyCardUrl}`);

    return data({
      success: true,
      data: {
        storyCardUrl,
        score,
        comment,
      },
    });
  } catch (error) {
    console.error("[StoryCard] Error:", error);
    return data(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "스토리 카드 생성에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function loader() {
  return data({
    message: "POST /api/sleep/:id/story-card",
  });
}

