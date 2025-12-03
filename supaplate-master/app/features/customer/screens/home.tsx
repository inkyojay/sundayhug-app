/**
 * 고객 서비스 홈 화면 (새로운 디자인)
 * 
 * - Bento Grid 스타일
 * - 크림색 배경
 * - 오렌지/다크 카드 조합
 */
import type { Route } from "./+types/home";

import { useState } from "react";
import { Link, useLoaderData, data } from "react-router";
import { 
  ShieldCheck, 
  Moon, 
  MessageCircleQuestion,
  ChevronRight,
  Sparkles,
  Gift,
  X,
  Baby,
  Package
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
  
  // Feature Flags (환경변수 기반 - Vercel Production에서만 false 설정)
  const features = {
    chatEnabled: process.env.FEATURE_CHAT_ENABLED !== 'false',
    blogEnabled: process.env.FEATURE_BLOG_ENABLED !== 'false',
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
  const [showEventModal, setShowEventModal] = useState(false);

  const handleEventSelect = (type: 'abc' | 'other') => {
    const url = type === 'abc' 
      ? 'https://www.sundayhug.kr/event/momcafe-abc.html'
      : 'https://www.sundayhug.kr/event/momcafe.html';
    window.open(url, '_blank');
    setShowEventModal(false);
  };

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
                <span className="text-gray-400">{firstName}님.</span>
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

        {/* 후기 이벤트 버튼 - 맨 위 */}
        <div className="mb-4 md:mb-5">
          <button
            onClick={() => setShowEventModal(true)}
            className="w-full bg-white border border-gray-200 rounded-2xl p-5 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 hover:shadow-md group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FF6B35]/10 rounded-full flex items-center justify-center">
                  <Gift className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-gray-900 text-lg">썬데이허그 구매 후기 이벤트 참여</h4>
                  <p className="text-gray-500 text-sm mt-1">맘카페 후기 작성하고 사은품 받으세요!</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

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
                      마이페이지
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

          {/* 수면 분석 - Large Dark Card */}
          <Link 
            to="/customer/sleep"
            className="group"
          >
            <div className="h-full min-h-[280px] md:min-h-[350px] bg-[#1A1A1A] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
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
                  맞춤 솔루션을 제공해 드려요.
                </p>
                <div className="mt-4 flex items-center text-gray-500 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">분석하기</span>
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
                        AI Parenting
                      </p>
                      <h2 className="text-white text-2xl md:text-3xl font-bold mt-1">
                        AI 육아 상담
                      </h2>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircleQuestion className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-orange-100 text-sm md:text-base">
                      수면, 수유, 발달 고민을 AI가 답변해 드려요
                    </p>
                    <div className="mt-3 flex items-center text-white/80 group-hover:text-white transition-colors">
                      <span className="text-sm font-medium">상담하기</span>
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
                        Parenting Guide
                      </p>
                      <h2 className="text-white text-2xl md:text-3xl font-bold mt-1">
                        육아 블로그
                      </h2>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-emerald-100 text-sm md:text-base">
                      수면 가이드, 제품 활용법, 육아 꿀팁
                    </p>
                    <div className="mt-3 flex items-center text-white/80 group-hover:text-white transition-colors">
                      <span className="text-sm font-medium">둘러보기</span>
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
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <MessageCircleQuestion className="w-6 h-6 text-gray-400 mb-3" />
            <h4 className="font-semibold text-gray-900">
              ABC 아기침대<br className="md:hidden" /> 사용 설명서
            </h4>
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
        </div>

      </div>

      {/* 제품 선택 모달 */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 백드롭 */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEventModal(false)}
          />
          
          {/* 모달 */}
          <div className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowEventModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* 헤더 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-[#FF6B35]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">후기 이벤트 참여</h3>
              <p className="text-gray-500 mt-2">참여하실 제품을 선택해주세요</p>
            </div>

            {/* 선택 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={() => handleEventSelect('abc')}
                className="w-full p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
                    <Baby className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-bold text-gray-900 text-lg">ABC 아기침대</h4>
                    <p className="text-gray-500 text-sm">ABC 아기침대 후기 이벤트</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all" />
                </div>
              </button>

              <button
                onClick={() => handleEventSelect('other')}
                className="w-full p-5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FF6B35] rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-bold text-gray-900 text-lg">기타 다른 제품</h4>
                    <p className="text-gray-500 text-sm">슬리핑백, 속싸개, 백색소음기 등</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            </div>

            {/* 안내 문구 */}
            <p className="text-center text-xs text-gray-400 mt-6">
              선택하시면 해당 이벤트 페이지가 새 창에서 열립니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
