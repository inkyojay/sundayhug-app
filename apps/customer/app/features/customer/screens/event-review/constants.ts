/**
 * Event Review Constants
 */

export const PURCHASE_CHANNELS = [
  "쿠팡",
  "네이버 스마트스토어",
  "자사몰 (sundayhug.kr)",
  "11번가",
  "G마켓/옥션",
  "위메프",
  "티몬",
  "카카오선물하기",
  "기타",
];

export const REFERRAL_SOURCES = [
  { value: "naver", label: "네이버 검색" },
  { value: "instagram", label: "인스타그램 광고" },
  { value: "momcafe", label: "맘카페 내 추천" },
  { value: "referral", label: "주변 지인 추천" },
  { value: "other", label: "기타" },
];

// Daum Postcode API type declaration
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          address: string;
        }) => void;
      }) => {
        open: () => void;
      };
    };
  }
}
