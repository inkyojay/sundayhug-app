/**
 * Sundayhug 내부 관리 시스템 사이드바
 * 
 * 모듈:
 * - 대시보드: 종합 현황
 * - 재고 관리: PlayAuto 재고 연동
 * - 주문 관리: PlayAuto 주문 연동
 * - 보증서 관리: 디지털 보증서 시스템 (2025-11-27 추가)
 * - 광고 분석: (추후 추가)
 * - 출고 분석: (추후 추가)
 * - 쇼핑몰 연동: (추후 추가)
 */
import {
  ArrowLeftRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  BoxIcon,
  ClipboardListIcon,
  FactoryIcon,
  LayoutDashboardIcon,
  LinkIcon,
  MegaphoneIcon,
  PackageIcon,
  RotateCcwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StarIcon,
  StoreIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
  ZapIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/core/components/ui/sidebar";

import SidebarMain from "./sidebar-main";
import SidebarProjects from "./sidebar-projects";
import TeamSwitcher from "./sidebar-team-switcher";
import SidebarUser from "./sidebar-user";

const data = {
  // 조직/팀 (내부 활용이므로 단일 조직)
  teams: [
    {
      name: "Sundayhug",
      logo: StoreIcon,
      plan: "Internal",
    },
  ],

  // 메인 네비게이션 (논리적 순서로 정렬)
  navMain: [
    // ===== 핵심 =====
    {
      title: "대시보드",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
      isActive: true,
      items: [
        {
          title: "종합 현황",
          url: "/dashboard",
        },
      ],
    },
    
    // ===== 고객/주문 관리 =====
    {
      title: "회원 관리",
      url: "/dashboard/members",
      icon: UsersIcon,
      items: [
        {
          title: "회원 목록",
          url: "/dashboard/members",
        },
      ],
    },
    {
      title: "주문 관리",
      url: "/dashboard/orders",
      icon: ShoppingCartIcon,
      items: [
        {
          title: "주문 목록 (플레이오토)",
          url: "/dashboard/orders",
        },
        {
          title: "주문 관리 (직접연동)",
          url: "/dashboard/orders-direct",
        },
      ],
    },
    {
      title: "보증서 관리",
      url: "/dashboard/warranty",
      icon: ShieldCheckIcon,
      items: [
        {
          title: "전체 보증서",
          url: "/dashboard/warranty",
        },
        {
          title: "승인 대기",
          url: "/dashboard/warranty/pending",
        },
        {
          title: "A/S 관리",
          url: "/dashboard/warranty/as",
        },
      ],
    },
    
    // ===== 후기/이벤트 =====
    {
      title: "후기 관리",
      url: "/dashboard/reviews",
      icon: StarIcon,
      items: [
        {
          title: "후기 인증",
          url: "/dashboard/reviews",
        },
        {
          title: "이벤트 목록",
          url: "/dashboard/events",
        },
        {
          title: "새 이벤트",
          url: "/dashboard/events/new",
        },
      ],
    },
    
    // ===== 제품/재고 =====
    {
      title: "제품 관리",
      url: "/dashboard/products",
      icon: BoxIcon,
      items: [
        {
          title: "제품 목록",
          url: "/dashboard/products",
        },
        {
          title: "제품 분류",
          url: "/dashboard/parent-products",
        },
        {
          title: "카페24 제품",
          url: "/dashboard/products-cafe24",
        },
        {
          title: "스마트스토어 제품",
          url: "/dashboard/products-naver",
        },
        {
          title: "재고 현황",
          url: "/dashboard/inventory",
        },
      ],
    },
    
    // ===== 재고/물류 =====
    {
      title: "재고/물류",
      url: "/dashboard/purchase-orders",
      icon: TruckIcon,
      items: [
        {
          title: "공장 관리",
          url: "/dashboard/factories",
        },
        {
          title: "창고 관리",
          url: "/dashboard/warehouses",
        },
        {
          title: "발주 관리",
          url: "/dashboard/purchase-orders",
        },
        {
          title: "입고 관리",
          url: "/dashboard/stock-receipts",
        },
        {
          title: "재고 이동",
          url: "/dashboard/stock-transfers",
        },
        {
          title: "교환/반품/AS",
          url: "/dashboard/returns",
        },
      ],
    },
    
    // ===== 콘텐츠 =====
    {
      title: "콘텐츠 관리",
      url: "/dashboard/blog",
      icon: BookOpenIcon,
      items: [
        {
          title: "블로그 글",
          url: "/dashboard/blog",
        },
        {
          title: "새 글 작성",
          url: "/dashboard/blog/new",
        },
        {
          title: "AI 상담 지식",
          url: "/dashboard/chat/knowledge",
        },
      ],
    },
    
    // ===== 분석 =====
    {
      title: "분석",
      url: "/dashboard/customer-analytics",
      icon: BarChart3Icon,
      items: [
        {
          title: "고객 분석",
          url: "/dashboard/customer-analytics",
        },
        {
          title: "광고 분석",
          url: "#",
        },
        {
          title: "출고/배송",
          url: "#",
        },
      ],
    },
    
    // ===== 외부 연동 =====
    {
      title: "외부 연동",
      url: "/dashboard/integrations/cafe24",
      icon: LinkIcon,
      items: [
        {
          title: "Cafe24",
          url: "/dashboard/integrations/cafe24",
        },
        {
          title: "스마트스토어 (네이버)",
          url: "/dashboard/integrations/naver",
        },
      ],
    },
    
    // ===== 설정 =====
    {
      title: "설정",
      url: "#",
      icon: Settings2Icon,
      items: [
        {
          title: "계정 설정",
          url: "/account/edit",
        },
      ],
    },
  ],

  // 쇼핑몰 연동 상태 (추후 활성화)
  projects: [
    {
      name: "PlayAuto",
      url: "#",
      icon: BoxIcon,
    },
    {
      name: "Cafe24",
      url: "/dashboard/integrations/cafe24",
      icon: StoreIcon,
    },
    {
      name: "스마트스토어",
      url: "/dashboard/integrations/naver",
      icon: StoreIcon,
    },
    {
      name: "쿠팡 (준비중)",
      url: "#",
      icon: StoreIcon,
    },
  ],
};

export default function DashboardSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatarUrl: string;
  };
}) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMain items={data.navMain} />
        <SidebarProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser
          user={{
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
