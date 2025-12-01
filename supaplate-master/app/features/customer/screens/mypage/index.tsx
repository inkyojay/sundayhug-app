/**
 * 고객 마이페이지 메인
 * 
 * - 내 보증서
 * - 수면 분석 이력
 * - A/S 신청 이력
 */
import type { Route } from "./+types/index";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { 
  ShieldCheckIcon, 
  MoonIcon, 
  WrenchIcon,
  ChevronRightIcon,
  UserIcon,
  SettingsIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Avatar, AvatarFallback } from "~/core/components/ui/avatar";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "마이페이지 | 썬데이허그" },
  ];
}

const menuItems = [
  {
    title: "내 정보 변경",
    description: "이름, 이메일, 전화번호, 비밀번호, 아이 정보",
    icon: SettingsIcon,
    href: "/customer/mypage/profile",
    color: "text-gray-500",
  },
  {
    title: "내 보증서",
    description: "등록한 제품 보증서를 확인하세요",
    icon: ShieldCheckIcon,
    href: "/customer/mypage/warranties",
    color: "text-blue-500",
  },
  {
    title: "수면 분석 이력",
    description: "AI 수면 환경 분석 결과를 확인하세요",
    icon: MoonIcon,
    href: "/customer/mypage/analyses",
    color: "text-purple-500",
  },
  {
    title: "A/S 신청 이력",
    description: "신청한 A/S 진행 상황을 확인하세요",
    icon: WrenchIcon,
    href: "/customer/mypage/as",
    color: "text-orange-500",
  },
];

export default function CustomerMypageIndexScreen() {
  const navigate = useNavigate();
  const [memberName, setMemberName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    const name = localStorage.getItem("customerName");
    
    if (!customerId) {
      navigate("/customer/login");
      return;
    }
    
    setIsLoggedIn(true);
    setMemberName(name || "회원");
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("customerId");
    localStorage.removeItem("customerName");
    navigate("/customer");
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-6">
        {/* Profile Section */}
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                <UserIcon className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{memberName}님</h2>
              <p className="text-sm text-muted-foreground">
                환영합니다!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/customer/warranty">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 text-center">
                <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">보증서 등록</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/customer/sleep">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 text-center">
                <MoonIcon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm font-medium">수면 분석</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-2 rounded-full bg-muted ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Support */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <p>문의사항이 있으시면</p>
            <p>
              <a href="tel:15339093" className="font-medium text-primary">
                1533-9093
              </a>
              으로 연락주세요
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

