/**
 * Cafe24 API 클라이언트
 * 
 * Cafe24 Admin API와 통신하는 서버 유틸리티입니다.
 * 토큰 자동 갱신, API 호출 등을 처리합니다.
 */

// ============================================================================
// Types
// ============================================================================

export interface Cafe24Token {
  id: string;
  mall_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  issued_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Cafe24Order {
  order_id: string;
  order_date: string;
  order_name: string;
  order_email: string;
  order_phone: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  billing_name: string;
  payment_method: string;
  payment_amount: string;
  actual_payment_amount: string;
  order_price_amount: string;
  shipping_fee: string;
  order_status: string;
  items: Cafe24OrderItem[];
  receiver: Cafe24Receiver;
}

export interface Cafe24OrderItem {
  order_item_code: string;
  product_no: number;
  product_code: string;
  product_name: string;
  option_value: string;
  quantity: number;
  product_price: string;
  option_price: string;
  additional_discount_price: string;
  order_status: string;
  shipping_company_code: string;
  tracking_no: string;
}

export interface Cafe24Receiver {
  name: string;
  phone: string;
  cellphone: string;
  zipcode: string;
  address1: string;
  address2: string;
  shipping_message: string;
}

export interface Cafe24Product {
  product_no: number;
  product_code: string;
  product_name: string;
  price: string;
  retail_price: string;
  supply_price: string;
  display: string;
  selling: string;
  stock_quantity: number;
}

export interface Cafe24ProductDetailed {
  product_no: number;
  product_code: string;
  product_name: string;
  internal_product_name: string;
  model_name: string;
  price: string;
  retail_price: string;
  supply_price: string;
  display: string;
  selling: string;
  product_condition: string;
  product_used_month: number;
  summary_description: string;
  detail_image: string;
  list_image: string;
  tiny_image: string;
  small_image: string;
  category: {
    category_no: number;
    category_depth: number;
  }[];
  created_date: string;
  updated_date: string;
  variants?: Cafe24Variant[];
}

export interface Cafe24Variant {
  variant_code: string;
  options: {
    name: string;
    value: string;
  }[];
  display: string;
  selling: string;
  additional_amount: string;
  quantity: number;
  safety_inventory: number;
  use_inventory: string;
  important_inventory: string;
  inventory_control_type: string;
  custom_variant_code: string;
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Cafe24 토큰 조회
 */
export async function getCafe24Token(mallId?: string): Promise<Cafe24Token | null> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  let query = adminClient.from("cafe24_tokens").select("*");
  
  if (mallId) {
    query = query.eq("mall_id", mallId);
  }
  
  const { data, error } = await query.single();

  if (error || !data) {
    console.error("❌ Cafe24 토큰 조회 실패:", error);
    return null;
  }

  return data as Cafe24Token;
}

/**
 * 토큰 만료 여부 확인 (5분 여유)
 */
export function isTokenExpired(token: Cafe24Token): boolean {
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5분
  return expiresAt.getTime() - buffer < now.getTime();
}

/**
 * Cafe24 토큰 갱신
 */
export async function refreshCafe24Token(token: Cafe24Token): Promise<Cafe24Token | null> {
  const clientId = process.env.CAFE24_CLIENT_ID;
  const clientSecret = process.env.CAFE24_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ Cafe24 credentials가 설정되지 않음");
    return null;
  }

  const tokenUrl = `https://${token.mall_id}.cafe24api.com/api/v2/oauth/token`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
    },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
  });

  if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ 토큰 갱신 실패:", response.status, errorData);
      return null;
    }

    const tokenData = await response.json();
    console.log("✅ Cafe24 토큰 갱신 성공");

    // DB 업데이트
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    const { data: updatedToken, error: updateError } = await adminClient
      .from("cafe24_tokens")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in || Math.floor((new Date(tokenData.expires_at).getTime() - Date.now()) / 1000),
        scope: Array.isArray(tokenData.scopes) ? tokenData.scopes.join(",") : tokenData.scope,
        issued_at: tokenData.issued_at,
        expires_at: tokenData.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("mall_id", token.mall_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ 토큰 업데이트 실패:", updateError);
      return null;
    }

    return updatedToken as Cafe24Token;
  } catch (error) {
    console.error("❌ 토큰 갱신 중 오류:", error);
    return null;
  }
}

/**
 * 유효한 토큰 가져오기 (자동 갱신)
 */
export async function getValidToken(mallId?: string): Promise<Cafe24Token | null> {
  let token = await getCafe24Token(mallId);
  
  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    console.log("🔄 토큰 만료됨, 갱신 시도...");
    token = await refreshCafe24Token(token);
  }

  return token;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Cafe24 API 호출
 */
async function cafe24Fetch<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, any>;
    mallId?: string;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = "GET", body, mallId } = options;
  
  const token = await getValidToken(mallId);
  if (!token) {
    return { success: false, error: "유효한 Cafe24 토큰이 없습니다. 연동을 다시 해주세요." };
  }

  const apiUrl = `https://${token.mall_id}.cafe24api.com/api/v2${endpoint}`;

  try {
    console.log(`🌐 Cafe24 API 요청: ${method} ${apiUrl}`);
    console.log(`🔑 토큰: ${token.access_token.slice(0, 10)}...`);

    const response = await fetch(apiUrl, {
      method,
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.access_token}`,
        "X-Cafe24-Api-Version": "2024-09-01",
    },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`📥 Cafe24 API 응답 (${response.status}):`, responseText.slice(0, 2000));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("❌ JSON 파싱 실패:", responseText);
      return { success: false, error: "API 응답 파싱 실패" };
    }

  if (!response.ok) {
      console.error("❌ Cafe24 API 에러:", response.status, responseData);
      return { 
        success: false, 
        error: responseData.error?.message || `API 호출 실패 (${response.status})` 
      };
    }

    return { success: true, data: responseData as T };
  } catch (error) {
    console.error("❌ Cafe24 API 호출 중 오류:", error);
    return { success: false, error: "API 호출 중 오류가 발생했습니다" };
  }
}

// ============================================================================
// Orders API
// ============================================================================

export interface GetOrdersParams {
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  orderStatus?: string;
  limit?: number;
  offset?: number;
}

/**
 * 주문 목록 조회
 * GET /admin/orders
 */
export async function getOrders(params: GetOrdersParams = {}): Promise<{
  success: boolean;
  orders?: Cafe24Order[];
  count?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  
  // 기본값: 최근 7일
  const endDate = params.endDate || new Date().toISOString().split("T")[0];
  const startDate = params.startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();

  // Cafe24 API 날짜 필터
  queryParams.set("start_date", startDate);
  queryParams.set("end_date", endDate);
  
  if (params.orderStatus) {
    queryParams.set("order_status", params.orderStatus);
  }
  if (params.limit) {
    queryParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    queryParams.set("offset", String(params.offset));
}

  // embed로 상세 정보 포함
  queryParams.set("embed", "items,receivers");

  const endpoint = `/admin/orders?${queryParams.toString()}`;
  console.log(`🔍 Cafe24 API 호출: ${endpoint}`);
  console.log(`📅 날짜 범위: ${startDate} ~ ${endDate}`);

  const result = await cafe24Fetch<{ orders: Cafe24Order[]; count: number }>(endpoint);

  console.log(`📦 Cafe24 API 응답:`, JSON.stringify(result, null, 2).slice(0, 1000));

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    orders: result.data?.orders || [],
    count: result.data?.count || 0,
  };
}

/**
 * 단일 주문 조회
 * GET /admin/orders/{order_id}
 */
export async function getOrder(orderId: string): Promise<{
  success: boolean;
  order?: Cafe24Order;
  error?: string;
}> {
  const result = await cafe24Fetch<{ order: Cafe24Order }>(
    `/admin/orders/${orderId}?embed=items,receivers`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    order: result.data?.order,
  };
}

// ============================================================================
// Products API
// ============================================================================

export interface GetProductsParams {
  productNo?: number[];
  productCode?: string[];
  display?: "T" | "F";
  selling?: "T" | "F";
  limit?: number;
  offset?: number;
}

/**
 * 상품 목록 조회
 * GET /admin/products
 */
export async function getProducts(params: GetProductsParams = {}): Promise<{
  success: boolean;
  products?: Cafe24Product[];
  count?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  
  if (params.productNo?.length) {
    queryParams.set("product_no", params.productNo.join(","));
  }
  if (params.productCode?.length) {
    queryParams.set("product_code", params.productCode.join(","));
  }
  if (params.display) {
    queryParams.set("display", params.display);
  }
  if (params.selling) {
    queryParams.set("selling", params.selling);
  }
  if (params.limit) {
    queryParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    queryParams.set("offset", String(params.offset));
  }

  const result = await cafe24Fetch<{ products: Cafe24Product[]; count: number }>(
    `/admin/products?${queryParams.toString()}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    products: result.data?.products || [],
    count: result.data?.count || 0,
  };
}

/**
 * 상품 상세 목록 조회 (Variants 포함)
 * GET /admin/products (embed=variants)
 */
export async function getProductsDetailed(params: GetProductsParams = {}): Promise<{
  success: boolean;
  products?: Cafe24ProductDetailed[];
  count?: number;
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  
  if (params.productNo?.length) {
    queryParams.set("product_no", params.productNo.join(","));
  }
  if (params.productCode?.length) {
    queryParams.set("product_code", params.productCode.join(","));
  }
  if (params.display) {
    queryParams.set("display", params.display);
  }
  if (params.selling) {
    queryParams.set("selling", params.selling);
  }
  if (params.limit) {
    queryParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    queryParams.set("offset", String(params.offset));
  }

  // Variants 정보 포함
  queryParams.set("embed", "variants");

  const result = await cafe24Fetch<{ products: Cafe24ProductDetailed[] }>(
    `/admin/products?${queryParams.toString()}`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    products: result.data?.products || [],
    count: result.data?.products?.length || 0,
  };
}

/**
 * 단일 상품 Variants 조회
 * GET /admin/products/{product_no}/variants
 */
export async function getProductVariants(productNo: number): Promise<{
  success: boolean;
  variants?: Cafe24Variant[];
  error?: string;
}> {
  const result = await cafe24Fetch<{ variants: Cafe24Variant[] }>(
    `/admin/products/${productNo}/variants`
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    variants: result.data?.variants || [],
  };
}

/**
 * Variant 재고 수량 업데이트
 * PUT /admin/products/{product_no}/variants/{variant_code}
 */
export async function updateVariantInventory(
  productNo: number, 
  variantCode: string, 
  quantity: number
): Promise<{
  success: boolean;
  variant?: Cafe24Variant;
  error?: string;
}> {
  const result = await cafe24Fetch<{ variant: Cafe24Variant }>(
    `/admin/products/${productNo}/variants/${variantCode}`,
    {
      method: "PUT",
      body: {
        shop_no: 1,
        request: {
          quantity: quantity,
        },
      },
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    variant: result.data?.variant,
  };
}

// ============================================================================
// Store Info API
// ============================================================================

export interface Cafe24StoreInfo {
  shop_no: number;
  shop_name: string;
  mall_id: string;
  country_code: string;
  language_code: string;
  currency_code: string;
}

/**
 * 쇼핑몰 정보 조회
 * GET /admin/store
 */
export async function getStoreInfo(): Promise<{
  success: boolean;
  store?: Cafe24StoreInfo;
  error?: string;
}> {
  const result = await cafe24Fetch<{ store: Cafe24StoreInfo }>("/admin/store");

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    store: result.data?.store,
  };
}

// ============================================================================
// Token Disconnect
// ============================================================================

// ============================================================================
// Invoice API (송장 전송)
// ============================================================================

export interface InvoiceSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Cafe24 송장 전송
 * PUT /api/v2/admin/orders/{order_id}/items/{order_item_code}
 *
 * 참고: https://developers.cafe24.com/docs/api/admin/#update-an-order-item
 */
export async function sendInvoiceToCafe24(
  mallId: string,
  accessToken: string,
  orderId: string,
  orderItemCode: string,
  shippingCompanyCode: string,
  trackingNo: string
): Promise<InvoiceSendResult> {
  const apiUrl = `https://${mallId}.cafe24api.com/api/v2/admin/orders/${orderId}/items/${orderItemCode}`;

  try {
    console.log(`📤 Cafe24 송장 전송: 주문=${orderId}, 아이템=${orderItemCode}, 택배사=${shippingCompanyCode}, 송장=${trackingNo}`);

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Cafe24-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        shop_no: 1,
        request: {
          shipping_company_code: shippingCompanyCode,
          tracking_no: trackingNo,
        },
      }),
    });

    const responseText = await response.text();
    console.log(`📥 Cafe24 송장 전송 응답 (${response.status}):`, responseText.slice(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("❌ Cafe24 송장 전송 응답 파싱 실패:", responseText);
      return { success: false, error: "API 응답 파싱 실패" };
    }

    if (!response.ok) {
      console.error("❌ Cafe24 송장 전송 실패:", response.status, responseData);
      return {
        success: false,
        error: responseData.error?.message || `송장 전송 실패 (${response.status})`
      };
    }

    console.log("✅ Cafe24 송장 전송 성공:", orderId, trackingNo);
    return { success: true, message: "송장이 성공적으로 전송되었습니다" };
  } catch (error) {
    console.error("❌ Cafe24 송장 전송 중 오류:", error);
    return { success: false, error: "송장 전송 중 오류가 발생했습니다" };
  }
}

/**
 * Cafe24 송장 전송 (토큰 자동 관리 버전)
 * 토큰 갱신 및 mallId 조회를 자동으로 처리
 */
export async function sendInvoiceToCafe24WithAuth(
  orderId: string,
  orderItemCode: string,
  shippingCompanyCode: string,
  trackingNo: string,
  mallId?: string
): Promise<InvoiceSendResult> {
  const token = await getValidToken(mallId);
  if (!token) {
    return { success: false, error: "유효한 Cafe24 토큰이 없습니다. 연동을 다시 해주세요." };
  }

  return sendInvoiceToCafe24(
    token.mall_id,
    token.access_token,
    orderId,
    orderItemCode,
    shippingCompanyCode,
    trackingNo
  );
}

// ============================================================================
// Token Disconnect
// ============================================================================

/**
 * Cafe24 연동 해제
 */
export async function disconnectCafe24(mallId: string): Promise<{ success: boolean; error?: string }> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("cafe24_tokens")
    .delete()
    .eq("mall_id", mallId);

  if (error) {
    console.error("❌ Cafe24 연동 해제 실패:", error);
    return { success: false, error: "연동 해제에 실패했습니다" };
  }

  console.log("✅ Cafe24 연동 해제 완료:", mallId);
  return { success: true };
}

