/**
 * Payments Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "payments",
  description: "결제 처리 기능 (Toss Payments)",

  // 다른 feature 의존성
  featureDependencies: [],

  // shared 서비스 의존성
  sharedDependencies: [],

  // 소유 라우트
  routes: [
    "/customer/payments/*",
  ],

  // 소유 테이블
  tables: [
    "payments",
  ],
} as const;
