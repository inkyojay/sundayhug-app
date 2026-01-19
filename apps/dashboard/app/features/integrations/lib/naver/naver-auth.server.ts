/**
 * 네이버 커머스 API - 인증 및 공통 유틸리티
 *
 * 토큰 관리, API 호출 공통 함수를 제공합니다.
 */

import type { NaverToken } from "./naver-types.server";

// ============================================================================
// Constants
// ============================================================================

export const NAVER_API_BASE = "https://api.commerce.naver.com";

// ============================================================================
// Proxy Helpers
// ============================================================================

/**
 * 프록시 서버 URL (Railway에 배포)
 * 네이버 커머스 API는 고정 IP에서만 호출 가능
 */
export function getProxyUrl(): string | null {
  return process.env.NAVER_PROXY_URL || null;
}

export function getProxyApiKey(): string | null {
  return process.env.NAVER_PROXY_API_KEY || null;
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * 네이버 토큰 조회
 */
export async function getNaverToken(accountId?: string): Promise<NaverToken | null> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  let query = adminClient.from("naver_tokens").select("*");

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    console.error("❌ 네이버 토큰 조회 실패:", error);
    return null;
  }

  return data as NaverToken;
}

/**
 * 토큰 만료 여부 확인 (5분 여유)
 */
export function isTokenExpired(token: NaverToken): boolean {
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5분
  return expiresAt.getTime() - buffer < now.getTime();
}

/**
 * 네이버 토큰 발급/갱신
 * Client Credentials 방식으로 토큰 발급
 * 프록시 서버가 설정되어 있으면 프록시를 통해 발급
 */
export async function refreshNaverToken(token?: NaverToken): Promise<NaverToken | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();

  if (!clientId || !clientSecret) {
    console.error("❌ 네이버 credentials가 설정되지 않음");
    return null;
  }

  try {
    let tokenData: any;

    // 프록시 서버가 설정되어 있으면 프록시를 통해 토큰 발급
    if (proxyUrl) {
      console.log("🔄 프록시 서버를 통해 토큰 발급 시도...");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }

      const response = await fetch(`${proxyUrl}/api/token`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          account_id: process.env.NAVER_ACCOUNT_ID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ 프록시 토큰 발급 실패:", response.status, errorData);
        return null;
      }

      tokenData = await response.json();
    } else {
      // 직접 호출 (로컬 개발 또는 고정 IP 환경)
      console.log("🔄 직접 토큰 발급 시도...");

      const tokenUrl = `${NAVER_API_BASE}/external/v1/oauth2/token`;
      const timestamp = Date.now();

      // 서명 생성: clientId + "_" + timestamp
      const signatureBase = `${clientId}_${timestamp}`;

      // HMAC-SHA256으로 서명 생성
      const crypto = await import("crypto");
      const signature = crypto
        .createHmac("sha256", clientSecret)
        .update(signatureBase)
        .digest("base64");

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          timestamp: String(timestamp),
          client_secret_sign: signature,
          grant_type: "client_credentials",
          type: "SELLER",
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ 토큰 발급 실패:", response.status, errorData);
        return null;
      }

      tokenData = await response.json();
    }

    console.log("✅ 네이버 토큰 발급 성공");

    // DB 업데이트/저장
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    const accountId = process.env.NAVER_ACCOUNT_ID || "default";
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    const { data: upsertedToken, error: upsertError } = await adminClient
      .from("naver_tokens")
      .upsert(
        {
          account_id: accountId,
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || "Bearer",
          expires_in: tokenData.expires_in || 3600,
          scope: tokenData.scope || "",
          issued_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          client_id: clientId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("❌ 토큰 저장 실패:", upsertError);
      return null;
    }

    return upsertedToken as NaverToken;
  } catch (error) {
    console.error("❌ 토큰 발급 중 오류:", error);
    return null;
  }
}

/**
 * 유효한 토큰 가져오기 (자동 갱신)
 */
export async function getValidToken(accountId?: string): Promise<NaverToken | null> {
  let token = await getNaverToken(accountId);

  // 토큰이 없거나 만료되었으면 새로 발급
  if (!token || isTokenExpired(token)) {
    console.log("🔄 토큰 없거나 만료됨, 새로 발급 시도...");
    token = await refreshNaverToken(token ?? undefined);
  }

  return token;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * 네이버 커머스 API 호출
 * 프록시 서버가 설정되어 있으면 프록시를 통해 호출
 */
export async function naverFetch<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, any>;
    accountId?: string;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = "GET", body, accountId } = options;
  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();

  const token = await getValidToken(accountId);
  if (!token) {
    return { success: false, error: "유효한 네이버 토큰이 없습니다. 연동을 다시 해주세요." };
  }

  console.log(`🔑 [naverFetch] 토큰 유효: ${token.access_token.slice(0, 20)}...`);
  console.log(`🔗 [naverFetch] 프록시 URL: ${proxyUrl || "없음 (직접 호출)"}`);

  try {
    let response: Response;

    // 프록시 서버가 설정되어 있으면 프록시를 통해 호출
    if (proxyUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `${token.token_type} ${token.access_token}`,
      };

      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }

      const proxyBody = {
        method,
        path: endpoint,
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
        body,
      };

      console.log(`📤 [naverFetch] 프록시 요청: POST ${proxyUrl}/api/proxy`);
      console.log(`📤 [naverFetch] path: ${endpoint}, method: ${method}`);

      // 범용 프록시 API 사용
      response = await fetch(`${proxyUrl}/api/proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify(proxyBody),
      });
    } else {
      // 직접 호출
      const apiUrl = `${NAVER_API_BASE}${endpoint}`;

      console.log(`📤 [naverFetch] 직접 호출: ${method} ${apiUrl}`);

      response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token.token_type} ${token.access_token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    const responseText = await response.text();
    console.log(`📥 [naverFetch] 응답 (${response.status}): ${responseText.slice(0, 500)}`);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("❌ JSON 파싱 실패:", responseText);
      return { success: false, error: "API 응답 파싱 실패" };
    }

    if (!response.ok) {
      console.error("❌ 네이버 API 에러:", response.status, responseData);
      return {
        success: false,
        error: responseData.message || `API 호출 실패 (${response.status})`,
      };
    }

    return { success: true, data: responseData as T };
  } catch (error) {
    console.error("❌ 네이버 API 호출 중 오류:", error);
    return { success: false, error: "API 호출 중 오류가 발생했습니다" };
  }
}

// ============================================================================
// Connection Management
// ============================================================================

/**
 * 연동 테스트 - 토큰 발급 테스트
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  const token = await getValidToken();

  if (!token) {
    return { success: false, message: "토큰 발급에 실패했습니다. credentials를 확인해주세요." };
  }

  return { success: true, message: "연동이 정상적으로 작동합니다." };
}

/**
 * 네이버 연동 해제
 */
export async function disconnectNaver(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("naver_tokens").delete().eq("account_id", accountId);

  if (error) {
    console.error("❌ 네이버 연동 해제 실패:", error);
    return { success: false, error: "연동 해제에 실패했습니다" };
  }

  console.log("✅ 네이버 연동 해제 완료:", accountId);
  return { success: true };
}

// ============================================================================
// KST Date Helpers
// ============================================================================

/**
 * Date를 KST ISO-8601 문자열로 변환 (+09:00)
 */
export function toKSTString(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000; // +09:00 in ms
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().replace("Z", "+09:00");
}

/**
 * 입력 날짜를 네이버 API 형식으로 정규화
 */
export function normalizeNaverDateTime(input: string, role: "from" | "to"): string {
  // 1) UI에서 흔히 오는 YYYY-MM-DD → 문서 요구 date-time(+09:00)로 변환
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return role === "from" ? `${input}T00:00:00.000+09:00` : `${input}T23:59:59.999+09:00`;
  }

  // 2) timezone 없는 date-time이면 +09:00를 붙임 (예: 2024-06-07T19:00:00.000)
  if (/^\d{4}-\d{2}-\d{2}T/.test(input) && !/(Z|[+-]\d{2}:\d{2})$/.test(input)) {
    return `${input}+09:00`;
  }

  // 3) Z 또는 offset 포함 ISO면 파싱 후 +09:00로 정규화
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) return toKSTString(d);

  // 4) 최후: 그대로(서버가 추가 검증 로그로 잡도록)
  return input;
}
