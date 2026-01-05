/**
 * Auth Feature
 * 인증 기능 (로그인, 회원가입, OTP, OAuth)
 *
 * 공개 API - 다른 feature에서 사용 가능
 */

// Types
export type {
  OTPVerification,
  AuthUser,
  SocialProvider,
} from "./types";

// Components (OAuth logos for reuse)
export { AppleLogo } from "./components/logos/apple";
export { GithubLogo } from "./components/logos/github";
export { GoogleLogo } from "./components/logos/google";
export { KakaoLogo } from "./components/logos/kakao";
