/**
 * AI 육아 상담 - 채팅 목록
 */
import type { Route } from "./+types/chat-list";

import { Link, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  Plus, 
  MessageCircle,
  Baby,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";

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
    return data({ sessions: [], babyProfile: null, isLoggedIn: false });
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
      baby_profiles (
        name,
        birth_date
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(20);

  // 아기 프로필
  const { data: babyProfile } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data({ 
    sessions: sessions || [], 
    babyProfile,
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

export default function ChatListScreen() {
  const { sessions, babyProfile, isLoggedIn } = useLoaderData<typeof loader>();

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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">AI 육아 상담</h1>
            <p className="text-gray-500 text-sm">24시간 AI 상담사와 대화하세요</p>
          </div>
        </div>

        {/* Baby Profile Card */}
        {babyProfile ? (
          <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
                <Baby className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">
                  {babyProfile.name || "우리 아기"}
                </h3>
                <p className="text-gray-500 text-sm">
                  {calculateMonths(babyProfile.birth_date)}개월 •{" "}
                  {babyProfile.feeding_type === "breast" ? "모유" : 
                   babyProfile.feeding_type === "formula" ? "분유" : 
                   babyProfile.feeding_type === "mixed" ? "혼합" : "미설정"}
                </p>
              </div>
              <Link 
                to="/customer/chat/baby-profile"
                className="text-[#FF6B35] text-sm font-medium"
              >
                수정
              </Link>
            </div>
          </div>
        ) : (
          <Link to="/customer/chat/baby-profile" className="block mb-6">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-2 border-dashed border-orange-300">
                  <Baby className="w-7 h-7 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">아기 정보 등록하기</h3>
                  <p className="text-gray-500 text-sm">
                    맞춤형 상담을 위해 아기 정보를 등록해주세요
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Link>
        )}

        {/* New Chat Button */}
        <Link to="/customer/chat/new" className="block mb-8">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 hover:bg-[#2A2A2A] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FF6B35] rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">새 상담 시작하기</h3>
                <p className="text-gray-400 text-sm">
                  수면, 수유, 발달 등 무엇이든 물어보세요
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Chat Sessions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">최근 상담</h2>
          
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">아직 상담 내역이 없어요</p>
              <p className="text-gray-400 text-sm">새 상담을 시작해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link 
                  key={session.id} 
                  to={`/customer/chat/${session.id}`}
                  className="block"
                >
                  <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-all border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {session.topic && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${topicColors[session.topic] || topicColors.general}`}>
                              {topicNames[session.topic] || "일반"}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">
                          {session.title || "새 상담"}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(session.updated_at).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

