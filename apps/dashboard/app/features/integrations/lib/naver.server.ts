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

export interface NaverProductDetailed {
  originProductNo: number;
  channelProductNo?: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  productStatusType: string;
  channelProductDisplayStatusType?: string;
  saleStartDate?: string;
  saleEndDate?: string;
  representativeImage?: {
    url: string;
  };
  detailAttribute?: {
    naverShoppingSearchInfo?: {
      categoryId?: string;
    };
  };
  optionInfo?: {
    optionCombinations?: NaverProductOption[];
  };
}

export interface NaverProductOption {
  id: number;
  optionName1?: string;
  optionValue1?: string;
  optionName2?: string;
  optionValue2?: string;
  stockQuantity: number;
  price: number;
  sellerManagerCode?: string;
  usable: boolean;
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

  console.log(`🔑 [H2] 토큰 유효: ${token.access_token.slice(0, 20)}...`);
  console.log(`🔗 [H2] 프록시 URL: ${proxyUrl || '없음 (직접 호출)'}`);

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
      
      const proxyBody = {
        method,
        path: endpoint,
        headers: {
          "Authorization": `${token.token_type} ${token.access_token}`,
        },
        body,
      };
      
      console.log(`📤 [H2] 프록시 요청: POST ${proxyUrl}/api/proxy`);
      console.log(`📤 [H2] 프록시 body: ${JSON.stringify(proxyBody)}`);
      
      // 범용 프록시 API 사용
      response = await fetch(`${proxyUrl}/api/proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify(proxyBody),
      });
    } else {
      // 직접 호출
      const apiUrl = `${NAVER_API_BASE}${endpoint}`;
      
      console.log(`📤 [H2] 직접 호출: ${method} ${apiUrl}`);
      
      response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token.token_type} ${token.access_token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    const responseText = await response.text();
    console.log(`📥 [H2] 응답 (${response.status}): ${responseText.slice(0, 500)}`);

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
 * 프록시 서버의 /api/orders 엔드포인트 사용 (이미 검증된 엔드포인트)
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C
 */
export async function getOrders(params: GetOrdersParams = {}): Promise<{
  success: boolean;
  orders?: NaverOrder[];
  count?: number;
  error?: string;
}> {
  const perfStart = Date.now();
  // 기본값: 최근 7일 (ISO-8601 +09:00 예시: 2024-06-07T19:00:00.000+09:00)
  // 문서: https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-product-orders-with-conditions-pay-order-seller
  const toKSTString = (date: Date): string => {
    const kstOffset = 9 * 60 * 60 * 1000; // +09:00 in ms
    const kstDate = new Date(date.getTime() + kstOffset);
    return kstDate.toISOString().replace("Z", "+09:00");
  };

  const normalizeNaverDateTime = (input: string, role: "from" | "to"): string => {
    // 1) UI에서 흔히 오는 YYYY-MM-DD → 문서 요구 date-time(+09:00)로 변환
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return role === "from"
        ? `${input}T00:00:00.000+09:00`
        : `${input}T23:59:59.999+09:00`;
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
  };

  const rawEnd = params.orderDateTo || toKSTString(new Date());
  const rawStart =
    params.orderDateFrom ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return toKSTString(d);
    })();

  const endDate = normalizeNaverDateTime(rawEnd, "to");
  const startDate = normalizeNaverDateTime(rawStart, "from");

  console.log(`🔍 [DEBUG v4] 네이버 주문 조회 시작 - from/to ISO-8601(+09:00) 정규화`);
  console.log(`🧭 [DEBUG v4] rawFrom/rawTo: ${rawStart} ~ ${rawEnd}`);
  console.log(`📅 [DEBUG v4] from/to: ${startDate} ~ ${endDate}`);
  // #region agent log
  if (process.env.DEBUG_NDJSON_INGEST === "1") {
    fetch("http://127.0.0.1:7242/ingest/876e79b7-3e6f-4fe2-a898-0e4d7dc77d34",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"naver.server.ts:getOrders",message:"normalized from/to",data:{rawStart,rawEnd,startDate,endDate},timestamp:Date.now(),sessionId:"debug-session",runId:"pre-fix",hypothesisId:"H1"})}).catch(()=>{});
  }
  // #endregion

  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();
  const token = await getValidToken();

  if (!token) {
    console.error(`❌ [DEBUG] 토큰 없음`);
    return { success: false, error: "유효한 네이버 토큰이 없습니다" };
  }

  console.log(`🔑 [DEBUG] 토큰 유효: ${token.access_token.slice(0, 20)}...`);

  const extractItems = (resp: any): any[] => {
    if (Array.isArray(resp?.data?.contents)) return resp.data.contents;
    if (Array.isArray(resp?.contents)) return resp.contents;
    if (Array.isArray(resp?.data)) return resp.data;
    if (Array.isArray(resp?.data?.data?.contents)) return resp.data.data.contents;
    return [];
  };

  const mapItemToNaverOrder = (item: any): NaverOrder => {
    // 문서 응답 구조(조건형 상품 주문 상세 내역): { productOrderId, content: { order, productOrder, delivery? } }
    const content = item?.content ?? item;
    const order = content?.order ?? item?.order ?? {};
    const productOrder = content?.productOrder ?? item?.productOrder ?? item ?? {};
    const delivery = content?.delivery ?? productOrder?.delivery ?? {};
    const shippingAddress = productOrder?.shippingAddress ?? {};

    const baseAddress = shippingAddress?.baseAddress ?? "";
    const detailedAddress = shippingAddress?.detailedAddress ?? "";
    const receiverAddress = [baseAddress, detailedAddress].filter(Boolean).join(" ");

    return {
      productOrderId: item?.productOrderId ?? productOrder?.productOrderId ?? "",
      orderId: order?.orderId ?? item?.orderId ?? productOrder?.orderId ?? "",
      orderDate: order?.orderDate ?? item?.orderDate ?? productOrder?.placeOrderDate ?? "",
      paymentDate: order?.paymentDate ?? item?.paymentDate ?? "",
      orderStatus: order?.orderStatus ?? item?.orderStatus ?? "",
      productOrderStatus: productOrder?.productOrderStatus ?? item?.productOrderStatus ?? "",
      productId: String(productOrder?.productId ?? item?.productId ?? ""),
      productName: productOrder?.productName ?? item?.productName ?? "",
      productOption: productOrder?.productOption ?? item?.productOption ?? "",
      quantity: Number(productOrder?.quantity ?? item?.quantity ?? 0),
      unitPrice: Number(productOrder?.unitPrice ?? item?.unitPrice ?? 0),
      totalProductAmount: Number(productOrder?.totalProductAmount ?? item?.totalProductAmount ?? 0),
      deliveryFee: Number(productOrder?.deliveryFeeAmount ?? item?.deliveryFee ?? 0),
      totalPaymentAmount: Number(productOrder?.totalPaymentAmount ?? item?.totalPaymentAmount ?? 0),
      ordererName: order?.ordererName ?? item?.ordererName ?? "",
      ordererTel: order?.ordererTel ?? item?.ordererTel ?? "",
      receiverName: shippingAddress?.name ?? item?.receiverName ?? "",
      receiverTel: shippingAddress?.tel1 ?? item?.receiverTel ?? "",
      receiverAddress,
      deliveryMemo: productOrder?.shippingMemo ?? item?.deliveryMemo ?? "",
      trackingNumber: delivery?.trackingNumber ?? item?.trackingNumber ?? "",
      deliveryCompanyCode: delivery?.deliveryCompany ?? item?.deliveryCompanyCode ?? "",
    };
  };

  const parseIso = (s: string): Date | null => {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  // 네이버 제약: from/to 최대 24시간 차이
  const fromDate = parseIso(startDate);
  const toDate = parseIso(endDate);
  if (!fromDate || !toDate) {
    console.error("❌ [DEBUG v4] from/to 파싱 실패", { startDate, endDate });
    return { success: false, error: "from/to 날짜 파싱 실패" };
  }

  const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
  const allOrders: NaverOrder[] = [];

  // 프록시 서버가 있으면 /api/orders 사용 (이미 검증된 엔드포인트)
  if (proxyUrl) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.access_token}`,
      };
      
      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }

      let cursor = fromDate.getTime();
      const endMs = toDate.getTime();
      let windowIndex = 0;
      const windowTimesMs: number[] = [];
      const windowItemCounts: number[] = [];
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/876e79b7-3e6f-4fe2-a898-0e4d7dc77d34",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"naver.server.ts:getOrders",message:"windowed fetch start",data:{windowHours:24,from:startDate,to:endDate},timestamp:Date.now(),sessionId:"debug-session",runId:"pre-fix",hypothesisId:"H1"})}).catch(()=>{});
      // #endregion

      while (cursor <= endMs) {
        const windowT0 = Date.now();
        const windowFrom = new Date(cursor);
        const windowTo = new Date(Math.min(cursor + MAX_WINDOW_MS - 1, endMs));
        const windowFromStr = toKSTString(windowFrom);
        const windowToStr = toKSTString(windowTo);

        const queryParams = new URLSearchParams();
        queryParams.set("from", windowFromStr);
        queryParams.set("to", windowToStr);

        const ordersUrl = `${proxyUrl}/api/orders?${queryParams.toString()}`;
        console.log(`🌐 [DEBUG v4] 윈도우 ${windowIndex}: ${windowFromStr} ~ ${windowToStr}`);
        console.log(`🌐 [DEBUG v4] 프록시 /api/orders 호출: ${ordersUrl}`);

        const response = await fetch(ordersUrl, { method: "GET", headers });
        const responseText = await response.text();
        console.log(`📥 [DEBUG v4] 응답 (${response.status}) head: ${responseText.slice(0, 300)}`);

        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error(`❌ [DEBUG v4] JSON 파싱 실패 head: ${responseText.slice(0, 300)}`);
          return { success: false, error: "API 응답 파싱 실패" };
        }

        if (!response.ok) {
          console.error(`❌ [DEBUG v4] API 에러: ${response.status}`, data);
          return { success: false, error: data.message || `API 호출 실패 (${response.status})` };
        }

        const items = extractItems(data);
        console.log(
          `✅ [DEBUG v4] 윈도우 ${windowIndex} 아이템 수: ${items.length} (keys: ${Object.keys(data || {}).join(",")})`
        );
        windowTimesMs.push(Date.now() - windowT0);
        windowItemCounts.push(items.length);

        if (items.length > 0) {
          // 첫 1개만 형태 확인 로그(PII/토큰 제외)
          const sample = items[0];
          console.log(
            `🧩 [DEBUG v4] sample keys: ${Object.keys(sample || {}).slice(0, 30).join(",")}`
          );
        }

        for (const it of items) {
          allOrders.push(mapItemToNaverOrder(it));
        }

        // 다음 24시간 윈도우
        cursor += MAX_WINDOW_MS;
        windowIndex++;
      }

      const perfMs = Date.now() - perfStart;
      const maxWinMs = windowTimesMs.length ? Math.max(...windowTimesMs) : 0;
      const avgWinMs = windowTimesMs.length
        ? Math.round(windowTimesMs.reduce((a, b) => a + b, 0) / windowTimesMs.length)
        : 0;
      console.log(`✅ [DEBUG v4] 전체 주문 수(윈도우 합산): ${allOrders.length} (총 ${perfMs}ms)`);
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/876e79b7-3e6f-4fe2-a898-0e4d7dc77d34",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"naver.server.ts:getOrders",message:"windowed fetch done",data:{windows:windowTimesMs.length,totalOrders:allOrders.length,perfMs,maxWinMs,avgWinMs,itemsPerWindow:windowItemCounts.slice(0,10)},timestamp:Date.now(),sessionId:"debug-session",runId:"pre-fix",hypothesisId:"H1"})}).catch(()=>{});
      // #endregion
      return { success: true, orders: allOrders, count: allOrders.length };
      
    } catch (error) {
      console.error(`❌ [DEBUG] 요청 에러:`, error);
      return { success: false, error: "API 호출 중 오류가 발생했습니다" };
    }
  }

  // 직접 호출 (프록시 없이)
  const queryParams = new URLSearchParams();
  queryParams.set("lastChangedFrom", startDate);
  queryParams.set("lastChangedTo", endDate);

  const endpoint = `/external/v1/pay-order/seller/orders?${queryParams.toString()}`;
  console.log(`🌐 [DEBUG] 직접 호출: GET ${endpoint}`);

  const result = await naverFetch<{ data: NaverOrder[] }>(
    endpoint,
    { method: "GET" }
  );

  if (result.success) {
    const orders = result.data?.data || [];
    console.log(`✅ [DEBUG] 성공! 주문 수: ${orders.length}`);
    return { success: true, orders: orders as NaverOrder[], count: orders.length };
  }

  console.log(`❌ [DEBUG] 실패: ${result.error}`);
  return { success: false, error: result.error };
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

/**
 * 상품 목록 상세 조회 (옵션 포함)
 * GET /v1/products
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/read-channel-product-1-product
 */
export async function getProductListDetailed(params: GetProductsParams = {}): Promise<{
  success: boolean;
  products?: NaverProductDetailed[];
  totalCount?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page || 1));
  queryParams.set("size", String(params.size || 100));
  
  if (params.productStatusType) {
    queryParams.set("productStatusType", params.productStatusType);
  }

  console.log(`📦 네이버 상품 목록 조회: /external/v1/products?${queryParams.toString()}`);

  const result = await naverFetch<{ 
    contents: NaverProductDetailed[]; 
    totalElements: number;
    totalPages: number;
  }>(
    `/external/v1/products?${queryParams.toString()}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    products: result.data?.contents || [],
    totalCount: result.data?.totalElements || 0,
  };
}

/**
 * 채널 상품 단건 조회 (상세 정보 + 옵션)
 * GET /v2/products/channel-products/:channelProductNo
 */
export async function getChannelProduct(channelProductNo: number): Promise<{
  success: boolean;
  product?: NaverProductDetailed;
  error?: string;
}> {
  const result = await naverFetch<NaverProductDetailed>(
    `/external/v2/products/channel-products/${channelProductNo}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    product: result.data,
  };
}

/**
 * 원상품 조회 (옵션 정보 포함)
 * GET /v2/products/origin-products/:originProductNo
 */
export async function getOriginProduct(originProductNo: number): Promise<{
  success: boolean;
  product?: NaverProductDetailed;
  error?: string;
}> {
  const result = await naverFetch<NaverProductDetailed>(
    `/external/v2/products/origin-products/${originProductNo}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    product: result.data,
  };
}

/**
 * 상품 옵션 재고/가격 변경
 * PUT /v1/products/origin-products/:originProductNo/option-stock
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/update-options-product
 */
export async function updateProductOptionStock(
  originProductNo: number,
  options: {
    optionCombinationId: number;
    stockQuantity?: number;
    price?: number;
  }[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  const body = {
    optionStockUpdateRequests: options.map(opt => ({
      id: opt.optionCombinationId,
      stockQuantity: opt.stockQuantity,
      price: opt.price,
    })),
  };

  console.log(`📦 네이버 옵션 재고 변경: originProductNo=${originProductNo}`, body);

  const result = await naverFetch<any>(
    `/external/v1/products/origin-products/${originProductNo}/option-stock`,
    {
      method: "PUT",
      body,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
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

