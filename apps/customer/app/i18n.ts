/**
 * Internationalization (i18n) Configuration
 *
 * 다국어 글로벌화 설정
 * - 7개 언어 지원 (한국어 기본)
 * - RTL 지원 (아랍어)
 * - 네임스페이스별 번역 파일 분리
 */

/**
 * 지원 언어 목록
 */
export const supportedLngs = [
  "ko",     // 한국어 (기본)
  "en",     // English
  "ja",     // 日本語
  "vi",     // Tiếng Việt
  "zh-TW",  // 繁體中文 (대만)
  "zh-CN",  // 简体中文 (중국)
  "ar",     // العربية (아랍어)
] as const;

export type SupportedLanguage = typeof supportedLngs[number];

/**
 * RTL (Right-to-Left) 언어 목록
 */
export const rtlLanguages = ["ar"] as const;

/**
 * 번역 네임스페이스 목록
 */
export const namespaces = [
  "common",           // 공통 UI (버튼, 네비게이션, 상태)
  "auth",             // 로그인, 회원가입, 비밀번호
  "customer",         // 홈, 마이페이지, 프로필
  "sleep-analysis",   // 수면 분석
  "warranty",         // 보증서
  "chat",             // AI 상담
  "blog",             // 블로그
  "errors",           // 에러 메시지
] as const;

export type Namespace = typeof namespaces[number];

/**
 * 언어 정보
 */
export const languageInfo: Record<SupportedLanguage, {
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}> = {
  ko: { name: "Korean", nativeName: "한국어", direction: "ltr" },
  en: { name: "English", nativeName: "English", direction: "ltr" },
  ja: { name: "Japanese", nativeName: "日本語", direction: "ltr" },
  vi: { name: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr" },
  "zh-TW": { name: "Traditional Chinese", nativeName: "繁體中文", direction: "ltr" },
  "zh-CN": { name: "Simplified Chinese", nativeName: "简体中文", direction: "ltr" },
  ar: { name: "Arabic", nativeName: "العربية", direction: "rtl" },
};

/**
 * RTL 언어 여부 확인
 */
export function isRtlLanguage(lang: string): boolean {
  return rtlLanguages.includes(lang as typeof rtlLanguages[number]);
}

/**
 * i18next 기본 설정
 */
export default {
  supportedLngs,
  fallbackLng: "ko",  // 한국어 기본
  defaultNS: "common",
  ns: namespaces,
};
