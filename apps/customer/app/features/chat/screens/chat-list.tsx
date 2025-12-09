/**
 * AI 육아 상담 - 채팅 목록
 * 
 * 여러 아이 프로필 지원
 */
import type { Route } from "./+types/chat-list";

import { Link, useLoaderData, data, useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Plus, 
  MessageCircle,
  Baby,
  Clock,
  ChevronRight,
  Sparkles,
  Check
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "AI 육아 상담 | 썬데이허그" },
    { name: "description", content: "AI와 함께하는 육아 수면 상담" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ sessions: [], babyProfiles: [], isLoggedIn: false });
  }

  // 채팅 세션 목록
  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select(`
      id,
      title,
      topic,
      created_at,
      updated_at,
      baby_id,
      baby_profiles (
        id,
        name,
        birth_date
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(20);

  // 모든 아기 프로필 (복수)
  const { data: babyProfiles } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return data({ 
    sessions: sessions || [], 
    babyProfiles: babyProfiles || [],
    isLoggedIn: true 
  });
}

// 주제 한글명
const topicNames: Record<string, string> = {
  sleep: "수면",
  feeding: "수유",
  development: "발달",
  health: "건강",
  emotion: "정서",
  general: "일반",
};

// 주제 색상
const topicColors: Record<string, string> = {
  sleep: "bg-indigo-100 text-indigo-700",
  feeding: "bg-orange-100 text-orange-700",
  development: "bg-green-100 text-green-700",
  health: "bg-red-100 text-red-700",
  emotion: "bg-pink-100 text-pink-700",
  general: "bg-gray-100 text-gray-700",
};

// 월령 계산
function calculateMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                 (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

// 월령 표시
function formatAge(months: number): string {
  if (months < 1) return "신생아";
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years}살`;
  return `${years}살 ${remainingMonths}개월`;
}

export default function ChatListScreen() {
  const { sessions, babyProfiles, isLoggedIn } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  // 아이 선택 모달
  const [showBabySelector, setShowBabySelector] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-[#FF6B35] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            AI 육아 상담
          </h1>
          <p className="text-gray-500 mb-6">
            로그인하고 AI 상담사와 대화해보세요
          </p>
          <Button asChild className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
            <Link to="/customer/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 새 상담 시작 핸들러
  const handleNewChat = () => {
    if (babyProfiles.length === 0) {
      // 아이 프로필이 없으면 등록 페이지로
      navigate("/customer/chat/baby-profile");
    } else if (babyProfiles.length === 1) {
      // 아이가 1명이면 바로 시작
      navigate(`/customer/chat/new?babyId=${babyProfiles[0].id}`);
    } else {
      // 아이가 여러 명이면 선택 모달 표시
      setShowBabySelector(true);
    }
  };

  // 아이 선택 후 상담 시작
  const handleSelectBaby = (babyId: string) => {
    setShowBabySelector(false);
    navigate(`/customer/chat/new?babyId=${babyId}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer"
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 육아 상담</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">24시간 AI 상담사와 대화하세요</p>
          </div>
        </div>

        {/* Baby Profiles Section */}
        {babyProfiles.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">등록된 아이</h2>
              <Link 
                to="/customer/chat/baby-profile"
                className="text-xs text-[#FF6B35] hover:underline"
              >
                + 아이 추가
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {babyProfiles.map((baby) => {
                const months = calculateMonths(baby.birth_date);
                return (
                  <Link
                    key={baby.id}
                    to={`/customer/chat/baby-profile?id=${baby.id}`}
                    className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all min-w-[140px]"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Baby className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-center truncate">
                      {baby.name || "우리 아기"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {formatAge(months)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <Link to="/customer/chat/baby-profile" className="block mb-6">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-5 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-dashed border-orange-300">
                  <Baby className="w-7 h-7 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">아기 정보 등록하기</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    맞춤형 상담을 위해 아기 정보를 등록해주세요
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Link>
        )}

        {/* New Chat Button */}
        <button onClick={handleNewChat} className="block w-full mb-8">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 hover:bg-[#2A2A2A] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FF6B35] rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white text-lg">새 상담 시작하기</h3>
                <p className="text-gray-400 text-sm">
                  수면, 수유, 발달 등 무엇이든 물어보세요
                </p>
              </div>
            </div>
          </div>
        </button>

        {/* Chat Sessions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">최근 상담</h2>
          
          {sessions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">아직 상담 내역이 없어요</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">새 상담을 시작해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link 
                  key={session.id} 
                  to={`/customer/chat/${session.id}`}
                  className="block"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 hover:shadow-md transition-all border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {session.topic && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${topicColors[session.topic] || topicColors.general}`}>
                              {topicNames[session.topic] || "일반"}
                            </span>
                          )}
                          {session.baby_profiles && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                              {session.baby_profiles.name || "아기"}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {session.title || "새 상담"}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(session.updated_at).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Baby Selector Modal */}
      {showBabySelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">누구와 상담할까요?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">상담할 아이를 선택해주세요</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {babyProfiles.map((baby) => {
                const months = calculateMonths(baby.birth_date);
                return (
                  <button
                    key={baby.id}
                    onClick={() => handleSelectBaby(baby.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#FF6B35] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
                      <Baby className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {baby.name || "우리 아기"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatAge(months)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowBabySelector(false)}
              className="w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
