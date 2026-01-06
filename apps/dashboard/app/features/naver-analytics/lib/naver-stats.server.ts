/**
 * 네이버 커머스 API - 통계 데이터 클라이언트
 *
 * API데이터솔루션(통계) 23개 API를 지원합니다.
 * - 고객 데이터 (3개)
 * - 마케팅 분석 (10개)
 * - 쇼핑행동 분석 (2개)
 * - 실시간 분석 (1개)
 * - 판매 분석 (7개)
 *
 * 주의: 통계 API는 별도의 애플리케이션 credentials를 사용합니다.
 * - NAVER_STATS_CLIENT_ID
 * - NAVER_STATS_CLIENT_SECRET
 *
 * 참고: https://apicenter.commerce.naver.com/docs/commerce-api/current/고객-데이터
 */

import * as crypto from "crypto";

// ============================================================================
// Constants
// ============================================================================

const NAVER_API_BASE = "https://api.commerce.naver.com";

function getProxyUrl(): string | null {
  return process.env.NAVER_PROXY_URL || null;
}

function getProxyApiKey(): string | null {
  return process.env.NAVER_PROXY_API_KEY || null;
}

function getStatsClientId(): string | null {
  return process.env.NAVER_STATS_CLIENT_ID || null;
}

function getStatsClientSecret(): string | null {
  return process.env.NAVER_STATS_CLIENT_SECRET || null;
}

// ============================================================================
// 통계 API 전용 토큰 관리 (별도 애플리케이션)
// ============================================================================

interface StatsToken {
  accessToken: string;
  tokenType: string;
  expiresAt: Date;
}

// 메모리 캐시 (서버 재시작 시 초기화됨)
let cachedStatsToken: StatsToken | null = null;

/**
 * 통계 API용 토큰 발급
 * 별도의 NAVER_STATS_CLIENT_ID, NAVER_STATS_CLIENT_SECRET 사용
 */
async function refreshStatsToken(): Promise<StatsToken | null> {
  const clientId = getStatsClientId();
  const clientSecret = getStatsClientSecret();
  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();

  if (!clientId || !clientSecret) {
    console.error("❌ [Stats] 통계 API credentials가 설정되지 않음 (NAVER_STATS_CLIENT_ID, NAVER_STATS_CLIENT_SECRET)");
    return null;
  }

  try {
    let tokenData: any;

    if (proxyUrl) {
      // 프록시 서버를 통해 토큰 발급
      console.log("🔄 [Stats] 프록시 서버를 통해 통계 API 토큰 발급 시도...");

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
          account_id: "stats",  // 통계 API 전용 식별자
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ [Stats] 프록시 토큰 발급 실패:", response.status, errorData);
        return null;
      }

      tokenData = await response.json();
    } else {
      // 직접 토큰 발급 (로컬 개발 또는 고정 IP 환경)
      console.log("🔄 [Stats] 직접 통계 API 토큰 발급 시도...");

      const tokenUrl = `${NAVER_API_BASE}/external/v1/oauth2/token`;
      const timestamp = Date.now();

      // HMAC-SHA256 서명 생성
      const signatureBase = `${clientId}_${timestamp}`;
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
        console.error("❌ [Stats] 토큰 발급 실패:", response.status, errorData);
        return null;
      }

      tokenData = await response.json();
    }

    console.log("✅ [Stats] 통계 API 토큰 발급 성공");

    // 토큰 캐시 저장
    const expiresIn = tokenData.expires_in || 3600;
    cachedStatsToken = {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || "Bearer",
      expiresAt: new Date(Date.now() + expiresIn * 1000 - 5 * 60 * 1000), // 5분 여유
    };

    return cachedStatsToken;
  } catch (error) {
    console.error("❌ [Stats] 토큰 발급 중 오류:", error);
    return null;
  }
}

/**
 * 유효한 통계 API 토큰 가져오기 (자동 갱신)
 */
async function getValidStatsToken(): Promise<StatsToken | null> {
  // 캐시된 토큰이 유효한지 확인
  if (cachedStatsToken && cachedStatsToken.expiresAt > new Date()) {
    return cachedStatsToken;
  }

  // 토큰이 없거나 만료됨
  console.log("🔄 [Stats] 통계 API 토큰 없거나 만료됨, 새로 발급...");
  return refreshStatsToken();
}

// ============================================================================
// Types - API 응답 타입 (실제 호출 후 업데이트 예정)
// ============================================================================

/** 공통 API 응답 래퍼 */
export interface NaverStatsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: any; // 디버깅용 원본 응답
}

/** 고객 현황 데이터 */
export interface CustomerStatusData {
  date: string;
  newCustomers?: number;
  returningCustomers?: number;
  totalCustomers?: number;
  // 실제 응답에 따라 필드 추가 예정
  [key: string]: any;
}

/** 재구매 통계 데이터 */
export interface RepurchaseData {
  weekStartDate?: string;
  repurchaseRate?: number;
  repurchaseCount?: number;
  // 실제 응답에 따라 필드 추가 예정
  [key: string]: any;
}

/** 마케팅 채널 데이터 */
export interface MarketingChannelData {
  channelName?: string;
  visits?: number;
  paymentAmount?: number;
  conversionRate?: number;
  // 실제 응답에 따라 필드 추가 예정
  [key: string]: any;
}

/** 쇼핑 행동 데이터 */
export interface ShoppingBehaviorData {
  pageName?: string;
  productName?: string;
  pageViews?: number;
  uniqueVisitors?: number;
  bounceRate?: number;
  // 실제 응답에 따라 필드 추가 예정
  [key: string]: any;
}

/** 실시간 데이터 */
export interface RealtimeData {
  hour?: number;
  paymentAmount?: number;
  orderCount?: number;
  visitors?: number;
  // 실제 응답에 따라 필드 추가 예정
  [key: string]: any;
}

/** 판매 데이터 */
export interface SalesData {
  productName?: string;
  categoryName?: string;
  paymentAmount?: number;
  quantity?: number;
  // 실제 응답에 따라 필드 추가 예정
  [key: string]: any;
}

/** 채널 정보 */
export interface ChannelInfo {
  channelNo: string;
  channelName?: string;
  channelType?: string;
  [key: string]: any;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * 네이버 통계 API 호출
 * 별도의 통계 API credentials 사용 (NAVER_STATS_CLIENT_ID, NAVER_STATS_CLIENT_SECRET)
 */
async function naverStatsFetch<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    params?: Record<string, string>;
    body?: Record<string, any>;
  } = {}
): Promise<NaverStatsResponse<T>> {
  const { method = "GET", params, body } = options;
  const proxyUrl = getProxyUrl();
  const proxyApiKey = getProxyApiKey();

  // 통계 API 전용 토큰 사용
  const token = await getValidStatsToken();
  if (!token) {
    return { success: false, error: "유효한 통계 API 토큰이 없습니다. NAVER_STATS_CLIENT_ID, NAVER_STATS_CLIENT_SECRET를 확인해주세요." };
  }

  // 쿼리 파라미터 구성
  let fullEndpoint = endpoint;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    fullEndpoint = `${endpoint}?${queryString}`;
  }

  console.log(`📊 [Stats] API 호출: ${method} ${fullEndpoint}`);

  try {
    let response: Response;

    if (proxyUrl) {
      // 프록시 서버를 통한 호출
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `${token.tokenType} ${token.accessToken}`,
      };

      if (proxyApiKey) {
        headers["X-Proxy-Api-Key"] = proxyApiKey;
      }

      const proxyBody = {
        method,
        path: fullEndpoint,
        headers: {
          "Authorization": `${token.tokenType} ${token.accessToken}`,
        },
        body,
      };

      response = await fetch(`${proxyUrl}/api/proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify(proxyBody),
      });
    } else {
      // 직접 호출
      const apiUrl = `${NAVER_API_BASE}${fullEndpoint}`;

      response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token.tokenType} ${token.accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    const responseText = await response.text();
    console.log(`📊 [Stats] 응답 (${response.status}): ${responseText.slice(0, 500)}`);

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("❌ [Stats] JSON 파싱 실패:", responseText);
      return { success: false, error: "API 응답 파싱 실패" };
    }

    if (!response.ok) {
      console.error("❌ [Stats] API 에러:", response.status, responseData);
      return {
        success: false,
        error: responseData.message || `API 호출 실패 (${response.status})`,
        raw: responseData,
      };
    }

    return { success: true, data: responseData as T, raw: responseData };
  } catch (error) {
    console.error("❌ [Stats] API 호출 중 오류:", error);
    return { success: false, error: "API 호출 중 오류가 발생했습니다" };
  }
}

// ============================================================================
// 0. 채널 정보 API
// ============================================================================

/**
 * 채널 목록 조회 API
 * GET /v1/channels (추정)
 * GET /v1/shopping-info/account/channels (대안)
 * GET /v1/seller/account (계정 정보에서 채널 추출)
 */
export async function getChannelList(): Promise<NaverStatsResponse<ChannelInfo[]>> {
  // 방법 1: 직접 채널 목록 조회 시도
  console.log("🔍 [Stats] 채널 목록 조회 시도...");

  // shopping-info API로 채널 정보 조회 시도
  const result = await naverStatsFetch<any>("/external/v1/shopping-info/account/channels");

  if (result.success) {
    console.log("✅ [Stats] 채널 목록 조회 성공");
    return result;
  }

  // 대안: seller 계정 정보에서 채널 추출 시도
  const sellerResult = await naverStatsFetch<any>("/external/v1/seller/account");

  if (sellerResult.success) {
    console.log("✅ [Stats] 판매자 계정에서 채널 정보 추출");
    return sellerResult;
  }

  // 채널 정보 API 직접 호출
  const channelsResult = await naverStatsFetch<any>("/external/v1/channels");

  return channelsResult;
}

/**
 * 채널 유형별 API 테스트
 * 다양한 channelNo 형식으로 테스트하여 작동하는 것을 찾음
 */
export async function testChannelFormats(): Promise<{
  formats: { format: string; result: any }[];
}> {
  const testFormats = [
    "1",
    "smartstore",
    "SMARTSTORE",
    "BRAND",
    "brand",
    "ncp_1okmyk_01",  // 사용자 제공 형식
  ];

  const results: { format: string; result: any }[] = [];

  for (const format of testFormats) {
    console.log(`🧪 [Stats] channelNo="${format}" 테스트 중...`);
    const result = await getRealtimeDaily(format);
    results.push({ format, result });

    if (result.success) {
      console.log(`✅ [Stats] channelNo="${format}" 작동!`);
      break;
    }
  }

  return { formats: results };
}

// ============================================================================
// 1. 고객 데이터 API (3개)
// ============================================================================

/**
 * 1.1 고객 현황(계정) API
 * GET /v1/customer-data/customer-status/account/statistics
 */
export async function getCustomerStatusAccount(
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<CustomerStatusData[]>> {
  return naverStatsFetch<CustomerStatusData[]>(
    "/external/v1/customer-data/customer-status/account/statistics",
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 1.2 고객 현황(채널) API
 * GET /v1/customer-data/customer-status/channels/:channelNo/statistics
 */
export async function getCustomerStatusChannel(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<CustomerStatusData[]>> {
  return naverStatsFetch<CustomerStatusData[]>(
    `/external/v1/customer-data/customer-status/channels/${channelNo}/statistics`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 1.3 재구매 통계 API
 * GET /v1/customer-data/repurchase/account/statistics
 * 주의: startDate는 반드시 월요일이어야 함
 */
export async function getRepurchaseStats(
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<RepurchaseData[]>> {
  return naverStatsFetch<RepurchaseData[]>(
    "/external/v1/customer-data/repurchase/account/statistics",
    {
      params: { startDate, endDate },
    }
  );
}

// ============================================================================
// 2. 마케팅 분석 API (10개)
// ============================================================================

/**
 * 2.1 전체 채널 일별 API
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/all/daily
 */
export async function getMarketingAllDaily(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/all/daily`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.2 전체 채널 API (상세)
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/all/detail
 */
export async function getMarketingAllDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/all/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.3 사용자 정의 채널 상세 API
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/custom/detail
 */
export async function getMarketingCustomDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/custom/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.4 사용자 정의 채널 API (간략)
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/custom/simple
 */
export async function getMarketingCustomSimple(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/custom/simple`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.5 시간대별 채널 API
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/hourly/detail
 */
export async function getMarketingHourlyDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/hourly/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.6 시간대별 API (간략)
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/hourly/simple
 */
export async function getMarketingHourlySimple(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/hourly/simple`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.7 검색 채널 API
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/search/detail
 */
export async function getMarketingSearchDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/search/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.8 검색 채널 키워드별 API
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/search/keyword
 */
export async function getMarketingSearchKeyword(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/search/keyword`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.9 웹사이트 채널 일별 API
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/website/daily
 */
export async function getMarketingWebsiteDaily(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/website/daily`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 2.10 웹사이트 채널 API (상세)
 * GET /v1/bizdata-stats/channels/:channelNo/marketing/website/detail
 */
export async function getMarketingWebsiteDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<MarketingChannelData[]>> {
  return naverStatsFetch<MarketingChannelData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/marketing/website/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

// ============================================================================
// 3. 쇼핑행동 분석 API (2개)
// ============================================================================

/**
 * 3.1 페이지별 API
 * GET /v1/bizdata-stats/channels/:channelNo/shopping/page/detail
 */
export async function getShoppingPageDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<ShoppingBehaviorData[]>> {
  return naverStatsFetch<ShoppingBehaviorData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/shopping/page/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 3.2 상품별 API
 * GET /v1/bizdata-stats/channels/:channelNo/shopping/product/detail
 */
export async function getShoppingProductDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<ShoppingBehaviorData[]>> {
  return naverStatsFetch<ShoppingBehaviorData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/shopping/product/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

// ============================================================================
// 4. 실시간 분석 API (1개)
// ============================================================================

/**
 * 4.1 오늘 보고서 API
 * GET /v1/bizdata-stats/channels/:channelNo/realtime/daily
 */
export async function getRealtimeDaily(
  channelNo: string
): Promise<NaverStatsResponse<RealtimeData[]>> {
  return naverStatsFetch<RealtimeData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/realtime/daily`
  );
}

// ============================================================================
// 5. 판매 분석 API (7개)
// ============================================================================

/**
 * 5.1 배송 통계 API
 * GET /v1/bizdata-stats/channels/:channelNo/sales/delivery/detail
 */
export async function getSalesDeliveryDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/delivery/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 5.2 판매 성과 API (시간대별)
 * GET /v1/bizdata-stats/channels/:channelNo/sales/hourly/detail
 */
export async function getSalesHourlyDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/hourly/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 5.3 상품/마케팅 채널 카테고리(소)별 API
 * GET /v1/bizdata-stats/channels/:channelNo/sales/product-marketing/category
 */
export async function getSalesProductMarketingCategory(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/product-marketing/category`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 5.4 상품/마케팅 채널 API
 * GET /v1/bizdata-stats/channels/:channelNo/sales/product-marketing/detail
 */
export async function getSalesProductMarketingDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/product-marketing/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 5.5 상품/검색 채널 API
 * GET /v1/bizdata-stats/channels/:channelNo/sales/product-search/detail
 */
export async function getSalesProductSearchDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/product-search/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 5.6 상품/검색 채널 상품별 키워드 API
 * GET /v1/bizdata-stats/channels/:channelNo/sales/product-search/keyword-by-product
 */
export async function getSalesProductSearchKeyword(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/product-search/keyword-by-product`,
    {
      params: { startDate, endDate },
    }
  );
}

/**
 * 5.7 상품 성과 API
 * GET /v1/bizdata-stats/channels/:channelNo/sales/product/detail
 */
export async function getSalesProductDetail(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<NaverStatsResponse<SalesData[]>> {
  return naverStatsFetch<SalesData[]>(
    `/external/v1/bizdata-stats/channels/${channelNo}/sales/product/detail`,
    {
      params: { startDate, endDate },
    }
  );
}

// ============================================================================
// 탐색용 유틸리티 함수
// ============================================================================

/**
 * 모든 API 엔드포인트 탐색 (응답 스키마 파악용)
 * Phase 0에서 사용
 */
export async function exploreAllApis(
  channelNo: string,
  startDate: string,
  endDate: string
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  console.log("🔍 [Stats] API 탐색 시작...");

  // 1. 고객 데이터 (계정 레벨은 channelNo 불필요)
  results["customerStatusAccount"] = await getCustomerStatusAccount(startDate, endDate);
  results["customerStatusChannel"] = await getCustomerStatusChannel(channelNo, startDate, endDate);
  results["repurchaseStats"] = await getRepurchaseStats(startDate, endDate);

  // 2. 마케팅 분석
  results["marketingAllDaily"] = await getMarketingAllDaily(channelNo, startDate, endDate);
  results["marketingAllDetail"] = await getMarketingAllDetail(channelNo, startDate, endDate);
  results["marketingSearchKeyword"] = await getMarketingSearchKeyword(channelNo, startDate, endDate);
  results["marketingHourlySimple"] = await getMarketingHourlySimple(channelNo, startDate, endDate);

  // 3. 쇼핑행동 분석
  results["shoppingPageDetail"] = await getShoppingPageDetail(channelNo, startDate, endDate);
  results["shoppingProductDetail"] = await getShoppingProductDetail(channelNo, startDate, endDate);

  // 4. 실시간 분석
  results["realtimeDaily"] = await getRealtimeDaily(channelNo);

  // 5. 판매 분석
  results["salesProductDetail"] = await getSalesProductDetail(channelNo, startDate, endDate);
  results["salesHourlyDetail"] = await getSalesHourlyDetail(channelNo, startDate, endDate);
  results["salesDeliveryDetail"] = await getSalesDeliveryDetail(channelNo, startDate, endDate);

  console.log("✅ [Stats] API 탐색 완료");

  return results;
}
