/**
 * Auth Feature Types
 * 인증 관련 타입 정의
 */

export interface OTPVerification {
  phoneNumber: string;
  otpCode: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  provider?: string;
  createdAt: string;
}

export interface SocialProvider {
  name: "google" | "apple" | "kakao" | "naver" | "github";
  displayName: string;
  enabled: boolean;
}
