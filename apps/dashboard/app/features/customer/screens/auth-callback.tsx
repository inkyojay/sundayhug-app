/**
 * Customer OAuth Callback
 *
 * Supabase OAuth 완료 후 Customer 앱으로 리다이렉트
 */
import type { Route } from "./+types/auth-callback";

import { redirect } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";

import { exchangeCodeForSession } from "../lib/customer.server";
import { LoadingSpinner } from "../components";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const [supabase, headers] = makeServerClient(request);

    const result = await exchangeCodeForSession(supabase, code);

    if (result.success) {
      return redirect("/customer/mypage", { headers });
    }
  }

  return redirect("/customer/login");
}

export default function AuthCallbackPage() {
  return <LoadingSpinner message="로그인 처리 중..." />;
}







