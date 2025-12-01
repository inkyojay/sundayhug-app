/**
 * 고객 서비스 허브 홈 화면
 * 
 * 썬데이허그의 고객용 메인 페이지
 * - 보증서 등록
 * - 수면 환경 분석
 * - 마이페이지
 * - A/S 신청
 */
import type { Route } from "./+types/home";

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { 
  ShieldCheckIcon, 
  MoonIcon, 
  UserIcon, 
  WrenchIcon,
  ChevronRightIcon,
  SparklesIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "썬데이허그 | Sunday Hug" },
    { name: "description", content: "썬데이허그 고객 서비스 - 디지털 보증서, 수면 환경 분석" },
  ];
}

const services = [
  {
    id: "warranty",
    title: "디지털 보증서",
    description: "제품 구매 후 보증서를 등록하세요",
    icon: ShieldCheckIcon,
    href: "/customer/warranty",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "sleep",
    title: "수면 환경 분석",
    description: "AI가 아기 수면 환경을 분석해드려요",
    icon: MoonIcon,
    href: "/customer/sleep",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "mypage",
    title: "마이페이지",
    description: "내 보증서와 분석 이력을 확인하세요",
    icon: UserIcon,
    href: "/customer/mypage",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  {
    id: "as",
    title: "A/S 신청",
    description: "제품 수리/교환/환불을 신청하세요",
    icon: WrenchIcon,
    href: "/customer/mypage/as",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
];

export default function CustomerHomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    const name = localStorage.getItem("customerName");
    setIsLoggedIn(!!customerId);
    setCustomerName(name);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/20 via-purple-500/10 to-pink-500/20 blur-3xl rounded-full" />
        </div>
        
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <SparklesIcon className="h-4 w-4" />
            <span>썬데이허그 고객 서비스</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {isLoggedIn && customerName ? `${customerName}님,` : "안녕하세요!"}
            <br />
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              무엇을 도와드릴까요?
            </span>
          </h1>
          
          <p className="mt-4 text-muted-foreground">
            제품 보증서 등록부터 AI 수면 환경 분석까지
            <br />
            썬데이허그가 함께합니다
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-4 pb-8">
        <div className="mx-auto max-w-md space-y-4">
          {services.map((service) => (
            <Link key={service.id} to={service.href} className="block">
              <Card className={`group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${service.bgColor}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${service.color} text-white shadow-lg`}>
                    <service.icon className="h-7 w-7" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {service.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {service.description}
                    </p>
                  </div>
                  
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions - 비로그인 시에만 표시 */}
      {!isLoggedIn && (
        <section className="px-4 pb-8">
          <div className="mx-auto max-w-md">
            <Card className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">처음이신가요?</CardTitle>
                <CardDescription className="text-white/80">
                  회원가입 후 더 많은 서비스를 이용하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button asChild variant="secondary" className="flex-1">
                  <Link to="/customer/login">로그인</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  <Link to="/customer/register">회원가입</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer Info */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-md text-center text-sm text-muted-foreground">
          <p>문의사항이 있으신가요?</p>
          <p className="mt-1">
            <a href="tel:15339093" className="font-medium text-primary hover:underline">
              1533-9093
            </a>
            {" "}(평일 10:00~18:00)
          </p>
        </div>
      </section>
    </div>
  );
}

