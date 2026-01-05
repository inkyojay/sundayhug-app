/**
 * Users Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "users",
  description: "사용자 프로필 관리 기능",

  // 다른 feature 의존성
  featureDependencies: ["auth"],

  // shared 서비스 의존성
  sharedDependencies: ["storage"],

  // 소유 라우트
  routes: [
    "/customer/mypage/profile",
  ],

  // 소유 테이블
  tables: [
    "profiles",
  ],
} as const;
