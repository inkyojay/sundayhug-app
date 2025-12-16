/**
 * Cafe24 토큰 갱신 API
 * POST /api/integrations/cafe24/refresh
 * 
 * Refresh Token으로 Access Token 갱신
 */
import type { Route } from "./+types/cafe24-refresh";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  refreshAccessToken,
  calculateExpiresAt,
  CAFE24_CONFIG,
} from "../lib/cafe24.server";

interface RefreshResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    access_token: string;
    expires_at: string;
    issued_at: string;
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase, headers] = makeServerClient(request);

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return data<RefreshResponse>({
      success: false,
      error: "인증이 필요합니다.",
    }, { status: 401, headers });
  }

  try {
    // 기존 토큰 조회
    const { data: tokenData, error: fetchError } = await supabase
      .from("cafe24_tokens")
      .select("*")
      .eq("mall_id", CAFE24_CONFIG.mallId)
      .single();

    if (fetchError || !tokenData) {
      return data<RefreshResponse>({
        success: false,
        error: "저장된 토큰이 없습니다. 먼저 인증을 진행해주세요.",
      }, { status: 404, headers });
    }

    if (!tokenData.refresh_token) {
      return data<RefreshResponse>({
        success: false,
        error: "Refresh Token이 없습니다. 재인증이 필요합니다.",
      }, { status: 400, headers });
    }

    console.log("Cafe24 토큰 갱신 시작");

    // 토큰 갱신 요청
    const newTokenData = await refreshAccessToken(tokenData.refresh_token);

    console.log("Cafe24 토큰 갱신 성공:", {
      tokenType: newTokenData.token_type,
      expiresIn: newTokenData.expires_in,
    });

    // 만료 시간 계산
    const expiresIn = newTokenData.expires_in || 3600;
    const expiresAt = calculateExpiresAt(expiresIn);
    const issuedAt = new Date().toISOString();

    // Supabase에 새 토큰 저장
    const { error: upsertError } = await supabase
      .from("cafe24_tokens")
      .upsert({
        mall_id: CAFE24_CONFIG.mallId,
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token || tokenData.refresh_token, // 새 refresh_token이 없으면 기존 것 유지
        token_type: newTokenData.token_type || "Bearer",
        expires_in: expiresIn,
        scope: newTokenData.scope || tokenData.scope,
        issued_at: issuedAt,
        expires_at: expiresAt,
        updated_at: issuedAt,
      }, {
        onConflict: "mall_id",
      });

    if (upsertError) {
      console.error("토큰 저장 실패:", upsertError);
      return data<RefreshResponse>({
        success: false,
        error: "토큰 저장에 실패했습니다.",
      }, { status: 500, headers });
    }

    return data<RefreshResponse>({
      success: true,
      message: "토큰이 성공적으로 갱신되었습니다.",
      data: {
        access_token: newTokenData.access_token,
        expires_at: expiresAt,
        issued_at: issuedAt,
      },
    }, { headers });

  } catch (err) {
    console.error("Cafe24 토큰 갱신 실패:", err);
    return data<RefreshResponse>({
      success: false,
      error: err instanceof Error ? err.message : "토큰 갱신 중 오류가 발생했습니다.",
    }, { status: 500, headers });
  }
}

// GET 요청도 지원 (편의를 위해)
export async function loader({ request }: Route.LoaderArgs) {
  return action({ request } as Route.ActionArgs);
}

