/**
 * 아이별 활동 내역 페이지
 * 
 * - 선택한 아이의 정보
 * - 해당 아이에 연결된 채팅 상담 내역
 * - 해당 아이에 연결된 수면 분석 내역
 */
import type { Route } from "./+types/baby-history";

import { Link, redirect, useLoaderData, data } from "react-router";
import { 
  Baby,
  MessageCircle,
  Moon,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  Sparkles,
  Camera,
} from "lucide-react";

import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "아이 활동 내역 | 썬데이허그" },
  ];
}

// 월령 계산
function calculateMonths(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login");
  }

  const url = new URL(request.url);
  const babyId = url.searchParams.get("id");

  if (!babyId) {
    throw redirect("/customer/mypage");
  }

  // 아기 프로필
  const { data: babyProfile } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("id", babyId)
    .eq("user_id", user.id)
    .single();

  if (!babyProfile) {
    throw redirect("/customer/mypage");
  }

  // 해당 아이의 채팅 세션
  const { data: chatSessions } = await supabase
    .from("chat_sessions")
    .select(`
      id,
      title,
      topic,
      created_at,
      updated_at
    `)
    .eq("user_id", user.id)
    .eq("baby_id", babyId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(10);

  // 해당 아이의 수면 분석
  const { data: sleepAnalyses } = await supabase
    .from("sleep_analyses")
    .select(`
      id,
      created_at,
      score,
      summary
    `)
    .eq("user_id", user.id)
    .eq("baby_id", babyId)
    .order("created_at", { ascending: false })
    .limit(10);

  return data({
    babyProfile,
    chatSessions: chatSessions || [],
    sleepAnalyses: sleepAnalyses || [],
    ageMonths: calculateMonths(babyProfile.birth_date),
  });
}

export default function BabyHistoryScreen() {
  const { babyProfile, chatSessions, sleepAnalyses, ageMonths } = useLoaderData<typeof loader>();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* 뒤로가기 */}
        <Link 
          to="/customer/mypage" 
          className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>마이페이지</span>
        </Link>

        {/* 아이 정보 헤더 */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Baby className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {babyProfile.name || "우리 아기"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {ageMonths !== null ? `${ageMonths}개월` : "월령 미설정"}
                {babyProfile.feeding_type && ` • ${
                  babyProfile.feeding_type === "breast" ? "모유" :
                  babyProfile.feeding_type === "formula" ? "분유" :
                  babyProfile.feeding_type === "mixed" ? "혼합" : ""
                }`}
              </p>
              <Link 
                to={`/customer/chat/baby-profile?id=${babyProfile.id}`}
                className="inline-flex items-center text-[#FF6B35] text-sm font-medium mt-2 hover:underline"
              >
                정보 수정하기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 새 상담/분석 시작 버튼 */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link 
            to={`/customer/chat/new?babyId=${babyProfile.id}`}
            className="bg-gradient-to-r from-[#FF6B35] to-orange-500 text-white rounded-2xl p-4 text-center font-medium hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-6 h-6 mx-auto mb-2" />
            새 상담 시작
          </Link>
          <Link 
            to="/customer/sleep/analyze"
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-4 text-center font-medium hover:opacity-90 transition-opacity"
          >
            <Camera className="w-6 h-6 mx-auto mb-2" />
            수면 환경 분석
          </Link>
        </div>

        {/* 채팅 상담 내역 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#FF6B35]" />
              상담 내역
            </h2>
            <span className="text-sm text-gray-400">{chatSessions.length}건</span>
          </div>

          {chatSessions.length > 0 ? (
            <div className="space-y-3">
              {chatSessions.map((session: any) => (
                <Link
                  key={session.id}
                  to={`/customer/chat/${session.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {session.title || "새 상담"}
                      </h3>
                      {session.topic && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-[#FF6B35] text-xs rounded-full">
                          {session.topic}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0 ml-3">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.updated_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">아직 상담 내역이 없어요</p>
              <Link 
                to={`/customer/chat/new?babyId=${babyProfile.id}`}
                className="inline-block mt-3 text-[#FF6B35] font-medium text-sm hover:underline"
              >
                첫 상담 시작하기 →
              </Link>
            </div>
          )}
        </div>

        {/* 수면 분석 내역 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              수면 분석 내역
            </h2>
            <span className="text-sm text-gray-400">{sleepAnalyses.length}건</span>
          </div>

          {sleepAnalyses.length > 0 ? (
            <div className="space-y-3">
              {sleepAnalyses.map((analysis: any) => (
                <Link
                  key={analysis.id}
                  to={`/customer/sleep/result/${analysis.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {analysis.score !== null && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            analysis.score >= 80 ? "bg-green-100 text-green-700" :
                            analysis.score >= 60 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            <Sparkles className="w-3 h-3 mr-1" />
                            {analysis.score}점
                          </span>
                        )}
                      </div>
                      {analysis.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {analysis.summary}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0 ml-3">
                      <Calendar className="w-3 h-3" />
                      {formatDate(analysis.created_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <Moon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">아직 수면 분석 내역이 없어요</p>
              <Link 
                to="/customer/sleep/analyze"
                className="inline-block mt-3 text-indigo-500 font-medium text-sm hover:underline"
              >
                첫 수면 분석하기 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

