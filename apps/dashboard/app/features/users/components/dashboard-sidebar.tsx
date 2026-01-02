/**
 * Sundayhug 내부 관리 시스템 사이드바
 * 
 * 모듈:
 * - 대시보드: 종합 현황
 * - 재고 관리: Cafe24, 네이버 연동
 * - 주문 관리: Cafe24, 네이버 연동
 * - 보증서 관리: 디지털 보증서 시스템
 * - 후기 관리: 후기 인증/이벤트
 * - 콘텐츠 관리: 블로그/AI 상담 지식
 */
import {
  BookOpenIcon,
  BoxIcon,
  LayoutDashboardIcon,
  LinkIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StarIcon,
  StoreIcon,
  UsersIcon,
  WarehouseIcon,
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

    // ===== 고객/회원 =====
    {
      title: "고객/회원",
      url: "/dashboard/members",
      icon: UsersIcon,
      items: [
        {
          title: "회원 목록",
          url: "/dashboard/members",
        },
        {
          title: "고객 분석",
          url: "/dashboard/customer-analytics",
        },
      ],
    },

    // ===== 주문 관리 =====
    {
      title: "주문 관리",
      url: "/dashboard/orders",
      icon: ShoppingCartIcon,
      items: [
        {
          title: "주문 목록 (B2C)",
          url: "/dashboard/orders",
        },
        {
          title: "쿠팡 주문",
          url: "/dashboard/integrations/coupang/orders",
        },
        {
          title: "B2B 업체",
          url: "/dashboard/b2b/customers",
        },
        {
          title: "B2B 주문",
          url: "/dashboard/b2b/orders",
        },
      ],
    },

    // ===== 제품 관리 =====
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
          title: "쿠팡 제품",
          url: "/dashboard/integrations/coupang/products",
        },
      ],
    },

    // ===== 재고/물류 =====
    {
      title: "재고/물류",
      url: "/dashboard/inventory",
      icon: WarehouseIcon,
      items: [
        {
          title: "재고 현황",
          url: "/dashboard/inventory",
        },
        {
          title: "쿠팡 재고",
          url: "/dashboard/integrations/coupang/inventory",
        },
        {
          title: "재고 이력",
          url: "/dashboard/inventory-history",
        },
        {
          title: "창고 관리",
          url: "/dashboard/warehouses",
        },
        {
          title: "공장 관리",
          url: "/dashboard/factories",
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

    // ===== 보증서 관리 =====
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
      title: "후기/이벤트",
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

    // ===== 콘텐츠 관리 =====
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
          title: "스마트스토어",
          url: "/dashboard/integrations/naver",
        },
        {
          title: "쿠팡 로켓그로스",
          url: "/dashboard/integrations/coupang",
        },
      ],
    },

    // ===== 설정 =====
    {
      title: "설정",
      url: "/account/edit",
      icon: Settings2Icon,
      items: [
        {
          title: "계정 설정",
          url: "/account/edit",
        },
      ],
    },
  ],

  // 쇼핑몰 연동 상태
  projects: [
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
      name: "쿠팡 로켓그로스",
      url: "/dashboard/integrations/coupang",
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
