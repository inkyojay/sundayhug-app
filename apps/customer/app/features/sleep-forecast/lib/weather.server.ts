/**
 * 날씨 API 연동 (OpenWeatherMap)
 * 
 * 현재 날씨 데이터를 가져와 수면 예보에 활용합니다.
 */

import type { WeatherData } from "./types";

// OpenWeatherMap API 응답 타입
interface OpenWeatherResponse {
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  name: string;
}

// 기본 위치 (서울)
const DEFAULT_LOCATION = {
  lat: 37.5665,
  lon: 126.9780,
};

/**
 * OpenWeatherMap API로 현재 날씨 가져오기
 */
export async function fetchWeather(
  lat?: number,
  lon?: number
): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  // API 키가 없으면 기본값 반환 (개발 환경용)
  if (!apiKey) {
    console.warn("OPENWEATHER_API_KEY가 설정되지 않았습니다. 기본값을 사용합니다.");
    return getDefaultWeather();
  }

  const latitude = lat ?? DEFAULT_LOCATION.lat;
  const longitude = lon ?? DEFAULT_LOCATION.lon;

  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric"); // 섭씨 온도
    url.searchParams.set("lang", "kr"); // 한국어 설명

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      // 캐시: 30분
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data: OpenWeatherResponse = await response.json();

    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0]?.description,
      icon: data.weather[0]?.icon,
    };
  } catch (error) {
    console.error("날씨 API 호출 실패:", error);
    return getDefaultWeather();
  }
}

/**
 * 날씨 API 실패 시 기본값 반환
 * 계절/시간대 기반 추정값
 */
function getDefaultWeather(): WeatherData {
  const month = new Date().getMonth() + 1;
  
  // 계절별 기본 온도/습도 추정
  let temp: number;
  let humidity: number;
  
  if (month >= 6 && month <= 8) {
    // 여름
    temp = 28;
    humidity = 75;
  } else if (month >= 12 || month <= 2) {
    // 겨울
    temp = 0;
    humidity = 45;
  } else if (month >= 3 && month <= 5) {
    // 봄
    temp = 15;
    humidity = 55;
  } else {
    // 가을
    temp = 18;
    humidity = 55;
  }

  return {
    temp,
    humidity,
    pressure: 1013, // 평균 기압
    description: "날씨 정보 없음",
  };
}

/**
 * 날씨 아이콘 URL 생성
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * 날씨 상태에 따른 이모지 반환
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

