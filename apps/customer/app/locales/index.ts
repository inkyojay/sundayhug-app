/**
 * 다국어 리소스 통합
 */
import ko from "./ko";

// 다른 언어들은 번역 완료 후 추가
// import en from "./en";
// import ja from "./ja";
// import vi from "./vi";
// import zhTW from "./zh-TW";
// import zhCN from "./zh-CN";
// import ar from "./ar";

export const resources = {
  ko,
  // en,
  // ja,
  // vi,
  // "zh-TW": zhTW,
  // "zh-CN": zhCN,
  // ar,
} as const;

export type Resources = typeof resources;

// 번역 키 타입 추출
export type TranslationKeys = typeof ko;
