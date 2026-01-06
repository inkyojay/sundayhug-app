/**
 * 고객 행동 분석 서버 로직
 *
 * - RFM 분석 (Recency, Frequency, Monetary)
 * - LTV (고객 생애 가치) 계산
 * - 코호트 분석 (첫 구매월 기준)
 * - 고객 세그먼트 분류
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CustomerAnalyticsData } from "../types";

// 각 모듈에서 re-export
export * from "./rfm.server";
export * from "./ltv.server";
export * from "./cohort.server";

// 통합 분석 함수에 필요한 함수들 import
import { calculateRFMScores, calculateSegmentDistribution } from "./rfm.server";
import { calculateLTV } from "./ltv.server";
import { calculateCohortAnalysis } from "./cohort.server";

// ===== 통합 분석 함수 =====

/**
 * 모든 고객 분석 데이터를 한 번에 조회합니다.
 */
export async function getCustomerAnalyticsData(
  adminClient: SupabaseClient
): Promise<CustomerAnalyticsData> {
  // 병렬 실행
  const [rfmResult, ltvResult, cohortResult] = await Promise.all([
    calculateRFMScores(adminClient),
    calculateLTV(adminClient),
    calculateCohortAnalysis(adminClient),
  ]);

  return {
    rfm: {
      scores: rfmResult.scores,
      summary: rfmResult.summary,
      segmentDistribution: calculateSegmentDistribution(rfmResult.scores),
    },
    ltv: ltvResult,
    cohort: cohortResult,
  };
}
