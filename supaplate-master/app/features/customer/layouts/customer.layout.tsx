/**
 * 고객용 레이아웃 (새로운 디자인)
 * 
 * - 깔끔한 헤더 (로고 왼쪽, 네비 중앙, 사용자 오른쪽)
 * - 서비스 센터 운영시간 표시
 * - 크림색 배경 테마
 */
import type { Route } from "./+types/customer.layout";

import { Link, Outlet, useLocation, useNavigate, useLoaderData, data } from "react-router";
import { 
  HomeIcon, 
  ShieldCheckIcon, 
  MoonIcon, 
  UserIcon,
  LogOutIcon,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/core/components/ui/button";
import { cn } from "~/core/lib/utils";
import makeServerClient from "~/core/lib/supa-client.server";

const navItems = [
  { label: "홈", href: "/customer" },
  { label: "수면 분석", href: "/customer/sleep" },
  { label: "정품 인증", href: "/customer/warranty" },
];

const mobileNavItems = [
  { label: "홈", href: "/customer", icon: HomeIcon },
  { label: "보증서", href: "/customer/warranty", icon: ShieldCheckIcon },
  { label: "수면분석", href: "/customer/sleep", icon: MoonIcon },
  { label: "마이페이지", href: "/customer/mypage", icon: UserIcon },
];


// 서버에서 인증 상태 확인
export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0];
    return data({
      isLoggedIn: true,
      userName: name || "회원",
      isVip: true, // TODO: 실제 VIP 여부 체크
    });
  }
  
  return data({
    isLoggedIn: false,
    userName: null,
    isVip: false,
  });
}

export default function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, userName, isVip } = useLoaderData<typeof loader>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    navigate("/logout");
  };
  
  const isActive = (href: string) => {
    if (href === "/customer") {
      return location.pathname === "/customer";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F0] dark:bg-[#121212] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#F5F5F0]/95 dark:bg-[#121212]/95 backdrop-blur supports-[backdrop-filter]:bg-[#F5F5F0]/80 dark:supports-[backdrop-filter]:bg-[#121212]/80">
        <div className="mx-auto max-w-6xl flex h-16 md:h-20 items-center justify-between px-6">
          {/* Logo */}
          <Link to="/customer" className="flex items-center">
            <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Sunday Hug
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-gray-900 dark:hover:text-white",
                  isActive(item.href)
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Service Status - Desktop */}
            <a 
              href="https://pf.kakao.com/_crxgDxj/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white/50 hover:bg-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">
                카카오톡 상담 문의
              </span>
            </a>

            {/* User Info */}
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link 
                  to="/customer/mypage"
                  className="hidden sm:flex flex-col items-end"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {userName} 님
                  </span>
                  {isVip && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      VIP Member
                    </span>
                  )}
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50"
                >
                  <LogOutIcon className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Button 
                asChild 
                variant="ghost" 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
              >
                <Link to="/customer/login">로그인</Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-6 py-4 space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "block py-2 text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "text-gray-900"
                      : "text-gray-500"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100">
                <a 
                  href="https://pf.kakao.com/_crxgDxj/chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2 text-gray-500 hover:text-[#FAE100] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
                  </svg>
                  <span className="text-sm">카카오톡 상담 문의</span>
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Footer (Desktop) */}
      <footer className="hidden md:block bg-[#EAEAE5] mt-auto">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Sunday Hug</h3>
              <p className="text-sm text-gray-600 max-w-md">
                아이와 부모 모두가 편안한 일상을 위해,<br />
                썬데이허그가 함께합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">고객센터</h4>
                <a 
                  href="https://pf.kakao.com/_crxgDxj/chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-[#FAE100] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
                  </svg>
                  카카오톡 상담
                </a>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">이메일</h4>
                <p className="text-gray-600">contact@sundayhug.com</p>
              </div>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-gray-300">
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                <span className="font-medium">법인명(상호)</span> : 주식회사 제이코프 | 
                <span className="font-medium"> 대표자</span> : 정인교 | 
                <span className="font-medium"> 사업자등록번호</span> : 702-86-02618
              </p>
              <p>
                <span className="font-medium">주소</span> : 16897 경기도 용인시 기흥구 죽전로 6 한솔프라자 7층 706호
              </p>
              <p>
                <span className="font-medium">통신판매업신고</span> : 제2023-용인기흥-0364호 | 
                <span className="font-medium"> 개인정보관리책임자</span> : 강창건
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              © {new Date().getFullYear()} Sundayhug. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                isActive(item.href)
                  ? "text-[#FF6B35] bg-orange-50 dark:bg-orange-900/30"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive(item.href) && "text-[#FF6B35]"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
