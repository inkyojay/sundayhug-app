/**
 * Users Feature Types
 * 사용자 프로필 관련 타입 정의
 */

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  ageRange?: string;
  birthday?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  locale: "ko" | "en" | "es";
  notifications: boolean;
}
