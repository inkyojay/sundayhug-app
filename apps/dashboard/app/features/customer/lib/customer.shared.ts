/**
 * Customer 공유 유틸리티 및 타입
 */

// ============================================
// 카카오 관련 타입
// ============================================

export interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
}

export interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    name?: string;
    phone_number?: string;
    gender?: string;
    age_range?: string;
    birthday?: string;
  };
}

// ============================================
// Auth 관련 타입
// ============================================

export interface AuthCallbackResult {
  success: boolean;
  error?: string;
}

export interface LayoutUserInfo {
  isLoggedIn: boolean;
  userName: string | null;
  isVip: boolean;
}

// ============================================
// 회원 관련 타입
// ============================================

export interface CustomerMember {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  baby_name: string | null;
  baby_birth_date: string | null;
  baby_gender: string | null;
  has_password: boolean;
  has_kakao: boolean;
  has_naver: boolean;
}

// ============================================
// A/S 관련 타입
// ============================================

export interface AsRequestFormData {
  warrantyId: string;
  requestType: string;
  issueDescription: string;
  contactName: string;
  contactPhone: string;
  contactAddress?: string;
}

export interface AsRequestType {
  value: string;
  label: string;
  description: string;
}

// A/S 신청 유형 상수
export const AS_REQUEST_TYPES: AsRequestType[] = [
  { value: "repair", label: "수리", description: "제품 고장/파손 수리" },
  { value: "exchange", label: "교환", description: "동일 제품으로 교환" },
  { value: "refund", label: "환불", description: "제품 반품 및 환불" },
  { value: "inquiry", label: "기타 문의", description: "기타 A/S 관련 문의" },
];

// ============================================
// 보증서 관련 타입
// ============================================

export interface Warranty {
  id: string;
  warranty_number: string;
  product_name: string;
  product_option: string | null;
  customer_name: string | null;
  user_id: string;
  created_at: string;
}

// ============================================
// 네비게이션 관련 상수
// ============================================

export interface NavItem {
  label: string;
  href: string;
}

export interface MobileNavItem extends NavItem {
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 전화번호 포맷팅 (010-1234-5678 형식)
 */
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/[^\d]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7)
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * 전화번호에서 하이픈 제거
 */
export function removePhoneHyphens(phone: string): string {
  return phone.replace(/-/g, "");
}

/**
 * 활성 네비게이션 경로 확인
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/customer") {
    return pathname === "/customer";
  }
  return pathname.startsWith(href);
}
