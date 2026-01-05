/**
 * Auth Feature Manifest
 * 기능 메타데이터 및 경계 정의
 */
export const manifest = {
  name: "auth",
  description: "인증 기능 (로그인, 회원가입, OTP, OAuth)",

  // 다른 feature 의존성
  featureDependencies: [],

  // shared 서비스 의존성
  sharedDependencies: ["notification"],

  // 소유 라우트
  routes: [
    "/api/auth/*",
    "/customer/login",
    "/customer/register",
    "/customer/auth/callback",
    "/customer/kakao/callback",
    "/customer/naver/callback",
  ],

  // 소유 테이블
  tables: [
    "phone_otp_verifications",
  ],
} as const;
