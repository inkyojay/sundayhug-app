/**
 * Cafe24 토큰 조회 API
 * GET /api/integrations/cafe24/token
 * 
 * Supabase에서 토큰 조회 (자동 갱신 옵션)
 */
import type { Route } from "./+types/cafe24-token";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  refreshAccessToken,
  calculateExpiresAt,
  isTokenExpired,
  CAFE24_CONFIG,
} from "../lib/cafe24.server";

interface TokenResponse {
  success: boolean;
  data?: {
    mall_id: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at: string;
    issued_at: string;
    is_expired: boolean;
    remaining_seconds: number;
    authorization_header: string;
    scope: string | null;
  };
  error?: string;
  refreshed?: boolean;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase, headers] = makeServerClient(request);

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return data<TokenResponse>({
      success: false,
      error: "인증이 필요합니다.",
    }, { status: 401, headers });
  }

  const url = new URL(request.url);
  const autoRefresh = url.searchParams.get("auto_refresh") === "true";

  try {
    // Supabase에서 토큰 조회
    const { data: tokenData, error: fetchError } = await supabase
      .from("cafe24_tokens")
      .select("*")
      .eq("mall_id", CAFE24_CONFIG.mallId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return data<TokenResponse>({
        success: false,
        error: fetchError.message,
      }, { status: 500, headers });
    }

    if (!tokenData) {
      return data<TokenResponse>({
        success: false,
        error: "저장된 토큰이 없습니다. 먼저 인증을 진행해주세요.",
      }, { status: 404, headers });
    }

    // 토큰 상태 계산
    const now = new Date();
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    let remainingSeconds = expiresAt 
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) 
      : 0;
    let expired = isTokenExpired(tokenData.expires_at);
    let refreshed = false;

    // 자동 갱신 옵션이 켜져 있고, 토큰이 만료되었거나 5분 이내 만료 예정이면 갱신
    if (autoRefresh && (expired || remainingSeconds < 300) && tokenData.refresh_token) {
      try {
        console.log("Cafe24 토큰 자동 갱신 시작");
        
        const newTokenData = await refreshAccessToken(tokenData.refresh_token);
        
        const expiresIn = newTokenData.expires_in || 3600;
        const newExpiresAt = calculateExpiresAt(expiresIn);
        const issuedAt = new Date().toISOString();

        // 새 토큰 저장
        await supabase
          .from("cafe24_tokens")
          .upsert({
            mall_id: CAFE24_CONFIG.mallId,
            access_token: newTokenData.access_token,
            refresh_token: newTokenData.refresh_token || tokenData.refresh_token,
            token_type: newTokenData.token_type || "Bearer",
            expires_in: expiresIn,
            scope: newTokenData.scope || tokenData.scope,
            issued_at: issuedAt,
            expires_at: newExpiresAt,
            updated_at: issuedAt,
          }, {
            onConflict: "mall_id",
          });

        // 응답 데이터 업데이트
        tokenData.access_token = newTokenData.access_token;
        tokenData.refresh_token = newTokenData.refresh_token || tokenData.refresh_token;
        tokenData.expires_at = newExpiresAt;
        tokenData.issued_at = issuedAt;
        tokenData.expires_in = expiresIn;
        
        remainingSeconds = expiresIn;
        expired = false;
        refreshed = true;

        console.log("Cafe24 토큰 자동 갱신 완료");
      } catch (refreshErr) {
        console.error("자동 토큰 갱신 실패:", refreshErr);
        // 갱신 실패해도 기존 토큰 반환 (만료되었을 수 있음)
      }
    }

    return data<TokenResponse>({
      success: true,
      refreshed,
      data: {
        mall_id: tokenData.mall_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || "Bearer",
        expires_in: tokenData.expires_in || 3600,
        expires_at: tokenData.expires_at,
        issued_at: tokenData.issued_at,
        is_expired: expired,
        remaining_seconds: remainingSeconds,
        authorization_header: `Bearer ${tokenData.access_token}`,
        scope: tokenData.scope,
      },
    }, { headers });

  } catch (error) {
    console.error("Cafe24 토큰 조회 오류:", error);
    return data<TokenResponse>({
      success: false,
      error: error instanceof Error ? error.message : "토큰 조회 중 오류가 발생했습니다.",
    }, { status: 500, headers });
  }
}
