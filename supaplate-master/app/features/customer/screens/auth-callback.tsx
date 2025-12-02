/**
 * Customer OAuth Callback
 * 
 * Supabase OAuth 완료 후 Customer 앱으로 리다이렉트
 */
import type { Route } from "./+types/auth-callback";

import { redirect } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  if (code) {
    const [supabase, headers] = makeServerClient(request);
    
    // OAuth 코드를 세션으로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 성공 시 마이페이지로 리다이렉트
      return redirect("/customer/mypage", { headers });
    }
    
    console.error("OAuth callback error:", error);
  }
  
  // 실패 시 로그인 페이지로
  return redirect("/customer/login");
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>로그인 처리 중...</p>
    </div>
  );
}


