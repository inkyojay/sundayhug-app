/**
 * 네이버 커머스 API - 주문 관련
 *
 * 주문 조회/발송처리 API
 */

import {
  naverFetch,
  getValidToken,
  getProxyUrl,
  getProxyApiKey,
  NAVER_API_BASE,
  toKSTString,
  normalizeNaverDateTime,
} from "./naver-auth.server";
import type {
  NaverOrder,
  GetOrdersParams,
  PlaceOrderParams,
  GetLastChangedOrdersParams,
  InvoiceSendResult,
} from "./naver-types.server";

// ============================================================================
// 주문 조회
// ============================================================================

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

  console.log(`🔍 [getOrders] 네이버 주문 조회 시작`);
  console.log(`📅 [getOrders] from/to: ${startDate} ~ ${endDate}`);

  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();
  const token = await getValidToken();

  if (!token) {
    console.error(`❌ [getOrders] 토큰 없음`);
    return { success: false, error: "유효한 네이버 토큰이 없습니다" };
  }

  const extractItems = (resp: any): any[] => {
    if (Array.isArray(resp?.data?.contents)) return resp.data.contents;
    if (Array.isArray(resp?.contents)) return resp.contents;
    if (Array.isArray(resp?.data)) return resp.data;
    if (Array.isArray(resp?.data?.data?.contents)) return resp.data.data.contents;
    return [];
  };

  const mapItemToNaverOrder = (item: any): NaverOrder => {
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
    console.error("❌ [getOrders] from/to 파싱 실패", { startDate, endDate });
    return { success: false, error: "from/to 날짜 파싱 실패" };
  }

  const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
  const allOrders: NaverOrder[] = [];

  // 프록시 서버가 있으면 /api/orders 사용 (이미 검증된 엔드포인트)
  if (proxyUrl) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.access_token}`,
      };

      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }

      let cursor = fromDate.getTime();
      const endMs = toDate.getTime();
      let windowIndex = 0;

      while (cursor <= endMs) {
        const windowFrom = new Date(cursor);
        const windowTo = new Date(Math.min(cursor + MAX_WINDOW_MS - 1, endMs));
        const windowFromStr = toKSTString(windowFrom);
        const windowToStr = toKSTString(windowTo);

        const queryParams = new URLSearchParams();
        queryParams.set("from", windowFromStr);
        queryParams.set("to", windowToStr);

        const ordersUrl = `${proxyUrl}/api/orders?${queryParams.toString()}`;
        console.log(`🌐 [getOrders] 윈도우 ${windowIndex}: ${windowFromStr} ~ ${windowToStr}`);

        const response = await fetch(ordersUrl, { method: "GET", headers });
        const responseText = await response.text();

        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error(`❌ [getOrders] JSON 파싱 실패`);
          return { success: false, error: "API 응답 파싱 실패" };
        }

        if (!response.ok) {
          console.error(`❌ [getOrders] API 에러: ${response.status}`, data);
          return { success: false, error: data.message || `API 호출 실패 (${response.status})` };
        }

        const items = extractItems(data);
        console.log(`✅ [getOrders] 윈도우 ${windowIndex} 아이템 수: ${items.length}`);

        for (const it of items) {
          allOrders.push(mapItemToNaverOrder(it));
        }

        // 다음 24시간 윈도우
        cursor += MAX_WINDOW_MS;
        windowIndex++;
      }

      const perfMs = Date.now() - perfStart;
      console.log(`✅ [getOrders] 전체 주문 수: ${allOrders.length} (총 ${perfMs}ms)`);
      return { success: true, orders: allOrders, count: allOrders.length };
    } catch (error) {
      console.error(`❌ [getOrders] 요청 에러:`, error);
      return { success: false, error: "API 호출 중 오류가 발생했습니다" };
    }
  }

  // 직접 호출 (프록시 없이)
  const queryParams = new URLSearchParams();
  queryParams.set("lastChangedFrom", startDate);
  queryParams.set("lastChangedTo", endDate);

  const endpoint = `/external/v1/pay-order/seller/orders?${queryParams.toString()}`;
  console.log(`🌐 [getOrders] 직접 호출: GET ${endpoint}`);

  const result = await naverFetch<{ data: NaverOrder[] }>(endpoint, { method: "GET" });

  if (result.success) {
    const orders = result.data?.data || [];
    console.log(`✅ [getOrders] 성공! 주문 수: ${orders.length}`);
    return { success: true, orders: orders as NaverOrder[], count: orders.length };
  }

  console.log(`❌ [getOrders] 실패: ${result.error}`);
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

/**
 * 변경 주문 내역 조회
 * GET /external/v1/pay-order/seller/product-orders/last-changed-statuses
 */
export async function getLastChangedOrders(params: GetLastChangedOrdersParams): Promise<{
  success: boolean;
  orders?: NaverOrder[];
  error?: string;
}> {
  const queryParams = new URLSearchParams();
  queryParams.set("lastChangedFrom", params.lastChangedFrom);
  queryParams.set("lastChangedTo", params.lastChangedTo);

  if (params.lastChangedType) {
    queryParams.set("lastChangedType", params.lastChangedType);
  }

  console.log(`🔍 [getLastChangedOrders] 변경 주문 조회: ${params.lastChangedFrom} ~ ${params.lastChangedTo}`);

  const result = await naverFetch<{ data: { contents: any[] } }>(
    `/external/v1/pay-order/seller/product-orders/last-changed-statuses?${queryParams.toString()}`
  );

  if (!result.success) {
    console.error(`❌ [getLastChangedOrders] 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  // 응답 매핑
  const orders: NaverOrder[] = (result.data?.data?.contents || []).map((item: any) => ({
    productOrderId: item.productOrderId || "",
    orderId: item.orderId || "",
    orderDate: item.orderDate || "",
    paymentDate: item.paymentDate || "",
    orderStatus: item.orderStatus || "",
    productOrderStatus: item.productOrderStatus || "",
    productId: String(item.productId || ""),
    productName: item.productName || "",
    productOption: item.productOption || "",
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    totalProductAmount: Number(item.totalProductAmount || 0),
    deliveryFee: Number(item.deliveryFee || 0),
    totalPaymentAmount: Number(item.totalPaymentAmount || 0),
    ordererName: item.ordererName || "",
    ordererTel: item.ordererTel || "",
    receiverName: item.receiverName || "",
    receiverTel: item.receiverTel || "",
    receiverAddress: item.receiverAddress || "",
    deliveryMemo: item.deliveryMemo || "",
    trackingNumber: item.trackingNumber || "",
    deliveryCompanyCode: item.deliveryCompanyCode || "",
  }));

  console.log(`✅ [getLastChangedOrders] 성공: ${orders.length}건`);
  return { success: true, orders };
}

// ============================================================================
// 발주 확인
// ============================================================================

/**
 * 발주 확인
 * POST /external/v1/pay-order/seller/product-orders/{productOrderId}/place-order
 */
export async function placeOrder(params: PlaceOrderParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const { productOrderId } = params;

  console.log(`📝 발주 확인 요청: productOrderId=${productOrderId}`);

  const result = await naverFetch<any>(
    `/external/v1/pay-order/seller/product-orders/${productOrderId}/place-order`,
    { method: "POST" }
  );

  if (!result.success) {
    console.error(`❌ 발주 확인 실패: ${result.error}`);
    return { success: false, error: result.error };
  }

  console.log(`✅ 발주 확인 완료: productOrderId=${productOrderId}`);
  return { success: true };
}

/**
 * 일괄 발주 확인
 * POST /external/v1/pay-order/seller/product-orders/place-order
 */
export async function placeOrdersBulk(productOrderIds: string[]): Promise<{
  success: boolean;
  successCount: number;
  failCount: number;
  errors: { productOrderId: string; error: string }[];
}> {
  console.log(`📝 일괄 발주 확인 요청: ${productOrderIds.length}건`);

  const result = await naverFetch<{
    data: {
      successProductOrderIds: string[];
      failProductOrderInfos: { productOrderId: string; message: string }[];
    };
  }>(`/external/v1/pay-order/seller/product-orders/place-order`, {
    method: "POST",
    body: {
      productOrderIds,
    },
  });

  if (!result.success) {
    console.error(`❌ 일괄 발주 확인 실패: ${result.error}`);
    return {
      success: false,
      successCount: 0,
      failCount: productOrderIds.length,
      errors: productOrderIds.map((id) => ({ productOrderId: id, error: result.error || "발주 확인 실패" })),
    };
  }

  const successIds = result.data?.data?.successProductOrderIds || [];
  const failedItems = result.data?.data?.failProductOrderInfos || [];

  console.log(`✅ 일괄 발주 확인 완료: 성공 ${successIds.length}건, 실패 ${failedItems.length}건`);

  return {
    success: failedItems.length === 0,
    successCount: successIds.length,
    failCount: failedItems.length,
    errors: failedItems.map((f) => ({
      productOrderId: f.productOrderId,
      error: f.message || "발주 확인 실패",
    })),
  };
}

// ============================================================================
// 송장/발송 처리
// ============================================================================

/**
 * 네이버 발송처리 API
 * POST /v1/pay-order/seller/product-orders/{productOrderId}/dispatch
 *
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/dispatch-product-order
 */
export async function sendInvoiceToNaver(
  productOrderId: string,
  deliveryCompanyCode: string,
  trackingNo: string
): Promise<InvoiceSendResult> {
  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();
  const token = await getValidToken();

  if (!token) {
    return { success: false, error: "유효한 네이버 토큰이 없습니다. 연동을 다시 해주세요." };
  }

  // dispatchDate: 발송일시 (현재 시간, KST)
  const dispatchDate = toKSTString(new Date());

  const requestBody = {
    dispatchDate,
    deliveryMethod: "DELIVERY",
    deliveryCompanyCode,
    trackingNumber: trackingNo,
  };

  console.log(
    `📤 네이버 발송처리: productOrderId=${productOrderId}, 택배사=${deliveryCompanyCode}, 송장=${trackingNo}`
  );

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
        method: "POST",
        path: `/external/v1/pay-order/seller/product-orders/${productOrderId}/dispatch`,
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
        body: requestBody,
      };

      response = await fetch(`${proxyUrl}/api/proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify(proxyBody),
      });
    } else {
      // 직접 호출
      const apiUrl = `${NAVER_API_BASE}/external/v1/pay-order/seller/product-orders/${productOrderId}/dispatch`;

      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token.token_type} ${token.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });
    }

    const responseText = await response.text();
    console.log(`📥 네이버 발송처리 응답 (${response.status}):`, responseText.slice(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // 성공 시 빈 응답이 올 수 있음
      if (response.ok) {
        console.log("✅ 네이버 발송처리 성공:", productOrderId, trackingNo);
        return { success: true, message: "발송처리가 성공적으로 완료되었습니다" };
      }
      console.error("❌ 네이버 발송처리 응답 파싱 실패:", responseText);
      return { success: false, error: "API 응답 파싱 실패" };
    }

    if (!response.ok) {
      console.error("❌ 네이버 발송처리 실패:", response.status, responseData);
      return {
        success: false,
        error:
          responseData.message || responseData.error?.message || `발송처리 실패 (${response.status})`,
      };
    }

    console.log("✅ 네이버 발송처리 성공:", productOrderId, trackingNo);
    return { success: true, message: "발송처리가 성공적으로 완료되었습니다" };
  } catch (error) {
    console.error("❌ 네이버 발송처리 중 오류:", error);
    return { success: false, error: "발송처리 중 오류가 발생했습니다" };
  }
}

/**
 * 네이버 일괄 발송처리 API
 * POST /v1/pay-order/seller/product-orders/dispatch
 *
 * 여러 상품주문을 한 번에 발송처리
 */
export async function sendInvoicesToNaverBulk(
  items: {
    productOrderId: string;
    deliveryCompanyCode: string;
    trackingNumber: string;
  }[]
): Promise<{
  success: boolean;
  successCount: number;
  failCount: number;
  errors: { productOrderId: string; error: string }[];
}> {
  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();
  const token = await getValidToken();

  if (!token) {
    return {
      success: false,
      successCount: 0,
      failCount: items.length,
      errors: items.map((item) => ({
        productOrderId: item.productOrderId,
        error: "유효한 네이버 토큰이 없습니다",
      })),
    };
  }

  // dispatchDate: 발송일시 (현재 시간, KST)
  const dispatchDate = toKSTString(new Date());

  const requestBody = {
    dispatchProductOrders: items.map((item) => ({
      productOrderId: item.productOrderId,
      dispatchDate,
      deliveryMethod: "DELIVERY",
      deliveryCompanyCode: item.deliveryCompanyCode,
      trackingNumber: item.trackingNumber,
    })),
  };

  console.log(`📤 네이버 일괄 발송처리: ${items.length}건`);

  try {
    let response: Response;

    if (proxyUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `${token.token_type} ${token.access_token}`,
      };

      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }

      const proxyBody = {
        method: "POST",
        path: `/external/v1/pay-order/seller/product-orders/dispatch`,
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
        body: requestBody,
      };

      response = await fetch(`${proxyUrl}/api/proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify(proxyBody),
      });
    } else {
      const apiUrl = `${NAVER_API_BASE}/external/v1/pay-order/seller/product-orders/dispatch`;

      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token.token_type} ${token.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });
    }

    const responseText = await response.text();
    console.log(`📥 네이버 일괄 발송처리 응답 (${response.status}):`, responseText.slice(0, 1000));

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        return { success: true, successCount: items.length, failCount: 0, errors: [] };
      }
      return {
        success: false,
        successCount: 0,
        failCount: items.length,
        errors: items.map((item) => ({
          productOrderId: item.productOrderId,
          error: "API 응답 파싱 실패",
        })),
      };
    }

    if (!response.ok) {
      return {
        success: false,
        successCount: 0,
        failCount: items.length,
        errors: items.map((item) => ({
          productOrderId: item.productOrderId,
          error: responseData.message || `발송처리 실패 (${response.status})`,
        })),
      };
    }

    // 부분 성공 처리
    const successIds = responseData.data?.successProductOrderIds || [];
    const failedItems = responseData.data?.failProductOrderInfos || [];

    const errors = failedItems.map((f: any) => ({
      productOrderId: f.productOrderId,
      error: f.message || "발송처리 실패",
    }));

    return {
      success: failedItems.length === 0,
      successCount: successIds.length,
      failCount: failedItems.length,
      errors,
    };
  } catch (error) {
    console.error("❌ 네이버 일괄 발송처리 중 오류:", error);
    return {
      success: false,
      successCount: 0,
      failCount: items.length,
      errors: items.map((item) => ({
        productOrderId: item.productOrderId,
        error: "발송처리 중 오류 발생",
      })),
    };
  }
}
