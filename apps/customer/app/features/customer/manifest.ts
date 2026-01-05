/**
 * Customer Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "customer",
  description: "고객 서비스 허브 (메인 페이지, 마이페이지 등)",

  // 다른 feature 의존성
  featureDependencies: ["auth", "users", "warranty", "sleep-analysis"],

  // shared 서비스 의존성
  sharedDependencies: ["notification"],

  // 소유 라우트
  routes: [
    "/customer",
    "/customer/event/*",
    "/customer/mypage",
    "/customer/mypage/points",
    "/customer/mypage/reviews",
  ],

  // 소유 테이블
  tables: [
    "event_reviews",
  ],
} as const;
