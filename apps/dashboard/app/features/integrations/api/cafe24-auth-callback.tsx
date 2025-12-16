/**
 * Cafe24 OAuth 콜백 API
 * GET /api/integrations/cafe24/auth/callback
 * 
 * 인증 코드를 토큰으로 교환하고 Supabase에 저장
 */
import type { Route } from "./+types/cafe24-auth-callback";

import { redirect } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  exchangeCodeForToken,
  getRedirectUri,
  calculateExpiresAt,
  CAFE24_CONFIG,
} from "../lib/cafe24.server";

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase, headers] = makeServerClient(request);

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect("/login?error=unauthorized");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  // 에러 처리
  if (error) {
    console.error("Cafe24 인증 에러:", error);
    return redirect(`/dashboard/integrations/cafe24?error=${error}`);
  }

  // 인증 코드 확인
  if (!code) {
    console.error("인증 코드 없음");
    return redirect("/dashboard/integrations/cafe24?error=no_code");
  }

  try {
    // 리디렉션 URI (인증 시작 때와 동일해야 함)
    const redirectUri = getRedirectUri(request);

    console.log("Cafe24 토큰 교환 시작:", {
      code: code.substring(0, 10) + "...",
      redirectUri,
      state,
    });

    // 인증 코드를 토큰으로 교환
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    console.log("Cafe24 토큰 발급 성공:", {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    // 만료 시간 계산
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = calculateExpiresAt(expiresIn);
    const issuedAt = new Date().toISOString();

    // Supabase에 토큰 저장
    const { error: upsertError } = await supabase
      .from("cafe24_tokens")
      .upsert({
        mall_id: CAFE24_CONFIG.mallId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || "Bearer",
        expires_in: expiresIn,
        scope: tokenData.scope,
        issued_at: issuedAt,
        expires_at: expiresAt,
        updated_at: issuedAt,
      }, {
        onConflict: "mall_id",
      });

    if (upsertError) {
      console.error("토큰 저장 실패:", upsertError);
      return redirect("/dashboard/integrations/cafe24?error=save_failed");
    }

    console.log("Cafe24 토큰 저장 완료");

    // 성공 페이지로 리디렉션
    return redirect("/dashboard/integrations/cafe24?success=authenticated", {
      headers,
    });

  } catch (err) {
    console.error("Cafe24 토큰 교환 실패:", err);
    const errorMessage = err instanceof Error ? err.message : "unknown_error";
    return redirect(`/dashboard/integrations/cafe24?error=${encodeURIComponent(errorMessage)}`);
  }
}

