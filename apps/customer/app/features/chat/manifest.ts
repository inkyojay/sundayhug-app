/**
 * Chat Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "chat",
  description: "AI 육아 상담 채팅 기능",

  // 다른 feature 의존성
  featureDependencies: [],

  // shared 서비스 의존성
  sharedDependencies: [],

  // 소유 라우트
  routes: [
    "/api/chat/*",
    "/customer/chat/*",
  ],

  // 소유 테이블
  tables: [
    "chat_sessions",
    "chat_messages",
    "baby_profiles",
    "knowledge_base",
  ],
} as const;
