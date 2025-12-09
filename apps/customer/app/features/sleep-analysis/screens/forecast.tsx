/**
 * 우리 아기 수면 예보
 * 
 * 날씨, 계절, 아기 컨디션을 분석하여 오늘의 수면 예보를 제공
 */
import type { Route } from "./+types/forecast";

import { Link, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  CloudSun, 
  Moon, 
  Sun,
  Thermometer,
  Droplets,
  Wind,
  Baby,
  Clock,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "수면 예보 | 썬데이허그" },
    { name: "description", content: "오늘의 아기 수면 예보를 확인하세요" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ babyProfiles: [], isLoggedIn: false, forecast: null });
  }

  // 아기 프로필 가져오기
  const { data: babyProfiles } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return data({ 
    babyProfiles: babyProfiles || [],
    isLoggedIn: true,
    forecast: null // 실제 예보 데이터는 클라이언트에서 생성
  });
}

// 월령 계산
function calculateMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                 (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

// 월령별 권장 수면 시간 (시간)
function getRecommendedSleep(months: number): { total: number; night: number; naps: number } {
  if (months <= 3) return { total: 16, night: 8, naps: 8 };
  if (months <= 6) return { total: 14, night: 10, naps: 4 };
  if (months <= 12) return { total: 13, night: 11, naps: 2 };
  if (months <= 24) return { total: 12, night: 11, naps: 1 };
  return { total: 11, night: 10, naps: 1 };
}

// 현재 계절
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

// 수면 점수 계산 (임의)
function calculateSleepScore(): number {
  // 실제로는 여러 요소를 고려해 계산
  return Math.floor(Math.random() * 20) + 75; // 75-95 사이
}

export default function SleepForecastScreen() {
  const { babyProfiles, isLoggedIn } = useLoaderData<typeof loader>();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(
    babyProfiles.length > 0 ? babyProfiles[0].id : null
  );
  const [forecast, setForecast] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedBaby = babyProfiles.find(b => b.id === selectedBabyId);
  const babyMonths = selectedBaby ? calculateMonths(selectedBaby.birth_date) : null;
  const recommendedSleep = babyMonths ? getRecommendedSleep(babyMonths) : null;
  const season = getCurrentSeason();

  // 예보 생성
  useEffect(() => {
    if (selectedBaby) {
      setIsLoading(true);
      // 실제 구현에서는 API 호출
      setTimeout(() => {
        const score = calculateSleepScore();
        setForecast({
          score,
          grade: score >= 90 ? "최상" : score >= 80 ? "좋음" : score >= 70 ? "보통" : "주의",
          gradeColor: score >= 90 ? "text-green-500" : score >= 80 ? "text-blue-500" : score >= 70 ? "text-yellow-500" : "text-red-500",
          weather: {
            temp: season === "여름" ? 28 : season === "겨울" ? 2 : 18,
            humidity: 55,
            condition: season === "여름" ? "맑음" : season === "겨울" ? "흐림" : "맑음",
          },
          tips: [
            season === "여름" 
              ? "오늘은 덥습니다. 실내 온도를 22-24도로 유지해주세요."
              : season === "겨울"
              ? "오늘은 춥습니다. 실내 온도를 20-22도로 유지해주세요."
              : "오늘 날씨가 좋아요. 환기를 충분히 해주세요.",
            babyMonths && babyMonths < 6 
              ? "이 시기 아기는 밤낮 구분이 어려워요. 낮에는 밝게, 밤에는 어둡게 해주세요."
              : "취침 30분 전 조명을 낮추면 수면 호르몬 분비에 도움이 돼요.",
            "오늘 밤 잠들기 좋은 시간은 저녁 7-8시 사이입니다.",
          ],
          bedtime: babyMonths && babyMonths < 12 ? "19:00 ~ 20:00" : "20:00 ~ 21:00",
          napTimes: babyMonths && babyMonths < 6 
            ? ["오전 9-10시", "낮 12-1시", "오후 3-4시"] 
            : babyMonths && babyMonths < 12
            ? ["오전 9-10시", "오후 1-2시"]
            : ["오후 1-2시"],
        });
        setIsLoading(false);
      }, 1000);
    }
  }, [selectedBabyId, selectedBaby, babyMonths, season]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
        <div className="text-center">
          <CloudSun className="w-16 h-16 text-[#FF6B35] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">수면 예보</h1>
          <p className="text-gray-500 mb-6">로그인하고 아기 수면 예보를 확인하세요</p>
          <Button asChild className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
            <Link to="/customer/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (babyProfiles.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212]">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <div className="flex items-center gap-4 mb-8">
            <Link 
              to="/customer/sleep"
              className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">수면 예보</h1>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
            <Baby className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              아기 정보를 등록해주세요
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              수면 예보를 위해 아기 정보가 필요해요
            </p>
            <Button asChild className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
              <Link to="/customer/chat/baby-profile">아기 정보 등록하기</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-900">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/sleep"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">수면 예보</h1>
            <p className="text-indigo-200 text-sm">
              {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
            </p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <Moon className="w-5 h-5 text-yellow-300" />
          </div>
        </div>

        {/* Baby Selector */}
        {babyProfiles.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {babyProfiles.map((baby) => (
              <button
                key={baby.id}
                onClick={() => setSelectedBabyId(baby.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedBabyId === baby.id
                    ? "bg-white text-indigo-900"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {baby.name || "아기"}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white/60">예보를 분석하고 있어요...</p>
          </div>
        ) : forecast && (
          <>
            {/* Score Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-white">{forecast.score}</p>
                      <p className="text-white/80 text-sm">점</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      forecast.score >= 90 ? "bg-green-500" : 
                      forecast.score >= 80 ? "bg-blue-500" : 
                      forecast.score >= 70 ? "bg-yellow-500" : "bg-red-500"
                    } text-white`}>
                      {forecast.grade}
                    </span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mt-4">
                  오늘 {selectedBaby?.name || "아기"} 수면 예보
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {babyMonths}개월 아기 기준
                </p>
              </div>

              {/* Weather Info */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <Thermometer className="w-5 h-5 text-yellow-300 mx-auto mb-1" />
                  <p className="text-white font-bold">{forecast.weather.temp}°C</p>
                  <p className="text-indigo-200 text-xs">기온</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <Droplets className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                  <p className="text-white font-bold">{forecast.weather.humidity}%</p>
                  <p className="text-indigo-200 text-xs">습도</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <CloudSun className="w-5 h-5 text-orange-300 mx-auto mb-1" />
                  <p className="text-white font-bold">{forecast.weather.condition}</p>
                  <p className="text-indigo-200 text-xs">날씨</p>
                </div>
              </div>
            </div>

            {/* Recommended Times */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#FF6B35]" />
                오늘의 추천 시간
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Moon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">밤잠 시작</p>
                    <p className="text-indigo-600 dark:text-indigo-400 text-lg font-bold">{forecast.bedtime}</p>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-5 h-5 text-orange-500" />
                    <p className="font-medium text-gray-900 dark:text-white">낮잠 추천</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {forecast.napTimes.map((time: string, i: number) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300 rounded-full text-sm"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Sleep */}
            {recommendedSleep && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#FF6B35]" />
                  {babyMonths}개월 아기 권장 수면
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#FF6B35]">{recommendedSleep.total}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">총 수면 (시간)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-indigo-500">{recommendedSleep.night}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">밤잠 (시간)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-500">{recommendedSleep.naps}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">낮잠 (시간)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF6B35]" />
                오늘의 수면 팁
              </h3>
              <div className="space-y-3">
                {forecast.tips.map((tip: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-700 dark:text-gray-300 text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

