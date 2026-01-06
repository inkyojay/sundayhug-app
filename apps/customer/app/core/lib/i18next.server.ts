/**
 * Server-Side Internationalization (i18n) Configuration
 *
 * 서버 사이드 렌더링을 위한 다국어 설정
 * - 7개 언어 지원
 * - 다중 네임스페이스
 * - 쿠키 기반 언어 감지
 */
import { createCookie } from "react-router";
import { RemixI18Next } from "remix-i18next/server";

import i18n from "~/i18n";
import { resources } from "~/locales";

/**
 * 언어 설정 쿠키
 */
export const localeCookie = createCookie("locale", {
  path: "/",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365, // 1년
});

/**
 * RemixI18Next 인스턴스
 */
const i18next = new RemixI18Next({
  detection: {
    cookie: localeCookie,
    supportedLanguages: i18n.supportedLngs as unknown as string[],
    fallbackLanguage: i18n.fallbackLng,
  },
  i18next: {
    ...i18n,
    resources,
  },
});

export default i18next;
