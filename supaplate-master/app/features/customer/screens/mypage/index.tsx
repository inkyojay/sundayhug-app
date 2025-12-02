/**
 * 고객 마이페이지 메인 (Bento Grid 스타일)
 * 
 * - Hello, 이름 인사말
 * - Bento 카드 레이아웃 (정품인증, 수면분석, A/S, FAQ)
 */
import type { Route } from "./+types/index";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  ShieldCheck, 
  Moon, 
  Headphones,
  MessageCircleQuestion,
  ChevronRight
} from "lucide-react";

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
      isVip: true, // TODO: 실제 VIP 로직 추가
    },
  });
}

export default function CustomerMypageIndexScreen() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {/* Greeting Section */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight">
            <span className="font-bold text-gray-900">Hello,</span>{" "}
            <span className="text-gray-400">{user.firstName}.</span>
          </h1>
          <p className="mt-3 text-gray-500 text-lg">
            오늘도 썬데이허그와 함께 편안한 하루 보내세요.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
          {/* 정품 인증 - Large Card */}
          <Link 
            to="/customer/warranty"
            className="md:col-span-2 md:row-span-2 group"
          >
            <div className="h-full min-h-[320px] md:min-h-[400px] bg-[#FF6B35] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
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
                  우리 아이 수면 패턴 분석 리포트 확인하기
                </p>
                <div className="mt-3 flex items-center text-gray-500 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">분석하기</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* A/S 접수 - Small White Card */}
          <Link 
            to="/customer/mypage/as"
            className="group"
          >
            <div className="h-full min-h-[140px] md:min-h-[190px] bg-white rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Support
                </p>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-xl md:text-2xl font-bold">
                A/S 접수
              </h3>
            </div>
          </Link>

          {/* 자주 묻는 질문 - Small White Card */}
          <Link 
            to="/customer/faq"
            className="group"
          >
            <div className="h-full min-h-[140px] md:min-h-[190px] bg-white rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  FAQ
                </p>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <MessageCircleQuestion className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-xl md:text-2xl font-bold">
                자주 묻는 질문
              </h3>
            </div>
          </Link>
        </div>

        {/* Additional Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            to="/customer/mypage/warranties"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <h4 className="font-semibold text-gray-900">내 보증서</h4>
            <p className="text-sm text-gray-500 mt-1">등록한 제품 확인</p>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link 
            to="/customer/mypage/analyses"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <h4 className="font-semibold text-gray-900">분석 이력</h4>
            <p className="text-sm text-gray-500 mt-1">수면 분석 결과</p>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link 
            to="/customer/mypage/profile"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <h4 className="font-semibold text-gray-900">내 정보</h4>
            <p className="text-sm text-gray-500 mt-1">프로필 수정</p>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a 
            href="https://pf.kakao.com/_crxgDxj/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/60 backdrop-blur rounded-2xl p-5 hover:bg-white transition-colors border border-gray-200/50 group"
          >
            <h4 className="font-semibold text-gray-900">고객센터</h4>
            <p className="text-sm text-gray-500 mt-1">카카오톡 상담</p>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
