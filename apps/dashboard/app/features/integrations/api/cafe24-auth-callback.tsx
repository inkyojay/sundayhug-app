/**
 * Cafe24 OAuth 콜백 API
 * 
 * Cafe24 인증 후 콜백을 처리합니다.
 * Authorization code를 access token으로 교환하고 저장합니다.
 */
import { redirect, data } from "react-router";

import type { Route } from "./+types/cafe24-auth-callback";

interface Cafe24TokenResponse {
  access_token: string;
  expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
  client_id: string;
  mall_id: string;
  user_id: string;
  scopes: string[];
  issued_at: string;
}

/**
 * GET /api/integrations/cafe24/auth/callback
 * Cafe24 OAuth 콜백 처리
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // 에러 처리
  if (error) {
    console.error("❌ Cafe24 OAuth 에러:", error, errorDescription);
    return redirect(`/dashboard/integrations/cafe24?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    console.error("❌ Authorization code가 없습니다");
    return redirect("/dashboard/integrations/cafe24?error=missing_code");
  }

  // state에서 mallId 추출
  let mallId = process.env.CAFE24_MALL_ID || "sundayhugkr";
  try {
    if (state) {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      mallId = stateData.mallId || mallId;
    }
  } catch (e) {
    console.warn("state 파싱 실패, 기본 mallId 사용");
  }

  const clientId = process.env.CAFE24_CLIENT_ID;
  const clientSecret = process.env.CAFE24_CLIENT_SECRET;
  const redirectUri = process.env.CAFE24_REDIRECT_URI || 
    "https://sundayhug-app-dashboard.vercel.app/api/integrations/cafe24/auth/callback";

  if (!clientId || !clientSecret) {
    console.error("❌ Cafe24 credentials가 설정되지 않음");
    return redirect("/dashboard/integrations/cafe24?error=missing_credentials");
  }

  try {
    // Authorization code를 access token으로 교환
    const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
    
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("❌ 토큰 교환 실패:", tokenResponse.status, errorData);
      return redirect(`/dashboard/integrations/cafe24?error=${encodeURIComponent("토큰 교환 실패: " + errorData)}`);
    }

    const tokenData: Cafe24TokenResponse = await tokenResponse.json();
    console.log("✅ Cafe24 토큰 발급 성공:", {
      mall_id: tokenData.mall_id,
      user_id: tokenData.user_id,
      scopes: tokenData.scopes,
    });

    // Supabase에 토큰 저장
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    // 기존 토큰이 있으면 업데이트, 없으면 삽입
    const { error: upsertError } = await adminClient
      .from("cafe24_tokens")
      .upsert({
        mall_id: tokenData.mall_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: "bearer",
        expires_in: Math.floor((new Date(tokenData.expires_at).getTime() - Date.now()) / 1000),
        scope: tokenData.scopes.join(","),
        issued_at: tokenData.issued_at,
        expires_at: tokenData.expires_at,
        refresh_token_expires_at: tokenData.refresh_token_expires_at,  // refresh_token 만료 시간 저장
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "mall_id",
      });

    if (upsertError) {
      console.error("❌ 토큰 저장 실패:", upsertError);
      return redirect(`/dashboard/integrations/cafe24?error=${encodeURIComponent("토큰 저장 실패")}`);
    }

    console.log("✅ Cafe24 토큰 저장 완료");
    return redirect("/dashboard/integrations/cafe24?success=true");

  } catch (error) {
    console.error("❌ Cafe24 OAuth 처리 중 오류:", error);
    return redirect(`/dashboard/integrations/cafe24?error=${encodeURIComponent("인증 처리 중 오류가 발생했습니다")}`);
  }
}

