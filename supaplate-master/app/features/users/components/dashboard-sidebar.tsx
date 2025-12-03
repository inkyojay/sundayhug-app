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
  BarChart3Icon,
  BookOpenIcon,
  BoxIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PackageIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  ToggleLeftIcon,
  TruckIcon,
  WrenchIcon,
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

  // 메인 네비게이션
  navMain: [
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
    {
      title: "제품 분류",
      url: "/dashboard/parent-products",
      icon: FolderTreeIcon,
      items: [
        {
          title: "분류별 제품",
          url: "/dashboard/parent-products",
        },
      ],
    },
    {
      title: "제품 관리",
      url: "/dashboard/products",
      icon: BoxIcon,
      items: [
        {
          title: "제품 목록",
          url: "/dashboard/products",
        },
      ],
    },
    {
      title: "재고 관리",
      url: "/dashboard/inventory",
      icon: PackageIcon,
      items: [
        {
          title: "재고 현황",
          url: "/dashboard/inventory",
        },
      ],
    },
    {
      title: "주문 관리",
      url: "/dashboard/orders",
      icon: ShoppingCartIcon,
      items: [
        {
          title: "주문 목록",
          url: "/dashboard/orders",
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
    {
      title: "블로그 관리",
      url: "/dashboard/blog",
      icon: BookOpenIcon,
      items: [
        {
          title: "글 목록",
          url: "/dashboard/blog",
        },
        {
          title: "새 글 작성",
          url: "/dashboard/blog/new",
        },
      ],
    },
    {
      title: "AI 상담 관리",
      url: "/dashboard/chat/knowledge",
      icon: MessageSquareIcon,
      items: [
        {
          title: "상담 지식",
          url: "/dashboard/chat/knowledge",
        },
      ],
    },
    {
      title: "후기 관리",
      url: "/dashboard/review",
      icon: MessageSquareIcon,
      items: [
        {
          title: "후기 인증",
          url: "/dashboard/review",
        },
      ],
    },
    {
      title: "광고 분석",
      url: "#",
      icon: MegaphoneIcon,
      items: [
        {
          title: "광고 대시보드",
          url: "#",
          // url: "/dashboard/advertising",
        },
        {
          title: "ROAS 분석",
          url: "#",
        },
        {
          title: "키워드 성과",
          url: "#",
        },
      ],
    },
    {
      title: "출고 분석",
      url: "#",
      icon: TruckIcon,
      items: [
        {
          title: "출고 현황",
          url: "#",
          // url: "/dashboard/shipping",
        },
        {
          title: "배송 추적",
          url: "#",
        },
      ],
    },
    {
      title: "설정",
      url: "#",
      icon: Settings2Icon,
      items: [
        {
          title: "계정 설정",
          url: "/account/edit",
        },
        {
          title: "연동 관리",
          url: "#",
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
      name: "쿠팡 (준비중)",
      url: "#",
      icon: StoreIcon,
    },
    {
      name: "스마트스토어 (준비중)",
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
