/**
 * 고객용 레이아웃
 * 
 * - 심플한 헤더 (로고, 로그인/로그아웃)
 * - 하단 네비게이션 (모바일 최적화)
 */
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
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
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);

  // 로그인 상태 확인 (클라이언트에서만)
  useEffect(() => {
    const checkAuth = () => {
      const customerId = localStorage.getItem("customerId");
      const name = localStorage.getItem("customerName");
      setIsLoggedIn(!!customerId);
      setCustomerName(name);
    };
    
    checkAuth();
    
    // storage 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시)
    window.addEventListener("storage", checkAuth);
    
    // 페이지 이동 시마다 확인
    return () => window.removeEventListener("storage", checkAuth);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("customerId");
    localStorage.removeItem("customerName");
    setIsLoggedIn(false);
    setCustomerName(null);
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
                  {customerName}님
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
