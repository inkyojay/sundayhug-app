/**
 * 수면 예보 기능 타입 정의
 */

// 아기 프로필 (DB baby_profiles 테이블과 매핑)
export type BabyProfile = {
  id: string;
  name: string | null;
  birthDate: string; // YYYY-MM-DD
  sleepSensitivity: "high" | "normal" | "low"; // 예민함 / 보통 / 잘 잠
};

// 오늘 컨디션 입력
export type TodayStatus = {
  date: string; // YYYY-MM-DD
  napLevel: "low" | "normal" | "high"; // 낮잠 적음/보통/많음
  outing: boolean; // 외출 여부
  mood: "good" | "normal" | "bad"; // 기분
  specialIssue: "vaccine" | "cold" | "teething" | "none"; // 예방접종/감기/이앓이/없음
};

// 날씨 데이터
export type WeatherData = {
  temp: number;      // 기온 (°C)
  humidity: number;  // 습도 (%)
  pressure: number;  // 기압 (hPa)
  description?: string; // 날씨 설명
  icon?: string;     // 아이콘 코드
};

// 수면 예보 결과
export type SleepForecast = {
  date: string; // YYYY-MM-DD
  score: number; // 0~100
  level: "good" | "caution" | "hard";
  reasons: string[]; // 예보 사유
  actions: string[]; // 행동 가이드
  weather?: WeatherData; // 날씨 정보 (UI 표시용)
};

// API 요청 타입
export type ForecastRequest = {
  babyId?: string; // 선택적 (없으면 기본 아기 프로필 사용)
  today: Omit<TodayStatus, "date">; // date는 서버에서 설정
  location?: {
    lat: number;
    lon: number;
  };
};

// API 응답 타입
export type ForecastResponse = {
  success: true;
  forecast: SleepForecast;
  baby: {
    id: string;
    name: string | null;
    monthsOld: number;
  };
} | {
  success: false;
  error: string;
  code: string;
};

// 원더윅스 주차 (대표적인 예민 시기)
export const WONDER_WEEKS = [5, 8, 12, 19, 26, 37, 46, 55, 64, 75] as const;

// 수면 예보 레벨별 라벨
export const LEVEL_LABELS = {
  good: { text: "편안한 밤", emoji: "😴", color: "green" },
  caution: { text: "주의 필요", emoji: "😐", color: "yellow" },
  hard: { text: "힘든 밤 예상", emoji: "😣", color: "red" },
} as const;

/**
 * 날씨 아이콘 코드에 따른 이모지 반환 (클라이언트에서 사용)
 */
export function getWeatherEmoji(iconCode?: string): string {
  if (!iconCode) return "🌤️";
  
  const code = iconCode.slice(0, 2);
  
  switch (code) {
    case "01": return "☀️"; // 맑음
    case "02": return "⛅"; // 구름 조금
    case "03": return "☁️"; // 구름
    case "04": return "☁️"; // 구름 많음
    case "09": return "🌧️"; // 소나기
    case "10": return "🌧️"; // 비
    case "11": return "⛈️"; // 천둥번개
    case "13": return "❄️"; // 눈
    case "50": return "🌫️"; // 안개
    default: return "🌤️";
  }
}

/**
 * 출생일로부터 개월 수 계산 (클라이언트에서 사용)
 */
export function calculateMonthsOldClient(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 
    + (today.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

