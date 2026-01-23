/**
 * 택배사 코드 매핑
 *
 * Cafe24, 네이버, 쿠팡 각 채널별 택배사 코드
 */

export interface Carrier {
  label: string;           // 표시명
  value: string;           // 내부 코드
  cafe24Code?: string;     // Cafe24 택배사 코드
  naverCode?: string;      // 네이버 택배사 코드
  coupangCode?: string;    // 쿠팡 택배사 코드
}

/**
 * 택배사 목록
 * - 국내 주요 택배사 위주
 * - 각 채널별 코드 매핑
 */
export const CARRIERS: Carrier[] = [
  {
    label: "CJ대한통운",
    value: "cj",
    cafe24Code: "0004",
    naverCode: "CJGLS",
    coupangCode: "CJGLS",
  },
  {
    label: "롯데택배",
    value: "lotte",
    cafe24Code: "0008",
    naverCode: "LOTTE",
    coupangCode: "LOTTE",
  },
  {
    label: "한진택배",
    value: "hanjin",
    cafe24Code: "0018",  // Cafe24에서 0018로 반환됨 (이전: 0001)
    naverCode: "HANJIN",
    coupangCode: "HANJIN",
  },
  {
    label: "우체국택배",
    value: "epost",
    cafe24Code: "0006",
    naverCode: "EPOST",
    coupangCode: "EPOST",
  },
  {
    label: "로젠택배",
    value: "logen",
    cafe24Code: "0005",
    naverCode: "LOGEN",
    coupangCode: "LOGEN",
  },
  {
    label: "경동택배",
    value: "kdexp",
    cafe24Code: "0023",
    naverCode: "KDEXP",
    coupangCode: "KDEXP",
  },
  {
    label: "대신택배",
    value: "daesin",
    cafe24Code: "0022",
    naverCode: "DAESIN",
    coupangCode: "DAESIN",
  },
  {
    label: "일양로지스",
    value: "ilyang",
    cafe24Code: "0011",
    naverCode: "ILYANG",
    coupangCode: "ILYANG",
  },
  {
    label: "천일택배",
    value: "chunil",
    cafe24Code: "0017",
    naverCode: "CHUNIL",
    coupangCode: "CHUNIL",
  },
  {
    label: "합동택배",
    value: "hdexp",
    cafe24Code: "0032",
    naverCode: "HDEXP",
    coupangCode: "HDEXP",
  },
  {
    label: "CU편의점택배",
    value: "cu",
    cafe24Code: "0046",
    naverCode: "CUPOST",
    coupangCode: "CUPOST",
  },
  {
    label: "GS편의점택배",
    value: "gs",
    cafe24Code: "0047",
    naverCode: "GSPOST",
    coupangCode: "GSPOST",
  },
  {
    label: "기타",
    value: "etc",
    cafe24Code: "0000",
    naverCode: "ETC",
    coupangCode: "ETC",
  },
];

/**
 * 택배사 코드로 택배사 정보 조회
 */
export function getCarrierByValue(value: string): Carrier | undefined {
  return CARRIERS.find((c) => c.value === value);
}

/**
 * Cafe24 추가 코드 매핑 (일부 Cafe24에서 다른 코드 사용)
 */
const CAFE24_EXTRA_CODES: Record<string, string> = {
  "0001": "hanjin",   // 한진택배 (구버전 코드)
  "0018": "hanjin",   // 한진택배 (신버전 코드)
};

/**
 * 채널별 코드로 택배사 정보 조회
 */
export function getCarrierByChannelCode(
  channel: "cafe24" | "naver" | "coupang",
  code: string
): Carrier | undefined {
  // Cafe24 추가 코드 매핑 확인
  if (channel === "cafe24" && CAFE24_EXTRA_CODES[code]) {
    return CARRIERS.find((c) => c.value === CAFE24_EXTRA_CODES[code]);
  }

  const codeKey = `${channel}Code` as keyof Carrier;
  return CARRIERS.find((c) => c[codeKey] === code);
}

/**
 * 택배사명으로 택배사 정보 조회 (부분 일치)
 */
export function getCarrierByLabel(label: string): Carrier | undefined {
  const normalized = label.toLowerCase().replace(/\s/g, "");
  return CARRIERS.find((c) =>
    c.label.toLowerCase().replace(/\s/g, "").includes(normalized)
  );
}

/**
 * 택배사 Select 옵션 생성
 */
export function getCarrierOptions(): { label: string; value: string }[] {
  return CARRIERS.map((c) => ({
    label: c.label,
    value: c.value,
  }));
}

/**
 * 채널에 맞는 택배사 코드 변환
 */
export function getChannelCarrierCode(
  carrierValue: string,
  channel: "cafe24" | "naver" | "coupang"
): string | undefined {
  const carrier = getCarrierByValue(carrierValue);
  if (!carrier) return undefined;

  const codeKey = `${channel}Code` as keyof Carrier;
  return carrier[codeKey] as string | undefined;
}
