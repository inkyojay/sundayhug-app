import type { Route } from "./+types/private.layout";

import { Outlet, redirect } from "react-router";
import makeServerClient from "../lib/supa-client.server";

/**
 * 인증 필수 레이아웃
 * - 로그인 체크
 * - Admin 권한 체크는 dashboard.layout.tsx에서 수행
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [client, headers] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  
  if (!user) {
    throw redirect("/login");
  }

  return { user, headers };
}

export default function PrivateLayout() {
  return <Outlet />;
}
