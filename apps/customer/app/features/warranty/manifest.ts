/**
 * Warranty Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "warranty",
  description: "보증서 등록/관리 기능",

  // 다른 feature 의존성
  featureDependencies: [],

  // shared 서비스 의존성
  sharedDependencies: ["notification", "storage"],

  // 소유 라우트
  routes: [
    "/api/warranty/*",
    "/customer/warranty/*",
    "/customer/mypage/warranties",
    "/customer/mypage/as",
    "/customer/as/:warrantyId",
  ],

  // 소유 테이블
  tables: [
    "warranties",
    "as_requests",
  ],
} as const;
