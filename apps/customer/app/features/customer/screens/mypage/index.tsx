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
  Headphones,
  Shield,
  FileText,
  User,
  ChevronRight,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  Coins,
  Baby,
  Plus
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";

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
  
  // 후기 인증 내역 가져오기 (최근 3개)
  const { data: reviewSubmissions } = await supabase
    .from("review_submissions")
    .select("id, review_type, product_name, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);
  
  // 후기 통계
  const { data: reviewStats } = await supabase
    .from("review_submissions")
    .select("status")
    .eq("user_id", user.id);
  
  const reviewCounts = {
    total: reviewStats?.length || 0,
    pending: reviewStats?.filter(r => r.status === "pending").length || 0,
    approved: reviewStats?.filter(r => r.status === "approved").length || 0,
    rejected: reviewStats?.filter(r => r.status === "rejected").length || 0,
  };

  // 아기 프로필 목록
  const { data: babyProfiles } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  
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
      points: profile?.points || 0,
    },
    reviewSubmissions: reviewSubmissions || [],
    reviewCounts,
    babyProfiles: babyProfiles || [],
  });
}

// 월령 계산
function calculateMonths(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

const reviewTypeLabels: Record<string, string> = {
  momcafe: "맘카페",
  instagram: "인스타",
  blog: "블로그",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "대기중", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "승인", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "반려", color: "bg-red-100 text-red-700", icon: XCircle },
};

// Feature Flags - main-ready에서 미노출
const SHOW_REVIEW_CARD = false;
const SHOW_POINTS_CARD = false;
const SHOW_REVIEW_HISTORY = false;

export default function CustomerMypageIndexScreen() {
  const { user, reviewSubmissions, reviewCounts, babyProfiles } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {/* Greeting Section */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight">
            <span className="font-bold text-gray-900">Hello,</span>{" "}
            <span className="text-gray-400">{user.firstName}님.</span>
          </h1>
          <p className="mt-3 text-gray-500 text-lg">
            오늘도 썬데이허그와 함께 편안한 하루 보내세요.
          </p>
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
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Warranty
                </p>
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-lg md:text-xl font-bold">
                내 보증서
              </h3>
            </div>
          </Link>

          {/* 분석 이력 - Medium White Card */}
          <Link 
            to="/customer/mypage/analyses"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  History
                </p>
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-lg md:text-xl font-bold">
                분석 이력
              </h3>
            </div>
          </Link>

          {/* A/S 접수 - Small White Card */}
          <Link 
            to="/customer/mypage/as"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Support
                </p>
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-lg md:text-xl font-bold">
                A/S 접수
              </h3>
            </div>
          </Link>

          {/* 내 정보 - Small White Card */}
          <Link 
            to="/customer/mypage/profile"
            className="group"
          >
            <div className="h-full min-h-[130px] md:min-h-[170px] bg-white rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-xs font-medium tracking-wider uppercase">
                  Profile
                </p>
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              
              <h3 className="text-gray-900 text-lg md:text-xl font-bold">
                내 정보
              </h3>
            </div>
          </Link>

          {/* 후기 인증 - Small White Card with Gradient */}
          {SHOW_REVIEW_CARD && (
            <Link 
              to="/customer/mypage/review-submit"
              className="group"
            >
              <div className="h-full min-h-[130px] md:min-h-[170px] bg-gradient-to-br from-pink-500 to-orange-400 rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <div className="flex justify-between items-start">
                  <p className="text-white/80 text-xs font-medium tracking-wider uppercase">
                    Review
                  </p>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white text-lg md:text-xl font-bold">
                    후기 인증
                  </h3>
                  {reviewCounts.total > 0 && (
                    <p className="text-white/80 text-xs mt-1">
                      {reviewCounts.pending > 0 && `대기 ${reviewCounts.pending}건`}
                      {reviewCounts.pending > 0 && reviewCounts.approved > 0 && " · "}
                      {reviewCounts.approved > 0 && `승인 ${reviewCounts.approved}건`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* 포인트 - Small Card with Gold Gradient */}
          {SHOW_POINTS_CARD && (
            <Link 
              to="/customer/mypage/points"
              className="group"
            >
              <div className="h-full min-h-[130px] md:min-h-[170px] bg-gradient-to-br from-amber-400 to-yellow-500 rounded-3xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <div className="flex justify-between items-start">
                  <p className="text-white/90 text-xs font-medium tracking-wider uppercase">
                    Points
                  </p>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white text-2xl md:text-3xl font-bold">
                    {user.points.toLocaleString()}
                    <span className="text-lg ml-1">P</span>
                  </h3>
                  <p className="text-white/80 text-xs mt-1">
                    포인트 내역 보기
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* 우리 아이 섹션 */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Baby className="w-5 h-5 text-[#FF6B35]" />
              우리 아이
            </h2>
            <Link 
              to="/customer/chat/baby-profile"
              className="text-sm text-[#FF6B35] font-medium hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 추가
            </Link>
          </div>

          {babyProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {babyProfiles.map((baby: any) => {
                const months = calculateMonths(baby.birth_date);
                return (
                  <Link
                    key={baby.id}
                    to={`/customer/mypage/baby-history?id=${baby.id}`}
                    className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#FF6B35]/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <Baby className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {baby.name || "우리 아기"}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {months !== null ? `${months}개월` : "월령 미설정"}
                          {baby.feeding_type && ` • ${
                            baby.feeding_type === "breast" ? "모유" :
                            baby.feeding_type === "formula" ? "분유" :
                            baby.feeding_type === "mixed" ? "혼합" : ""
                          }`}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link
              to="/customer/chat/baby-profile"
              className="block bg-white rounded-2xl p-6 border border-dashed border-gray-300 hover:border-[#FF6B35] transition-colors text-center"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">아이 정보 등록하기</p>
              <p className="text-gray-400 text-sm mt-1">AI 상담을 위해 아이 정보를 등록해주세요</p>
            </Link>
          )}
        </div>

        {/* 후기 인증 내역 섹션 */}
        {SHOW_REVIEW_HISTORY && reviewSubmissions.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">후기 인증 내역</h2>
              <Link 
                to="/customer/mypage/review-submit"
                className="text-sm text-[#FF6B35] font-medium hover:underline flex items-center gap-1"
              >
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {reviewSubmissions.map((submission: any) => {
                const status = statusConfig[submission.status as keyof typeof statusConfig];
                const StatusIcon = status?.icon || Clock;
                
                return (
                  <Link
                    key={submission.id}
                    to="/customer/mypage/review-submit"
                    className="block bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center">
                          <Gift className="w-5 h-5 text-pink-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {reviewTypeLabels[submission.review_type] || submission.review_type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {submission.product_name || "제품 미지정"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={`${status?.color} px-2.5 py-1 rounded-full text-xs font-medium`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status?.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(submission.created_at).toLocaleDateString("ko-KR")} 신청
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
