import type { Route } from "./+types/private.layout";

import { Outlet } from "react-router";

// ============================================
// 🔓 인증 체크 임시 비활성화 (내부 개발용)
// 나중에 SaaS화 할 때 아래 주석 해제하면 됨
// ============================================
// import makeServerClient from "../lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  // const [client] = makeServerClient(request);
  // const {
  //   data: { user },
  // } = await client.auth.getUser();
  // if (!user) {
  //   throw redirect("/login");
  // }

  return {};
}

export default function PrivateLayout() {
  return <Outlet />;
}
