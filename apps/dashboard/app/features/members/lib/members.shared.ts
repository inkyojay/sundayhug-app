/**
 * Members 공유 유틸리티 및 타입
 */

// ============================================
// 역할 관련 타입 및 상수
// ============================================

export type MemberRole = "super_admin" | "admin" | "accountant" | "customer";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface RoleBadgeConfig {
  label: string;
  className: string;
}

export const ROLE_BADGE_CONFIG: Record<MemberRole | string, RoleBadgeConfig> = {
  super_admin: { label: "최고관리자", className: "bg-purple-600" },
  admin: { label: "관리자", className: "" }, // destructive variant
  accountant: { label: "회계담당", className: "" }, // secondary variant
  customer: { label: "고객", className: "" }, // outline variant
};

export interface ApprovalBadgeConfig {
  label: string;
  className: string;
}

export const APPROVAL_BADGE_CONFIG: Record<ApprovalStatus | string, ApprovalBadgeConfig> = {
  approved: { label: "승인", className: "bg-green-500 text-white" },
  pending: { label: "대기", className: "bg-amber-100 text-amber-700 border-amber-200" },
  rejected: { label: "거절", className: "" }, // destructive variant
};

// ============================================
// 회원 프로필 타입
// ============================================

export interface MemberProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: MemberRole | null;
  approval_status: ApprovalStatus | null;
  kakao_id: string | null;
  kakao_nickname: string | null;
  kakao_profile_image: string | null;
  naver_id: string | null;
  naver_profile_image: string | null;
  address: string | null;
  address_detail: string | null;
  zipcode: string | null;
  points: number;
  referral_code: string | null;
  created_at: string;
  last_login_at: string | null;
  gender: string | null;
  age_range: string | null;
}

export interface BabyProfile {
  id: string;
  user_id: string;
  name: string | null;
  gender: "male" | "female" | null;
  birth_date: string | null;
  sleep_sensitivity: "high" | "medium" | "low" | null;
  created_at: string;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일 HH:MM 형식)
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 날짜 포맷팅 (상세 - YYYY년 MM월 DD일 형식)
 */
export function formatDateLong(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 나이 계산 (개월/세)
 */
export function calculateAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  const months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  if (months < 12) {
    return `${months}개월`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 ? `${years}세 ${remainingMonths}개월` : `${years}세`;
}

/**
 * 역할 라벨 가져오기
 */
export function getRoleLabel(role: string | null): string {
  return ROLE_BADGE_CONFIG[role || "customer"]?.label || "고객";
}

/**
 * 승인 상태 라벨 가져오기
 */
export function getApprovalLabel(status: string | null): string {
  return APPROVAL_BADGE_CONFIG[status || "pending"]?.label || status || "미정";
}

/**
 * 수면 민감도 라벨 가져오기
 */
export function getSleepSensitivityLabel(
  sensitivity: "high" | "medium" | "low" | null
): string {
  switch (sensitivity) {
    case "high":
      return "예민";
    case "low":
      return "잘 잠";
    case "medium":
    default:
      return "보통";
  }
}

/**
 * 성별 라벨 가져오기
 */
export function getGenderLabel(gender: "male" | "female" | string | null): string {
  switch (gender) {
    case "male":
      return "남아";
    case "female":
      return "여아";
    default:
      return "";
  }
}
