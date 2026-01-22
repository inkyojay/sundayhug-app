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
  getCafe24Token,
  getValidToken,
  isTokenExpired,
  isRefreshTokenExpiring,
  isRefreshTokenExpired,
  type Cafe24Token,
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
    // refresh_token 관련 정보 추가
    refresh_token_expires_at: string | null;
    refresh_token_remaining_days: number | null;
    refresh_token_expiring_soon: boolean;
    refresh_token_expired: boolean;
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
    let tokenData: Cafe24Token | null;
    let refreshed = false;

    // 자동 갱신 옵션이 켜져 있으면 getValidToken 사용 (자동 갱신 포함)
    if (autoRefresh) {
      const originalToken = await getCafe24Token();
      tokenData = await getValidToken();
      // 토큰이 갱신되었는지 확인 (access_token이 다르면 갱신된 것)
      refreshed = !!(originalToken && tokenData && originalToken.access_token !== tokenData.access_token);
    } else {
      tokenData = await getCafe24Token();
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
    const remainingSeconds = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      : 0;
    const expired = isTokenExpired(tokenData);

    // refresh_token 만료 정보 계산
    const refreshTokenExpiresAt = tokenData.refresh_token_expires_at
      ? new Date(tokenData.refresh_token_expires_at)
      : null;
    const refreshTokenRemainingDays = refreshTokenExpiresAt
      ? Math.max(0, Math.floor((refreshTokenExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : null;

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
        // refresh_token 관련 정보
        refresh_token_expires_at: tokenData.refresh_token_expires_at,
        refresh_token_remaining_days: refreshTokenRemainingDays,
        refresh_token_expiring_soon: isRefreshTokenExpiring(tokenData),
        refresh_token_expired: isRefreshTokenExpired(tokenData),
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
