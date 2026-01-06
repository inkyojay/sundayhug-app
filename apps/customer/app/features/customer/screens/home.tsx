/**
 * 고객 서비스 홈 화면 (새로운 디자인)
 *
 * - Bento Grid 스타일
 * - 크림색 배경
 * - 오렌지/다크 카드 조합
 */
import type { Route } from "./+types/home";

import { Link, useLoaderData, data } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Moon,
  Sun,
  Monitor,
  MessageCircleQuestion,
  ChevronRight,
  Sparkles,
  Gift
} from "lucide-react";
import { Theme, useTheme } from "remix-themes";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "썬데이허그 | Sunday Hug" },
    { name: "description", content: "썬데이허그 고객 서비스 - 디지털 보증서, 수면 환경 분석" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  // Feature Flags
  const features = {
    chatEnabled: true, // 육아상담
    blogEnabled: true, // 블로그
  };
  
  if (user) {
    const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0];
    const firstName = name?.includes(" ") ? name.split(" ")[0] : name;
    return data({
      isLoggedIn: true,
      userName: name || "회원",
      firstName: firstName || "회원",
      features,
    });
  }
  
  return data({
    isLoggedIn: false,
    userName: null,
    firstName: null,
    features,
  });
}

export default function CustomerHomeScreen() {
  const { isLoggedIn, firstName, features } = useLoaderData<typeof loader>();
  const [theme, setTheme, metadata] = useTheme();
  const { t } = useTranslation(["customer", "common"]);

  // 현재 테마 상태 확인
  const isSystemTheme = metadata.definedBy === "SYSTEM";
  const isLight = theme === Theme.LIGHT;

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212] transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {/* Hero Section */}
        <div className="mb-10 md:mb-14">
          {/* 상단 배지 + 테마 토글 */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Sparkles className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("common:brand.customerService")}</span>
            </div>
            
            {/* Theme Toggle - 3단 세그먼트 */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
              {/* System */}
              <button
                onClick={() => setTheme(null)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isSystemTheme 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
                title="시스템 설정"
              >
                <Monitor className="w-5 h-5" />
              </button>
              
              {/* Light */}
              <button
                onClick={() => setTheme(Theme.LIGHT)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  !isSystemTheme && isLight 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
                title="라이트 모드"
              >
                <Sun className="w-5 h-5" />
              </button>
              
              {/* Dark */}
              <button
                onClick={() => setTheme(Theme.DARK)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  !isSystemTheme && !isLight 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
                title="다크 모드"
              >
                <Moon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-light tracking-tight leading-tight">
            {isLoggedIn ? (
              <>
                <span className="font-bold text-gray-900 dark:text-white">Hello,</span>{" "}
                <span className="text-gray-400">{t("customer:home.welcome.loggedIn", { name: firstName })}</span>
              </>
            ) : (
              <>
                <span className="font-bold text-gray-900 dark:text-white">Welcome to</span><br />
                <span className="text-gray-400">Sunday Hug.</span>
              </>
            )}
          </h1>
          <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg md:text-xl max-w-lg">
            {t("customer:home.subtitle")}
          </p>
        </div>

        {/* 후기 이벤트 버튼 - 이벤트 전용 페이지로 연결 */}
        <Link 
          to={isLoggedIn ? "/customer/event/review" : "/customer/login?redirect=/customer/event/review"}
          className="block mb-4 md:mb-5"
        >
          <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-md group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FF6B35]/10 dark:bg-[#FF6B35]/20 rounded-full flex items-center justify-center">
                  <Gift className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">{t("customer:home.event.reviewTitle")}</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t("customer:home.event.reviewDescription")}</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>

        {/* 처음이신가요? / 마이페이지 카드 */}
        {isLoggedIn ? (
          <Link 
            to="/customer/mypage"
            className="block mb-4 md:mb-5 group"
          >
            <div className="p-6 md:p-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium tracking-wider uppercase mb-1">
                      My Page
                    </p>
                    <h3 className="text-white text-2xl font-bold">
                      {t("customer:mypage.title")}
                    </h3>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="mb-4 md:mb-5 p-6 md:p-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-white text-2xl font-bold mb-2">
                  {t("customer:home.firstVisit.title")}
                </h3>
                <p className="text-gray-400">
                  {t("customer:home.firstVisit.description")}
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button
                  asChild
                  className="flex-1 md:flex-none bg-white text-gray-900 hover:bg-gray-100 px-6"
                >
                  <Link to="/customer/login">{t("common:buttons.login")}</Link>
                </Button>
                <Button
                  asChild
                  className="flex-1 md:flex-none bg-white/10 text-white border border-white/30 hover:bg-white/20 px-6"
                >
                  <Link to="/customer/register">{t("common:buttons.register")}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bento Grid - 2개 카드만 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {/* 정품 인증 - Large Orange Card */}
          <Link
            to="/customer/warranty"
            className="group"
          >
            <div className="h-full min-h-[280px] md:min-h-[350px] bg-[#FF6B35] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium tracking-wider uppercase">
                    {t("customer:home.services.warranty.label")}
                  </p>
                  <h2 className="text-white text-3xl md:text-4xl font-bold mt-2">
                    {t("customer:home.services.warranty.title")}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <p className="text-white/90 text-base md:text-lg">
                  {t("customer:home.services.warranty.description")}
                </p>
                <div className="mt-4 flex items-center text-white/80 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">{t("customer:home.services.warranty.button")}</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* 수면 분석 - Large Dark Card */}
          <Link
            to="/customer/sleep"
            className="group"
          >
            <div className="h-full min-h-[280px] md:min-h-[350px] bg-[#1A1A1A] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">
                    {t("customer:home.services.sleepAnalysis.label")}
                  </p>
                  <h2 className="text-white text-3xl md:text-4xl font-bold mt-2">
                    {t("customer:home.services.sleepAnalysis.title")}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Moon className="w-6 h-6 text-white" />
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-base md:text-lg">
                  {t("customer:home.services.sleepAnalysis.description")}
                </p>
                <div className="mt-4 flex items-center text-gray-500 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">{t("customer:home.services.sleepAnalysis.button")}</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 추가 서비스 - AI 상담 & 블로그 (Feature Flag로 제어) */}
        {(features.chatEnabled || features.blogEnabled) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI 육아 상담 */}
            {features.chatEnabled && (
              <Link
                to="/customer/chat"
                className="group"
              >
                <div className="h-full min-h-[180px] bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-orange-200 text-sm font-medium tracking-wider uppercase">
                        {t("customer:home.services.chat.label")}
                      </p>
                      <h2 className="text-white text-2xl md:text-3xl font-bold mt-1">
                        {t("customer:home.services.chat.title")}
                      </h2>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircleQuestion className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div>
                    <p className="text-orange-100 text-sm md:text-base">
                      {t("customer:home.services.chat.description")}
                    </p>
                    <div className="mt-3 flex items-center text-white/80 group-hover:text-white transition-colors">
                      <span className="text-sm font-medium">{t("customer:home.services.chat.button")}</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* 블로그 */}
            {features.blogEnabled && (
              <Link
                to="/customer/blog"
                className="group"
              >
                <div className="h-full min-h-[180px] bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-emerald-200 text-sm font-medium tracking-wider uppercase">
                        {t("customer:home.services.blog.label")}
                      </p>
                      <h2 className="text-white text-2xl md:text-3xl font-bold mt-1">
                        {t("customer:home.services.blog.title")}
                      </h2>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div>
                    <p className="text-emerald-100 text-sm md:text-base">
                      {t("customer:home.services.blog.description")}
                    </p>
                    <div className="mt-3 flex items-center text-white/80 group-hover:text-white transition-colors">
                      <span className="text-sm font-medium">{t("customer:home.services.blog.button")}</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <a
            href="https://www.sundayhug.kr/sleepport.html"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl p-5 hover:bg-white dark:hover:bg-gray-800 transition-colors border border-gray-200/50 dark:border-gray-700/50 group"
          >
            <MessageCircleQuestion className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t("customer:home.quickLinks.manual")}
            </h4>
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-2 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href="https://pf.kakao.com/_crxgDxj/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl p-5 hover:bg-white dark:hover:bg-gray-800 transition-colors border border-gray-200/50 dark:border-gray-700/50 group"
          >
            <svg className="w-6 h-6 text-[#FAE100] mb-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            <h4 className="font-semibold text-gray-900 dark:text-white">{t("customer:home.quickLinks.customerService")}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("customer:home.quickLinks.kakaoChat")}</p>
          </a>
        </div>

      </div>
    </div>
  );
}
