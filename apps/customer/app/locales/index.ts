/**
 * 다국어 리소스 통합
 *
 * 네임스페이스별 번역 파일을 통합합니다.
 */
import ko from "./ko/index";
import en from "./en/index";

// 다른 언어들은 번역 완료 후 추가
// import ja from "./ja/index";
// import vi from "./vi/index";
// import zhTW from "./zh-TW/index";
// import zhCN from "./zh-CN/index";
// import ar from "./ar/index";

export const resources = {
  ko,
  en,
  // ja,
  // vi,
  // "zh-TW": zhTW,
  // "zh-CN": zhCN,
  // ar,
} as const;

export type Resources = typeof resources;

// 번역 키 타입 추출
export type TranslationKeys = typeof ko;
