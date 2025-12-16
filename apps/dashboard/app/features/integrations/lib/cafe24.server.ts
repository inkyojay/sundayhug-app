/**
 * Cafe24 API 유틸리티 (서버 사이드)
 * OAuth 2.0 인증 및 토큰 관리
 */

// Cafe24 설정
export const CAFE24_CONFIG = {
  clientId: process.env.CAFE24_CLIENT_ID || "",
  clientSecret: process.env.CAFE24_CLIENT_SECRET || "",
  authServer: process.env.CAFE24_AUTH_SERVER || "https://sundayhugkr.cafe24.com",
  mallId: "sundayhugkr",
  // 권한 범위
  scope: "mall.read_order,mall.read_product,mall.read_customer,mall.read_store",
};

/**
 * 리디렉션 URI 생성 (환경에 따라)
 */
export function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return `${baseUrl}/api/integrations/cafe24/auth/callback`;
}

/**
 * 인증 URL 생성
 */
export function buildAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CAFE24_CONFIG.clientId,
    redirect_uri: redirectUri,
    scope: CAFE24_CONFIG.scope,
    state: state,
  });

  return `${CAFE24_CONFIG.authServer}/api/v2/oauth/authorize?${params.toString()}`;
}

/**
 * 랜덤 state 생성 (CSRF 방지)
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Basic 인증 헤더 생성
 */
function getBasicAuthHeader(): string {
  const credentials = Buffer.from(
    `${CAFE24_CONFIG.clientId}:${CAFE24_CONFIG.clientSecret}`
  ).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * 인증 코드를 액세스 토큰으로 교환
 */
export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const tokenUrl = `${CAFE24_CONFIG.authServer}/api/v2/oauth/token`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": getBasicAuthHeader(),
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`토큰 교환 실패: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Refresh Token으로 Access Token 갱신
 */
export async function refreshAccessToken(refreshToken: string) {
  const tokenUrl = `${CAFE24_CONFIG.authServer}/api/v2/oauth/token`;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": getBasicAuthHeader(),
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`토큰 갱신 실패: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * 토큰 만료 시간 계산
 */
export function calculateExpiresAt(expiresIn: number): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresIn * 1000);
  return expiresAt.toISOString();
}

/**
 * 토큰이 만료되었는지 확인 (5분 여유)
 */
export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const margin = 5 * 60 * 1000; // 5분
  
  return now.getTime() >= expiry.getTime() - margin;
}

/**
 * 설정 유효성 검증
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = ["clientId", "clientSecret", "authServer"];
  const missing = required.filter(
    (key) => !CAFE24_CONFIG[key as keyof typeof CAFE24_CONFIG]
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

