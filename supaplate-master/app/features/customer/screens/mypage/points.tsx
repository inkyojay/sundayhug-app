/**
 * 포인트 내역 페이지
 */
import type { Route } from "./+types/points";

import { Link, useLoaderData, data, redirect } from "react-router";
import { 
  ArrowLeft, 
  Coins,
  TrendingUp,
  TrendingDown,
  Gift,
  MessageSquare,
  Star,
  Clock
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "포인트 내역 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login?redirect=/customer/mypage/points");
  }

  // 프로필 (현재 포인트)
  const { data: profile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .single();

  // 포인트 거래 내역
  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data({ 
    currentPoints: profile?.points || 0,
    transactions: transactions || [],
  });
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  review_reward: { 
    label: "후기 보상", 
    icon: MessageSquare, 
    color: "bg-pink-100 text-pink-700" 
  },
  event_bonus: { 
    label: "이벤트 보너스", 
    icon: Gift, 
    color: "bg-purple-100 text-purple-700" 
  },
  manual: { 
    label: "관리자 지급", 
    icon: Star, 
    color: "bg-blue-100 text-blue-700" 
  },
  used: { 
    label: "포인트 사용", 
    icon: Coins, 
    color: "bg-orange-100 text-orange-700" 
  },
  expired: { 
    label: "포인트 만료", 
    icon: Clock, 
    color: "bg-gray-100 text-gray-600" 
  },
};

export default function PointsScreen() {
  const { currentPoints, transactions } = useLoaderData<typeof loader>();

  // 이번 달 적립/사용 계산
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const thisMonthStats = transactions.reduce(
    (acc: { earned: number; used: number }, t: any) => {
      const transDate = new Date(t.created_at);
      if (transDate >= thisMonth) {
        if (t.amount > 0) acc.earned += t.amount;
        else acc.used += Math.abs(t.amount);
      }
      return acc;
    },
    { earned: 0, used: 0 }
  );

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/mypage"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">포인트 내역</h1>
            <p className="text-sm text-gray-500">적립 및 사용 내역을 확인하세요</p>
          </div>
        </div>

        {/* 현재 포인트 */}
        <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl p-6 mb-6 text-white">
          <p className="text-white/80 text-sm mb-1">보유 포인트</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold">{currentPoints.toLocaleString()}</span>
            <span className="text-xl">P</span>
          </div>
          
          <div className="flex gap-6 pt-4 border-t border-white/20">
            <div>
              <p className="text-white/70 text-xs">이번 달 적립</p>
              <p className="font-semibold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +{thisMonthStats.earned.toLocaleString()}P
              </p>
            </div>
            <div>
              <p className="text-white/70 text-xs">이번 달 사용</p>
              <p className="font-semibold flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                -{thisMonthStats.used.toLocaleString()}P
              </p>
            </div>
          </div>
        </div>

        {/* 적립 방법 안내 */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-orange-500" />
            포인트 적립 방법
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
              맘카페/인스타그램/블로그 후기 작성 시 포인트 적립
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
              이벤트 참여 시 추가 포인트 적립
            </li>
          </ul>
          <Link 
            to="/customer/mypage/review-submit"
            className="mt-4 inline-flex items-center text-orange-600 text-sm font-medium hover:underline"
          >
            후기 이벤트 참여하러 가기 →
          </Link>
        </div>

        {/* 거래 내역 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">적립/사용 내역</h2>
          
          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">아직 포인트 내역이 없습니다.</p>
              <Link 
                to="/customer/mypage/review-submit"
                className="mt-4 inline-block text-orange-600 text-sm font-medium hover:underline"
              >
                후기 작성하고 포인트 받기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t: any) => {
                const config = typeConfig[t.type as keyof typeof typeConfig] || typeConfig.manual;
                const Icon = config.icon;
                const isPositive = t.amount > 0;
                
                return (
                  <div 
                    key={t.id} 
                    className="bg-white rounded-2xl p-4 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isPositive ? "bg-green-100" : "bg-red-100"
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isPositive ? "text-green-600" : "text-red-600"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{config.label}</p>
                          {t.description && (
                            <p className="text-sm text-gray-500">{t.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}>
                          {isPositive ? "+" : ""}{t.amount.toLocaleString()}P
                        </p>
                        <p className="text-xs text-gray-400">
                          잔액 {t.balance_after.toLocaleString()}P
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(t.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

