/**
 * 네이버 커머스 API 클라이언트
 * 
 * 네이버 스마트스토어 API와 통신하는 서버 유틸리티입니다.
 * 토큰 자동 갱신, API 호출 등을 처리합니다.
 * 
 * 참고: https://apicenter.commerce.naver.com/docs/introduction
 */

// ============================================================================
// Types
// ============================================================================

export interface NaverToken {
  id: string;
  account_id: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  issued_at: string;
  expires_at: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface NaverOrder {
  productOrderId: string;
  orderId: string;
  orderDate: string;
  paymentDate: string;
  orderStatus: string;
  productOrderStatus: string;
  productId: string;
  productName: string;
  productOption: string;
  quantity: number;
  unitPrice: number;
  totalProductAmount: number;
  deliveryFee: number;
  totalPaymentAmount: number;
  ordererName: string;
  ordererTel: string;
  receiverName: string;
  receiverTel: string;
  receiverAddress: string;
  deliveryMemo: string;
  trackingNumber: string;
  deliveryCompanyCode: string;
}

export interface NaverProduct {
  originProductNo: number;
  channelProductNo: number;
  productName: string;
  salePrice: number;
  stockQuantity: number;
  channelProductDisplayStatusType: string;
  statusType: string;
  saleStartDate: string;
  saleEndDate: string;
}

export interface NaverClaim {
  productOrderId: string;
  claimType: string;
  claimStatus: string;
  claimRequestDate: string;
  claimReason: string;
  refundExpectedAmount: number;
}

// ============================================================================
// Token Management
// ============================================================================

const NAVER_API_BASE = "https://api.commerce.naver.com";

/**
 * 프록시 서버 URL (Railway에 배포)
 * 네이버 커머스 API는 고정 IP에서만 호출 가능
 */
function getProxyUrl(): string | null {
  return process.env.NAVER_PROXY_URL || null;
}

function getProxyApiKey(): string | null {
  return process.env.NAVER_PROXY_API_KEY || null;
}

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
      .upsert({
        account_id: accountId,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || "Bearer",
        expires_in: tokenData.expires_in || 3600,
        scope: tokenData.scope || "",
        issued_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        client_id: clientId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id" })
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
    token = await refreshNaverToken(token);
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
async function naverFetch<T>(
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

  try {
    let response: Response;
    
    // 프록시 서버가 설정되어 있으면 프록시를 통해 호출
    if (proxyUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `${token.token_type} ${token.access_token}`,
      };
      
      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }
      
      // 범용 프록시 API 사용
      response = await fetch(`${proxyUrl}/api/proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          method,
          path: endpoint,
          headers: {
            "Authorization": `${token.token_type} ${token.access_token}`,
          },
          body,
        }),
      });
    } else {
      // 직접 호출
      const apiUrl = `${NAVER_API_BASE}${endpoint}`;
      
      response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token.token_type} ${token.access_token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    const responseData = await response.json();

    if (!response.ok) {
      console.error("❌ 네이버 API 에러:", response.status, responseData);
      return { 
        success: false, 
        error: responseData.message || `API 호출 실패 (${response.status})` 
      };
    }

    return { success: true, data: responseData as T };
  } catch (error) {
    console.error("❌ 네이버 API 호출 중 오류:", error);
    return { success: false, error: "API 호출 중 오류가 발생했습니다" };
  }
}

// ============================================================================
// Orders API
// ============================================================================

export interface GetOrdersParams {
  orderDateFrom?: string;  // YYYY-MM-DDTHH:mm:ss.SSSZ
  orderDateTo?: string;
  productOrderStatus?: string;
  limit?: number;
}

/**
 * 주문 목록 조회
 * POST /external/v1/pay-order/seller/product-orders/last-changed-statuses
 */
export async function getOrders(params: GetOrdersParams = {}): Promise<{
  success: boolean;
  orders?: NaverOrder[];
  count?: number;
  error?: string;
}> {
  // 기본값: 최근 7일
  const endDate = params.orderDateTo || new Date().toISOString();
  const startDate = params.orderDateFrom || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  })();

  const result = await naverFetch<{ data: { lastChangeStatuses: NaverOrder[] } }>(
    "/external/v1/pay-order/seller/product-orders/last-changed-statuses",
    {
      method: "POST",
      body: {
        lastChangedFrom: startDate,
        lastChangedTo: endDate,
        lastChangeType: "PAYED", // 결제 완료된 주문
      },
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    orders: result.data?.data?.lastChangeStatuses || [],
    count: result.data?.data?.lastChangeStatuses?.length || 0,
  };
}

/**
 * 상품 주문 상세 조회
 * POST /external/v1/pay-order/seller/product-orders/query
 */
export async function getOrderDetails(productOrderIds: string[]): Promise<{
  success: boolean;
  orders?: NaverOrder[];
  error?: string;
}> {
  const result = await naverFetch<{ data: NaverOrder[] }>(
    "/external/v1/pay-order/seller/product-orders/query",
    {
      method: "POST",
      body: {
        productOrderIds,
      },
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    orders: result.data?.data || [],
  };
}

// ============================================================================
// Products API
// ============================================================================

export interface GetProductsParams {
  page?: number;
  size?: number;
  productStatusType?: string;
}

/**
 * 상품 목록 조회
 * GET /external/v2/products
 */
export async function getProducts(params: GetProductsParams = {}): Promise<{
  success: boolean;
  products?: NaverProduct[];
  count?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page || 1));
  queryParams.set("size", String(params.size || 100));
  
  if (params.productStatusType) {
    queryParams.set("productStatusType", params.productStatusType);
  }

  const result = await naverFetch<{ contents: NaverProduct[]; totalElements: number }>(
    `/external/v2/products?${queryParams.toString()}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    products: result.data?.contents || [],
    count: result.data?.totalElements || 0,
  };
}

// ============================================================================
// Claims API
// ============================================================================

export interface GetClaimsParams {
  claimRequestDateFrom?: string;
  claimRequestDateTo?: string;
  claimType?: "CANCEL" | "RETURN" | "EXCHANGE";
  claimStatus?: string;
}

/**
 * 클레임 목록 조회
 * POST /external/v1/pay-order/seller/claims
 */
export async function getClaims(params: GetClaimsParams = {}): Promise<{
  success: boolean;
  claims?: NaverClaim[];
  count?: number;
  error?: string;
}> {
  const endDate = params.claimRequestDateTo || new Date().toISOString();
  const startDate = params.claimRequestDateFrom || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  })();

  const body: Record<string, any> = {
    claimRequestDateFrom: startDate,
    claimRequestDateTo: endDate,
  };

  if (params.claimType) {
    body.claimType = params.claimType;
  }

  const result = await naverFetch<{ data: { contents: NaverClaim[] } }>(
    "/external/v1/pay-order/seller/claims",
    {
      method: "POST",
      body,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    claims: result.data?.data?.contents || [],
    count: result.data?.data?.contents?.length || 0,
  };
}

// ============================================================================
// Token Disconnect
// ============================================================================

/**
 * 네이버 연동 해제
 */
export async function disconnectNaver(accountId: string): Promise<{ success: boolean; error?: string }> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("naver_tokens")
    .delete()
    .eq("account_id", accountId);

  if (error) {
    console.error("❌ 네이버 연동 해제 실패:", error);
    return { success: false, error: "연동 해제에 실패했습니다" };
  }

  console.log("✅ 네이버 연동 해제 완료:", accountId);
  return { success: true };
}

// ============================================================================
// Connection Test
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

