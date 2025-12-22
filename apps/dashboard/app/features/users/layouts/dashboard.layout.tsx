import type { Route } from "./+types/dashboard.layout";

import { Outlet, redirect } from "react-router";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/core/components/ui/sidebar";

import makeServerClient from "~/core/lib/supa-client.server";
import DashboardSidebar from "../components/dashboard-sidebar";

/**
 * 대시보드 레이아웃
 * - Admin 권한 체크 (role = 'admin')
 * - 권한이 없으면 /error로 리다이렉트
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [client, headers] = makeServerClient(request);
  
  // 현재 로그인한 사용자 정보 가져오기
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  // profiles 테이블에서 role, approval_status 확인
  const { data: profile } = await client
    .from("profiles")
    .select("role, name, phone, approval_status")
    .eq("id", user.id)
    .single();

  // Admin 또는 Super Admin만 접근 가능
  const allowedRoles = ["admin", "super_admin"];
  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    throw redirect("/error?message=" + encodeURIComponent("관리자 권한이 필요합니다"));
  }

  // 승인되지 않은 사용자는 접근 불가
  if (profile.approval_status !== "approved") {
    throw redirect("/error?message=" + encodeURIComponent("관리자 승인이 필요합니다. 승인 후 다시 시도해주세요."));
  }

  return {
    user,
    profile,
    headers,
  };
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { user, profile } = loaderData;
  return (
    <SidebarProvider>
      <DashboardSidebar
        user={{
          name: profile?.name ?? user?.user_metadata?.name ?? "Admin",
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
