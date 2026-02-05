/**
 * Sleep Analysis API - Story Card Endpoint
 *
 * POST /api/sleep/:id/story-card
 * Generates a single Instagram story card (1080x1920)
 * 
 * 점수 기준 분기:
 * - 80점 이상: 사진 있는 축하 카드
 * - 80점 미만: 안전 수면 팁 카드 (사진 없음)
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
  const { generateStoryCardImage } = await import("../lib/story-card.server");

  try {
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

    // 2. 점수 추출 (0점도 유효한 값이므로 typeof 체크)
    const score = typeof report.safetyScore === 'number' ? report.safetyScore : 70;
    
    // 3. 이미지 URL (80점 이상일 때만 사용)
    const imageUrl = result.image_url || undefined;
    
    // 4. 스토리 카드 생성 (점수에 따라 자동 분기)
    const storyCardUrl = await generateStoryCardImage({
      score,
      imageUrl,
    });

    return data({
      success: true,
      data: {
        storyCardUrl,
        score,
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
