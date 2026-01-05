/**
 * Sleep Analysis Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "sleep-analysis",
  description: "AI 기반 수면 환경 분석 기능",

  // 다른 feature 의존성
  featureDependencies: [],

  // shared 서비스 의존성
  sharedDependencies: ["storage"],

  // 소유 라우트
  routes: [
    "/api/sleep/*",
    "/customer/sleep/*",
  ],

  // 소유 테이블
  tables: [
    "sleep_analyses",
    "sleep_analysis_feedback_items",
    "sleep_analysis_references",
  ],
} as const;
