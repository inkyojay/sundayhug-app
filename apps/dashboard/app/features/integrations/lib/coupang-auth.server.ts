/**
 * 쿠팡 로켓그로스 API - 인증 및 공통 유틸리티
 *
 * Railway 프록시를 통해 쿠팡 API 호출 (고정 IP 필요)
 * Rate Limit: 분당 50회
 */

import { createClient } from "@supabase/supabase-js";

// Railway 프록시 설정
const COUPANG_PROXY_URL = process.env.COUPANG_PROXY_URL || "https://sundayhug-app-production.up.railway.app";
const PROXY_API_KEY = process.env.PROXY_API_KEY || "sundayhug-proxy-2024";

// =====================================================
// 타입 정의
// =====================================================

export interface CoupangCredentials {
  id: string;
  vendor_id: string;
  vendor_name: string | null;
  access_key: string;
  secret_key: string;
  is_active: boolean;
  last_sync_at: string | null;
}

export interface CoupangApiResponse<T> {
  code: number | string;
  message: string;
  data: T;
  nextToken?: string;
}

// 주문 관련
export interface CoupangOrderItem {
  vendorItemId: number;
  productName: string;
  salesQuantity: number;
  unitSalesPrice: number;
  currency: string;
}

export interface CoupangOrder {
  vendorId: string;
  orderId: number;
  paidAt: string; // Unix timestamp string (밀리초)
  orderItems: CoupangOrderItem[];
}

// 재고 관련
export interface CoupangInventory {
  vendorId: string;
  vendorItemId: number;
  externalSkuId: number;
  inventoryDetails: {
    totalOrderableQuantity: number;
  };
  salesCountMap: {
    SALES_COUNT_LAST_THIRTY_DAYS: number;
  };
}

// 상품 관련
export interface CoupangProductItem {
  itemName: string;
  marketPlaceItem: {
    vendorInventoryItemId: number;
    vendorItemId: number;
  } | null;
  rocketGrowthItem: {
    vendorInventoryItemId: number;
    vendorItemId: number;
  } | null;
}

export interface CoupangProduct {
  sellerProductId: number;
  sellerProductName: string;
  displayCategoryCode: number;
  categoryId: number;
  productId: number | null;
  vendorId: string;
  saleStartedAt: string;
  saleEndedAt: string;
  brand: string;
  statusName: string;
  createdAt: string;
  registrationType: string;
  items: CoupangProductItem[];
}

// 상품 상세
export interface CoupangProductDetail {
  sellerProductId: number;
  sellerProductName: string;
  displayCategoryCode: number;
  vendorId: string;
  saleStartedAt: string;
  saleEndedAt: string;
  displayProductName: string;
  brand: string;
  generalProductName: string;
  manufacture: string;
  registrationType: string;
  items: Array<{
    offerCondition: string;
    itemName: string;
    maximumBuyForPerson: number;
    outboundShippingTimeDay: number;
    unitCount: number;
    adultOnly: string;
    taxType: string;
    parallelImported: string;
    overseasPurchased: string;
    pccNeeded: boolean;
    images: Array<{
      imageOrder: number;
      imageType: string;
      cdnPath: string;
    }>;
    searchTags: string[];
    rocketGrowthItemData: {
      sellerProductItemId: number;
      vendorItemId: number;
      itemId: number;
      externalVendorSku: string;
      modelNo: string;
      barcode: string;
      skuInfo: {
        fragile: boolean;
        height: number;
        length: number;
        width: number;
        weight: number;
        quantityPerBox: number;
        distributionPeriod: number;
        expiredAtManaged: boolean;
        netWeight: number;
      };
      priceData: {
        originalPrice: number;
        salePrice: number;
      };
    } | null;
    marketplaceItemData: {
      sellerProductItemId: number;
      vendorItemId: number;
      itemId: number;
      externalVendorSku: string;
      modelNo: string;
      barcode: string;
      priceData: {
        originalPrice: number;
        salePrice: number;
      };
    } | null;
  }>;
  rocketGrowthAdditionalInformation?: {
    rfmInboundName: string;
  };
}

// =====================================================
// Rate Limiter (분당 50회 제한)
// =====================================================

class RateLimiter {
  private requests: number[] = [];
  private maxRequests = 50;
  private windowMs = 60000; // 1분

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // 1분이 지난 요청 제거
    this.requests = this.requests.filter((t) => now - t < this.windowMs);

    // 제한 초과 시 대기
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100;
      console.log(`[Coupang] Rate limit reached, waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      // 재귀 호출로 다시 확인
      return this.waitIfNeeded();
    }

    this.requests.push(now);
  }

  getRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);
    return this.maxRequests - this.requests.length;
  }
}

const rateLimiter = new RateLimiter();

// =====================================================
// 공통 API 호출 함수 (Railway 프록시 경유)
// =====================================================

/**
 * Railway 프록시를 통해 쿠팡 API 호출
 *
 * 프록시가 HMAC 서명을 생성하고, 고정 IP로 요청을 전달함
 */
export async function coupangFetch<T>(
  method: string,
  path: string,
  credentials: CoupangCredentials,
  body?: any
): Promise<CoupangApiResponse<T>> {
  // Rate limit 확인
  await rateLimiter.waitIfNeeded();

  console.log(`[Coupang] ${method} ${path} (via proxy)`);

  // Railway 프록시로 요청
  const proxyResponse = await fetch(`${COUPANG_PROXY_URL}/api/coupang/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-api-key": PROXY_API_KEY,
    },
    body: JSON.stringify({
      method,
      path,
      accessKey: credentials.access_key,
      secretKey: credentials.secret_key,
      body: body || undefined,
    }),
  });

  if (!proxyResponse.ok) {
    const errorText = await proxyResponse.text();
    console.error(`[Coupang] Proxy Error: ${proxyResponse.status} - ${errorText}`);
    throw new Error(`Coupang Proxy Error: ${proxyResponse.status} - ${errorText}`);
  }

  const data = await proxyResponse.json();

  // 쿠팡 API 에러 코드 확인
  if (data.code && data.code !== 200 && data.code !== "SUCCESS") {
    throw new Error(`Coupang API Error: ${data.code} - ${data.message}`);
  }

  return data;
}

// =====================================================
// 인증 정보 조회
// =====================================================

export async function getCoupangCredentials(): Promise<CoupangCredentials | null> {
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("coupang_credentials")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.log("[Coupang] No active credentials found");
    return null;
  }

  return data as CoupangCredentials;
}

export async function getCoupangCredentialsByVendorId(
  vendorId: string
): Promise<CoupangCredentials | null> {
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("coupang_credentials")
    .select("*")
    .eq("vendor_id", vendorId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CoupangCredentials;
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * 날짜를 yyyyMMdd 형식으로 변환
 */
export function formatDateForCoupang(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Unix timestamp (밀리초 문자열)를 Date로 변환
 */
export function parseUnixTimestamp(timestamp: string): Date {
  return new Date(parseInt(timestamp, 10));
}

/**
 * Rate limiter 남은 횟수 조회
 */
export function getRateLimitRemaining(): number {
  return rateLimiter.getRemaining();
}
