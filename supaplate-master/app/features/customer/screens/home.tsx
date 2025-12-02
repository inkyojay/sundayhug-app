/**
 * 고객 서비스 홈 화면 (새로운 디자인)
 * 
 * - Bento Grid 스타일
 * - 크림색 배경
 * - 오렌지/다크 카드 조합
 */
import type { Route } from "./+types/home";

import { Link, useLoaderData, data } from "react-router";
import { 
  ShieldCheck, 
  Moon, 
  BookOpen,
  MessageCircleQuestion,
  ChevronRight,
  Sparkles,
  MessageCircle
} from "lucide-react";

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
  
  if (user) {
    const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0];
    const firstName = name?.includes(" ") ? name.split(" ")[0] : name;
    return data({
      isLoggedIn: true,
      userName: name || "회원",
      firstName: firstName || "회원",
    });
  }
  
  return data({
    isLoggedIn: false,
    userName: null,
    firstName: null,
  });
}

export default function CustomerHomeScreen() {
  const { isLoggedIn, firstName } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {/* Hero Section */}
        <div className="mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white border border-gray-200">
            <Sparkles className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-sm font-medium text-gray-600">썬데이허그 고객 서비스</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-light tracking-tight leading-tight">
            {isLoggedIn ? (
              <>
                <span className="font-bold text-gray-900">Hello,</span>{" "}
                <span className="text-gray-400">{firstName}.</span>
              </>
            ) : (
              <>
                <span className="font-bold text-gray-900">Welcome to</span><br />
                <span className="text-gray-400">Sunday Hug.</span>
              </>
            )}
          </h1>
          <p className="mt-4 text-gray-500 text-lg md:text-xl max-w-lg">
            제품 보증서 등록부터 AI 수면 환경 분석까지,<br className="hidden md:block" />
            썬데이허그가 함께합니다.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
          {/* 정품 인증 - Large Card */}
          <Link 
            to="/customer/warranty"
            className="md:col-span-2 md:row-span-2 group"
          >
            <div className="h-full min-h-[280px] md:min-h-[400px] bg-[#FF6B35] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium tracking-wider uppercase">
                    Product Registration
                  </p>
                  <h2 className="text-white text-3xl md:text-4xl font-bold mt-2">
                    정품 인증
                  </h2>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div>
                <p className="text-white/90 text-base md:text-lg">
                  구매하신 제품의 시리얼 넘버를 등록하고<br />
                  프리미엄 보증 혜택을 받아보세요.
                </p>
                <div className="mt-4 flex items-center text-white/80 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">등록하기</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* 수면 분석 - Medium Dark Card */}
          <Link 
            to="/customer/sleep"
            className="md:col-span-1 md:row-span-2 group"
          >
            <div className="h-full min-h-[180px] md:min-h-[400px] bg-[#1A1A1A] rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">
                    AI Sleep Tech
                  </p>
                  <h2 className="text-white text-2xl md:text-3xl font-bold mt-2">
                    수면 분석
                  </h2>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Moon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm md:text-base">
                  AI가 우리 아이 수면 환경을<br />
                  분석해 드려요
                </p>
                <div className="mt-3 flex items-center text-gray-500 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">분석하기</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* 마이페이지 - Small White Card */}
          <Link 
            to={isLoggedIn ? "/customer/mypage" : "/customer/login"}
            className="group"
          >
            <div className="h-full min-h-[140px] md:min-h-[190px] bg-white rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  My Page
                </p>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-gray-900 text-xl md:text-2xl font-bold">
                {isLoggedIn ? "마이페이지" : "로그인"}
              </h3>
            </div>
          </Link>

          {/* AI 상담 - Gradient Card */}
          <Link 
            to="/customer/chat"
            className="group"
          >
            <div className="h-full min-h-[140px] md:min-h-[190px] bg-gradient-to-br from-[#FF6B35] to-orange-500 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <p className="text-white/80 text-xs font-medium tracking-wider uppercase">
                  AI Chat
                </p>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <h3 className="text-white text-xl md:text-2xl font-bold">
                AI 육아 상담
              </h3>
            </div>
          </Link>

          {/* 블로그 - Small White Card */}
          <Link 
            to="/customer/blog"
            className="group"
          >
            <div className="h-full min-h-[140px] md:min-h-[190px] bg-white rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Blog
                </p>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-xl md:text-2xl font-bold">
                블로그
              </h3>
            </div>
          </Link>
        </div>

        {/* CTA for non-logged in users */}
        {!isLoggedIn && (
          <div className="mt-10 p-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-white text-2xl font-bold mb-2">
                  처음이신가요?
                </h3>
                <p className="text-gray-400">
                  회원가입 후 보증서 등록, 수면 분석 결과 저장 등<br className="hidden md:block" />
                  더 많은 서비스를 이용하세요.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button 
                  asChild
                  className="flex-1 md:flex-none bg-white text-gray-900 hover:bg-gray-100 px-6"
                >
                  <Link to="/customer/login">로그인</Link>
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  className="flex-1 md:flex-none border-gray-600 text-white hover:bg-white/10 px-6"
                >
                  <Link to="/customer/register">회원가입</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            href="https://www.sundayhug.kr/sleepport.html"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <MessageCircleQuestion className="w-6 h-6 text-gray-400 mb-3" />
            <h4 className="font-semibold text-gray-900">ABC 사용 설명서</h4>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </a>

          <a 
            href="https://pf.kakao.com/_crxgDxj/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <svg className="w-6 h-6 text-[#FAE100] mb-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            <h4 className="font-semibold text-gray-900">고객센터</h4>
            <p className="text-sm text-gray-500 mt-1">카카오톡 상담</p>
          </a>

          <Link 
            to="/customer/mypage/as"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <svg className="w-6 h-6 text-gray-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <h4 className="font-semibold text-gray-900">A/S 신청</h4>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link 
            to="/customer/about"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <Sparkles className="w-6 h-6 text-gray-400 mb-3" />
            <h4 className="font-semibold text-gray-900">서비스 소개</h4>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
