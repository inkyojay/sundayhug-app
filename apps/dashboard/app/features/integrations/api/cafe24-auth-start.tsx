/**
 * Cafe24 OAuth 인증 시작 API
 * GET /api/integrations/cafe24/auth/start
 * 
 * Cafe24 인증 페이지로 리디렉션
 */
import type { Route } from "./+types/cafe24-auth-start";

import { redirect } from "react-router";
import {
  buildAuthorizationUrl,
  generateState,
  getRedirectUri,
  validateConfig,
} from "../lib/cafe24.server";

export async function loader({ request }: Route.LoaderArgs) {
  // 인증 체크 제거 - OAuth 시작점은 공개 접근 허용
  
  // 설정 유효성 검증
  const config = validateConfig();
  if (!config.valid) {
    console.error("Cafe24 설정 누락:", config.missing);
    return redirect("/dashboard/integrations/cafe24?error=config_missing");
  }

  // 리디렉션 URI 생성
  const redirectUri = getRedirectUri(request);
  
  // CSRF 방지용 state 생성
  const state = generateState();
  
  // 인증 URL 생성
  const authUrl = buildAuthorizationUrl(redirectUri, state);

  console.log("Cafe24 인증 시작:", {
    redirectUri,
    state,
    authUrl,
  });

  // Cafe24 인증 페이지로 리디렉션
  return redirect(authUrl);
}

