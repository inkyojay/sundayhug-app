/**
 * Cafe24 OAuth 인증 시작 API
 * 
 * Cafe24 OAuth 인증 플로우를 시작합니다.
 * 사용자를 Cafe24 인증 페이지로 리다이렉트합니다.
 */
import { redirect } from "react-router";

import type { Route } from "./+types/cafe24-auth-start";

/**
 * GET /api/integrations/cafe24/auth/start
 * Cafe24 OAuth 인증 시작 - 인증 페이지로 리다이렉트
 */
export async function loader({ request }: Route.LoaderArgs) {
  const clientId = process.env.CAFE24_CLIENT_ID;
  const redirectUri = process.env.CAFE24_REDIRECT_URI || 
    "https://sundayhug-app-dashboard.vercel.app/api/integrations/cafe24/auth/callback";
  const mallId = process.env.CAFE24_MALL_ID || "sundayhugkr";
  
  if (!clientId) {
    throw new Response("CAFE24_CLIENT_ID is not configured", { status: 500 });
  }

  // Cafe24 OAuth 인증 URL 구성
  // https://developers.cafe24.com/docs/en/api/admin/#oauth
  // Cafe24 개발자센터에 등록된 권한에 맞춰 scope 요청
  const scopes = process.env.CAFE24_SCOPES || [
    "mall.read_application",
    "mall.read_product",
    "mall.read_collection",
    "mall.read_personal",
    "mall.read_order",
    "mall.read_community",
    "mall.read_customer",
    "mall.read_notification",
    "mall.read_store",
    "mall.read_promotion",
    "mall.read_salesreport",
    "mall.read_privacy",
    "mall.read_shipping",
    "mall.read_analytics",
  ].join(" ");
  
  // state 파라미터로 CSRF 방지 (간단히 타임스탬프 사용)
  const state = Buffer.from(JSON.stringify({
    timestamp: Date.now(),
    mallId,
  })).toString("base64");

  const authUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  console.log("🔑 Cafe24 OAuth 시작:", authUrl.toString());

  return redirect(authUrl.toString());
}

