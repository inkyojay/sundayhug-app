/**
 * 고객용 레이아웃 (Supabase Auth 통합)
 * 
 * - 심플한 헤더 (로고, 로그인/로그아웃)
 * - 하단 네비게이션 (모바일 최적화)
 */
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useRouteLoaderData } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { 
  HomeIcon, 
  ShieldCheckIcon, 
  MoonIcon, 
  UserIcon,
  LogOutIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { cn } from "~/core/lib/utils";

const navItems = [
  {
    label: "홈",
    href: "/customer",
    icon: HomeIcon,
  },
  {
    label: "보증서",
    href: "/customer/warranty",
    icon: ShieldCheckIcon,
  },
  {
    label: "수면분석",
    href: "/customer/sleep",
    icon: MoonIcon,
  },
  {
    label: "마이페이지",
    href: "/customer/mypage",
    icon: UserIcon,
  },
];

export default function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData("root") as { env?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string } } | undefined;
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Supabase 클라이언트로 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || rootData?.env?.SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || rootData?.env?.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase 환경변수가 없습니다");
        return;
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsLoggedIn(true);
        // 이름 가져오기
        const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0];
        setUserName(name || null);
      } else {
        setIsLoggedIn(false);
        setUserName(null);
      }
    };
    
    checkAuth();
  }, [location.pathname, rootData]);

  const handleLogout = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || rootData?.env?.SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || rootData?.env?.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signOut();
    
    setIsLoggedIn(false);
    setUserName(null);
    navigate("/customer");
  };
  
  const isActive = (href: string) => {
    if (href === "/customer") {
      return location.pathname === "/customer";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link to="/customer" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              썬데이허그
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {userName}님
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOutIcon className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/customer/login">로그인</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Footer (Desktop) */}
      <footer className="hidden md:block border-t bg-muted/30 mt-8">
        <div className="container px-4 py-8">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium">법인명(상호)</span> : 주식회사 제이코프 | 
              <span className="font-medium"> 주소</span> : 16897 경기도 용인시 기흥구 죽전로 6 한솔프라자 7층 706호
            </p>
            <p>
              <span className="font-medium">대표자</span> : 정인교 | 
              <span className="font-medium"> 전화</span> : 070-7703-8005 | 
              <span className="font-medium"> 개인정보관리책임자</span> : 강창건(contact@sundayhug.com)
            </p>
            <p>
              <span className="font-medium">사업자등록번호</span> : 702-86-02618 | 
              <span className="font-medium"> 통신판매업신고</span> : 제2023-용인기흥-0364호{" "}
              <a 
                href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=7028602618" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                [사업자정보확인]
              </a>
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4">
            © {new Date().getFullYear()} Sundayhug. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive(item.href) && "text-primary"
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
