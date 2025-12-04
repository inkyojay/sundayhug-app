/**
 * 고객 마이페이지 메인 (Bento Grid 스타일)
 * 
 * - Hello, 이름 인사말
 * - Bento 카드 레이아웃 (수면분석, A/S, 보증서, 분석이력, 내정보)
 */
import type { Route } from "./+types/index";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  Moon, 
  Sun,
  Monitor,
  Headphones,
  Shield,
  FileText,
  User,
  ChevronRight
} from "lucide-react";
import { Theme, useTheme } from "remix-themes";

import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "마이페이지 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  // 로그인 안 되어 있으면 로그인 페이지로
  if (!user) {
    throw redirect("/customer/login");
  }
  
  // profiles에서 추가 정보 가져오기
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  
  // 이름에서 first name 추출 (한글이면 전체, 영문이면 첫 단어)
  const fullName = profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "회원";
  const firstName = fullName.includes(" ") ? fullName.split(" ")[0] : fullName;
  
  return data({
    user: {
      id: user.id,
      email: user.email,
      name: fullName,
      firstName: firstName,
      phone: profile?.phone,
      avatarUrl: user.user_metadata?.avatar_url || profile?.kakao_profile_image,
      isVip: true,
    },
  });
}

export default function CustomerMypageIndexScreen() {
  const { user } = useLoaderData<typeof loader>();
  const [theme, setTheme, metadata] = useTheme();

  // 현재 테마 상태 확인
  const isSystemTheme = metadata.definedBy === "SYSTEM";
  const isDark = theme === Theme.DARK;
  const isLight = theme === Theme.LIGHT;

  // 테마 순환: System → Light → Dark → System
  const cycleTheme = () => {
    if (isSystemTheme) {
      setTheme(Theme.LIGHT);
    } else if (isLight) {
      setTheme(Theme.DARK);
    } else {
      setTheme(null); // System
    }
  };

  // 현재 테마 아이콘과 라벨
  const getThemeInfo = () => {
    if (isSystemTheme) {
      return { icon: Monitor, label: "시스템" };
    } else if (isLight) {
      return { icon: Sun, label: "라이트" };
    } else {
      return { icon: Moon, label: "다크" };
    }
  };

  const themeInfo = getThemeInfo();
  const ThemeIcon = themeInfo.icon;

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#1A1A1A] transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {/* Greeting Section */}
        <div className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">
              <span className="font-bold text-gray-900 dark:text-white">Hello,</span>{" "}
              <span className="text-gray-400">{user.firstName}님.</span>
            </h1>
            <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
              오늘도 썬데이허그와 함께 편안한 하루 보내세요.
            </p>
          </div>
          
          {/* Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
            title={`현재: ${themeInfo.label} 모드 (클릭하여 변경)`}
          >
            <ThemeIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">
              {themeInfo.label}
            </span>
          </button>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {/* 수면 분석 - Large Dark Card */}
          <Link 
            to="/customer/sleep"
            className="col-span-2 row-span-2 group"
          >
            <div className="h-full min-h-[280px] md:min-h-[360px] bg-[#1A1A1A] rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">
                    AI Sleep Tech
                  </p>
                  <h2 className="text-white text-3xl md:text-4xl font-bold mt-2">
                    수면 분석
                  </h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Moon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 text-base md:text-lg">
                  AI가 우리 아이 수면 환경을 분석하고<br />
                  맞춤 솔루션을 제공해드립니다.
                </p>
                <div className="mt-4 flex items-center text-gray-500 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">분석하기</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* 내 보증서 - Medium White Card */}
          <Link 
            to="/customer/mypage/warranties"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Warranty
                </p>
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              
              <h3 className="text-gray-900 dark:text-white text-lg md:text-xl font-bold">
                내 보증서
              </h3>
            </div>
          </Link>

          {/* 분석 이력 - Medium White Card */}
          <Link 
            to="/customer/mypage/analyses"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  History
                </p>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              
              <h3 className="text-gray-900 dark:text-white text-lg md:text-xl font-bold">
                분석 이력
              </h3>
            </div>
          </Link>

          {/* A/S 접수 - Small White Card */}
          <Link 
            to="/customer/mypage/as"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Support
                </p>
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              
              <h3 className="text-gray-900 dark:text-white text-lg md:text-xl font-bold">
                A/S 접수
              </h3>
            </div>
          </Link>

          {/* 내 정보 - Small White Card */}
          <Link 
            to="/customer/mypage/profile"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Profile
                </p>
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              
              <h3 className="text-gray-900 dark:text-white text-lg md:text-xl font-bold">
                내 정보
              </h3>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
