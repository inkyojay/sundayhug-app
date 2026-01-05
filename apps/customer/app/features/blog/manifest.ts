/**
 * Blog Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "blog",
  description: "블로그 콘텐츠 관리 기능",

  // 다른 feature 의존성
  featureDependencies: [],

  // shared 서비스 의존성
  sharedDependencies: ["storage"],

  // 소유 라우트
  routes: [
    "/blog/*", // API 라우트
    // TODO: 아래 라우트의 화면은 현재 customer feature에 있음
    // 점진적으로 blog feature로 이동 예정
    // "/customer/blog",
    // "/customer/blog/:postId",
  ],

  // 소유 테이블
  tables: [
    "blog_posts",
    "blog_categories",
  ],
} as const;
