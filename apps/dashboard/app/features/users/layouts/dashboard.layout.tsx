import type { Route } from "./+types/dashboard.layout";

import { Outlet } from "react-router";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/core/components/ui/sidebar";

import DashboardSidebar from "../components/dashboard-sidebar";

export async function loader({ request }: Route.LoaderArgs) {
  // 🔓 인증 체크 없이 기본 사용자 정보 사용 (내부 개발용)
  return {
    user: null,
  };
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <SidebarProvider>
      <DashboardSidebar
        user={{
          // 🔓 기본 사용자 정보 (내부 개발용)
          name: user?.user_metadata?.name ?? "Admin",
          avatarUrl: user?.user_metadata?.avatar_url ?? "",
          email: user?.email ?? "admin@sundayhug.com",
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
