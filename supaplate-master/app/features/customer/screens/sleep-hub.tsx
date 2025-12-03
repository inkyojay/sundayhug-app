/**
 * 수면 분석 허브 페이지
 * 
 * - 수면 환경 분석
 * - 우리 아기 수면 예보 (준비중)
 */
import type { Route } from "./+types/sleep-hub";

import { Link } from "react-router";
import { 
  ArrowLeft, 
  Moon, 
  Sparkles,
  ChevronRight,
  Camera,
  CloudSun,
  Clock
} from "lucide-react";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "수면 분석 | 썬데이허그" },
    { name: "description", content: "AI 수면 환경 분석과 수면 예보 서비스" },
  ];
}

export default function SleepHubScreen() {
  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">수면 분석</h1>
        </div>

        {/* Hero Section */}
        <div className="bg-[#1A1A1A] rounded-3xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">AI Sleep Tech</p>
              <h2 className="text-white text-xl font-bold">우리 아이 수면 케어</h2>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            AI 기술로 아기의 수면 환경을 분석하고,<br />
            최적의 수면 솔루션을 제안해드립니다.
          </p>
        </div>

        {/* Menu Cards */}
        <div className="space-y-4">
          {/* 수면 환경 분석 */}
          <Link to="/customer/sleep/analyze" className="block group">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-lg">수면 환경 분석</h3>
                    <span className="px-2 py-0.5 bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-medium rounded-full">
                      NEW
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">
                    아기 수면 공간 사진을 AI가 분석하여<br />
                    안전도와 개선점을 알려드려요
                  </p>
                  <div className="flex items-center text-[#FF6B35] text-sm font-medium">
                    <span>분석하기</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* 우리 아기 수면 예보 (준비중) */}
          <div className="block group cursor-not-allowed">
            <div className="bg-white/60 rounded-2xl p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CloudSun className="w-7 h-7 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-400 text-lg">우리 아기 수면 예보</h3>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-medium rounded-full">
                      준비중
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    날씨, 계절, 아기 컨디션을 분석하여<br />
                    오늘의 수면 예보를 알려드려요
                  </p>
                  <div className="flex items-center text-gray-400 text-sm font-medium">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>곧 출시됩니다</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 p-5 bg-white/60 rounded-2xl border border-gray-200/50">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#FF6B35] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">알고 계셨나요?</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                아기의 수면 환경은 성장 발달에 매우 중요해요.
                적절한 온도, 습도, 조명은 깊은 수면을 도와줍니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






