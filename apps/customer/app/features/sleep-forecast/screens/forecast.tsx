/**
 * 수면 예보 페이지
 * - 오늘 컨디션 입력
 * - 예보 결과 표시
 */
import type { Route } from "./+types/forecast";

import { Link, useLoaderData, useFetcher, data } from "react-router";
import { 
  ArrowLeft, 
  CloudSun, 
  Moon, 
  Sun, 
  ThermometerSun,
  Droplets,
  Gauge,
  Baby,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  MapPin,
} from "lucide-react";
import React, { useState, useEffect } from "react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import { LEVEL_LABELS, getWeatherEmoji, calculateMonthsOldClient } from "../lib/types";
import type { SleepForecast, WeatherData } from "../lib/types";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "수면 예보 | 썬데이허그" },
    { name: "description", content: "오늘 밤 아기의 수면 컨디션을 예측하고 맞춤 가이드를 받아보세요." },
  ];
}

// 날씨 가져오기 (서버에서만 실행)
async function fetchWeatherData(): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    // API 키 없으면 계절 기반 기본값
    const month = new Date().getMonth() + 1;
    let temp: number, humidity: number;
    
    if (month >= 6 && month <= 8) {
      temp = 28; humidity = 75;
    } else if (month >= 12 || month <= 2) {
      temp = 0; humidity = 45;
    } else if (month >= 3 && month <= 5) {
      temp = 15; humidity = 55;
    } else {
      temp = 18; humidity = 55;
    }
    
    return { temp, humidity, pressure: 1013, description: "날씨 정보 없음" };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=37.5665&lon=126.9780&appid=${apiKey}&units=metric&lang=kr`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error("Weather API error");
    
    const data = await response.json();
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0]?.description,
      icon: data.weather[0]?.icon,
    };
  } catch {
    return { temp: 20, humidity: 50, pressure: 1013 };
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ 
      authenticated: false,
      babyProfile: null, 
      existingForecast: null,
      weather: null,
    });
  }

  const today = new Date().toISOString().split("T")[0];

  // 아기 프로필 조회
  const { data: babyProfile } = await supabase
    .from("baby_profiles")
    .select("id, name, birth_date, sleep_sensitivity")
    .eq("user_id", user.id)
    .single();

  // 오늘의 예보 조회
  const { data: existingForecast } = await supabase
    .from("forecast_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 날씨 데이터 가져오기 (UI 표시용)
  const weather = await fetchWeatherData();

  return data({
    authenticated: true,
    babyProfile: babyProfile ? {
      ...babyProfile,
      monthsOld: calculateMonthsOldClient(babyProfile.birth_date),
    } : null,
    existingForecast,
    weather,
  });
}

// 점수에 따른 색상 클래스
function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getLevelBgColor(level: string): string {
  switch (level) {
    case "good": return "bg-green-50 border-green-200";
    case "caution": return "bg-yellow-50 border-yellow-200";
    case "hard": return "bg-red-50 border-red-200";
    default: return "bg-gray-50 border-gray-200";
  }
}

function getLevelTextColor(level: string): string {
  switch (level) {
    case "good": return "text-green-700";
    case "caution": return "text-yellow-700";
    case "hard": return "text-red-700";
    default: return "text-gray-700";
  }
}

export default function SleepForecastScreen() {
  const { authenticated, babyProfile, existingForecast, weather } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  // 폼 상태
  const [napLevel, setNapLevel] = useState<"low" | "normal" | "high">("normal");
  const [outing, setOuting] = useState(false);
  const [mood, setMood] = useState<"good" | "normal" | "bad">("normal");
  const [specialIssue, setSpecialIssue] = useState<"vaccine" | "cold" | "teething" | "none">("none");
  
  // 결과 상태
  const [forecast, setForecast] = useState<SleepForecast | null>(
    existingForecast ? {
      date: existingForecast.date,
      score: existingForecast.score,
      level: existingForecast.level as "good" | "caution" | "hard",
      reasons: existingForecast.reasons as string[],
      actions: existingForecast.actions as string[],
      weather: {
        temp: existingForecast.weather_temp,
        humidity: existingForecast.weather_humidity,
        pressure: existingForecast.weather_pressure,
      },
    } : null
  );
  const [babyInfo, setBabyInfo] = useState(babyProfile ? {
    id: babyProfile.id,
    name: babyProfile.name,
    monthsOld: babyProfile.monthsOld,
  } : null);

  const isLoading = fetcher.state !== "idle";

  // 예보 결과 업데이트
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.forecast) {
      setForecast(fetcher.data.forecast);
      setBabyInfo(fetcher.data.baby);
    }
  }, [fetcher.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("napLevel", napLevel);
    formData.append("outing", String(outing));
    formData.append("mood", mood);
    formData.append("specialIssue", specialIssue);
    if (babyProfile?.id) {
      formData.append("babyId", babyProfile.id);
    }

    fetcher.submit(formData, { 
      method: "post", 
      action: "/api/sleep-forecast",
    });
  };

  const handleReset = () => {
    setForecast(null);
    setNapLevel("normal");
    setOuting(false);
    setMood("normal");
    setSpecialIssue("none");
  };

  // 비로그인 상태
  if (!authenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F5F0]">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Moon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요해요</h2>
            <p className="text-gray-500 mb-6">수면 예보를 받으려면 로그인해주세요.</p>
            <Link to="/customer/login">
              <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                로그인하기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 아기 프로필 없음
  if (!babyProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F5F0]">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">아기 정보가 필요해요</h2>
            <p className="text-gray-500 mb-6">맞춤 수면 예보를 위해 아기 정보를 먼저 등록해주세요.</p>
            <Link to="/customer/chat/baby-profile">
              <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                아기 정보 등록하기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F0]">
      <Header />

      <main className="flex-1 p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          
          {/* 아기 정보 카드 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
                <Baby className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{babyProfile.name || "우리 아기"}</h3>
                <p className="text-sm text-gray-500">{babyProfile.monthsOld}개월</p>
              </div>
            </div>
          </div>

          {/* 날씨 정보 카드 */}
          {weather && (
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getWeatherEmoji(weather.icon)}</span>
                  <div>
                    <p className="text-sm text-gray-500">현재 날씨</p>
                    <p className="font-bold text-gray-900">{weather.description || "맑음"}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <ThermometerSun className="w-4 h-4" />
                    <span>{weather.temp}°C</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Droplets className="w-4 h-4" />
                    <span>{weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Gauge className="w-4 h-4" />
                    <span>{weather.pressure}hPa</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 예보 결과 표시 */}
          {forecast ? (
            <ForecastResult 
              forecast={forecast} 
              baby={babyInfo} 
              onReset={handleReset}
            />
          ) : (
            /* 입력 폼 */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 낮잠 시간 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  오늘 낮잠은 어땠나요?
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "low", label: "적음", emoji: "😴" },
                    { value: "normal", label: "보통", emoji: "😊" },
                    { value: "high", label: "많음", emoji: "😪" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNapLevel(option.value as typeof napLevel)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        napLevel === option.value
                          ? "border-[#FF6B35] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{option.emoji}</span>
                      <span className={`text-sm font-medium ${
                        napLevel === option.value ? "text-[#FF6B35]" : "text-gray-600"
                      }`}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 오늘 기분 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-500" />
                  오늘 아기 컨디션은?
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "good", label: "좋음", emoji: "😄" },
                    { value: "normal", label: "보통", emoji: "😐" },
                    { value: "bad", label: "예민함", emoji: "😢" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMood(option.value as typeof mood)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        mood === option.value
                          ? "border-[#FF6B35] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{option.emoji}</span>
                      <span className={`text-sm font-medium ${
                        mood === option.value ? "text-[#FF6B35]" : "text-gray-600"
                      }`}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 외출 여부 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  오늘 외출했나요?
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: false, label: "집에 있었어요", emoji: "🏠" },
                    { value: true, label: "외출했어요", emoji: "🚗" },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => setOuting(option.value)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        outing === option.value
                          ? "border-[#FF6B35] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{option.emoji}</span>
                      <span className={`text-sm font-medium ${
                        outing === option.value ? "text-[#FF6B35]" : "text-gray-600"
                      }`}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 특이사항 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  특이사항이 있나요?
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "none", label: "없음", emoji: "✅" },
                    { value: "vaccine", label: "예방접종", emoji: "💉" },
                    { value: "cold", label: "감기", emoji: "🤧" },
                    { value: "teething", label: "이앓이", emoji: "🦷" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSpecialIssue(option.value as typeof specialIssue)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        specialIssue === option.value
                          ? "border-[#FF6B35] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{option.emoji}</span>
                      <span className={`text-sm font-medium ${
                        specialIssue === option.value ? "text-[#FF6B35]" : "text-gray-600"
                      }`}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 제출 버튼 */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-[#FF6B35] to-orange-500 hover:from-[#FF6B35]/90 hover:to-orange-500/90 text-white rounded-2xl font-bold text-lg shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    예보 생성 중...
                  </>
                ) : (
                  <>
                    <Moon className="w-5 h-5 mr-2" />
                    오늘 밤 수면 예보 받기
                  </>
                )}
              </Button>

              {/* 안내 문구 */}
              <p className="text-xs text-gray-400 text-center">
                💡 예보는 참고용이며, 실제 상황과 다를 수 있어요.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

// 헤더 컴포넌트
function Header() {
  return (
    <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
      <Link 
        to="/customer" 
        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </Link>
      <div className="flex-1">
        <h1 className="font-bold text-gray-900">수면 예보</h1>
        <p className="text-xs text-gray-500">오늘 밤 아기 수면 컨디션 예측</p>
      </div>
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
        <Moon className="w-5 h-5 text-white" />
      </div>
    </header>
  );
}

// 예보 결과 컴포넌트
function ForecastResult({ 
  forecast, 
  baby,
  onReset,
}: { 
  forecast: SleepForecast;
  baby: { id: string; name: string | null; monthsOld: number } | null;
  onReset: () => void;
}) {
  const levelInfo = LEVEL_LABELS[forecast.level];
  
  return (
    <div className="space-y-4">
      {/* 메인 점수 카드 */}
      <div className={`rounded-2xl p-6 border-2 ${getLevelBgColor(forecast.level)}`}>
        <div className="text-center mb-4">
          <span className="text-5xl mb-2 block">{levelInfo.emoji}</span>
          <h2 className={`text-2xl font-bold ${getLevelTextColor(forecast.level)}`}>
            {levelInfo.text}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {baby?.name || "아기"}의 오늘 밤 수면 예보
          </p>
        </div>

        {/* 점수 게이지 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">수면 점수</span>
            <span className={`text-2xl font-bold ${getScoreColor(forecast.score)}`}>
              {forecast.score}점
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getScoreBgColor(forecast.score)} transition-all duration-500`}
              style={{ width: `${forecast.score}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>힘든 밤</span>
            <span>편안한 밤</span>
          </div>
        </div>
      </div>

      {/* 날씨 정보 */}
      {forecast.weather && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-blue-500" />
            오늘 날씨 정보
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <ThermometerSun className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-bold text-gray-900">{forecast.weather.temp}°C</p>
              <p className="text-xs text-gray-500">기온</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <Droplets className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-gray-900">{forecast.weather.humidity}%</p>
              <p className="text-xs text-gray-500">습도</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <Gauge className="w-5 h-5 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold text-gray-900">{forecast.weather.pressure}</p>
              <p className="text-xs text-gray-500">기압(hPa)</p>
            </div>
          </div>
        </div>
      )}

      {/* 예보 사유 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          예보 분석
        </h4>
        <ul className="space-y-2">
          {forecast.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 행동 가이드 */}
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-100">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#FF6B35]" />
          오늘 밤 이렇게 해보세요
        </h4>
        <ul className="space-y-3">
          {forecast.actions.map((action, i) => (
            <li key={i} className="flex items-start gap-3 bg-white rounded-xl p-3">
              <span className="w-6 h-6 bg-[#FF6B35] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-gray-700 text-sm">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 면책 문구 */}
      <div className="bg-gray-100 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500">
          💡 이 예보는 입력된 정보를 기반으로 한 참고용이며,<br />
          실제 상황과 다를 수 있습니다. 전문의 상담을 대체하지 않습니다.
        </p>
      </div>

      {/* 다시 예보 받기 버튼 */}
      <Button
        type="button"
        onClick={onReset}
        variant="outline"
        className="w-full h-12 rounded-xl border-2 border-gray-200 hover:border-[#FF6B35] hover:text-[#FF6B35]"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        다시 예보 받기
      </Button>
    </div>
  );
}
