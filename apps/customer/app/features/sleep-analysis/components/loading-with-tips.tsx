/**
 * 수면 분석 로딩 중 수면 팁 카드 컴포넌트
 *
 * 분석 대기 중 사용자에게 유용한 수면 팁을 순환 표시.
 */
import { useState, useEffect } from "react";
import { Moon, Baby, Shield, Clock, Thermometer, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SleepTip {
  icon: LucideIcon;
  title: string;
  tip: string;
  color: string;
  bgColor: string;
}

const sleepTips: SleepTip[] = [
  {
    icon: Moon,
    title: "신생아 수면 시간",
    tip: "신생아는 하루 16~17시간의 수면이 필요해요. 낮과 밤의 구분 없이 2~4시간 간격으로 잠을 자는 것이 정상이에요.",
    color: "from-indigo-500 to-purple-600",
    bgColor: "bg-indigo-50",
  },
  {
    icon: Shield,
    title: "안전한 수면 환경",
    tip: "아기는 단단하고 평평한 매트리스에서 등을 대고 자야 해요. 베개, 이불, 인형은 질식 위험이 있어요.",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
  },
  {
    icon: Thermometer,
    title: "적정 실내 온도",
    tip: "아기 방의 적정 온도는 20~22°C예요. 너무 덥거나 추우면 수면의 질이 떨어지고 영아돌연사 위험이 높아져요.",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
  },
  {
    icon: Clock,
    title: "수면 루틴의 중요성",
    tip: "생후 3개월부터 일정한 수면 루틴을 만들어주세요. 목욕 → 수유 → 자장가 순서로 규칙적인 패턴이 도움돼요.",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Music,
    title: "백색소음 효과",
    tip: "엄마 배 속 소리와 비슷한 백색소음은 아기를 안정시켜요. 볼륨은 50dB 이하로 아기와 거리를 두고 사용하세요.",
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
  },
  {
    icon: Baby,
    title: "낮잠 vs 밤잠",
    tip: "생후 4개월이 지나면 낮잠을 줄이고 밤잠을 늘려주세요. 저녁 7~8시 취침이 성장 호르몬 분비에 좋아요.",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
  },
];

interface LoadingWithTipsProps {
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function LoadingWithTips({ t }: LoadingWithTipsProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % sleepTips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentTip = sleepTips[currentTipIndex];
  const Icon = currentTip.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* 로딩 스피너와 메시지 */}
      <div className="flex items-center gap-3 mb-10">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{t("sleep-analysis:upload.analyzing")}</p>
      </div>

      {/* 수면 팁 카드 */}
      <div className="w-full max-w-md">
        <div
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentTip.color} p-8 text-white shadow-xl transition-all duration-500`}
        >
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
            <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white" />
          </div>

          {/* 콘텐츠 */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="rounded-2xl bg-white/20 p-3">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold">{currentTip.title}</h3>
            </div>
            <p className="text-white/90 leading-relaxed">
              {currentTip.tip}
            </p>
          </div>
        </div>

        {/* 인디케이터 */}
        <div className="flex justify-center gap-2 mt-6">
          {sleepTips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentTipIndex
                  ? "w-8 bg-[#FF6B35]"
                  : "w-2.5 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        {/* 안내 메시지 */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
          {t("sleep-analysis:upload.analyzingDescription")}
        </p>
      </div>
    </div>
  );
}
