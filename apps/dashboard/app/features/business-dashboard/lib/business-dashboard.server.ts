/**
 * 비즈니스 대시보드 서버 로직
 *
 * - 일별/주별/월별 매출 통계 조회
 * - 채널별(Cafe24, Naver, Coupang) 매출 비교
 * - 주문 건수, 평균 객단가, 전환율 계산
 * - 전월 대비 성장률 계산
 * - 매출 예측 (간단한 이동평균 기반)
 */

import { createAdminClient } from "~/core/lib/supa-admin.server";
import { getCancelledStatusFilter } from "~/core/lib/constants";

// ============================================================================
// Types
// ============================================================================

export type PeriodType = "today" | "week" | "month" | "quarter";

export interface KpiData {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  growthRate: number;
  prevPeriodSales: number;
  prevPeriodOrders: number;
  prevPeriodAvgOrderValue: number;
}

export interface DailySalesData {
  date: string;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface ChannelSalesData {
  channel: string;
  channelLabel: string;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  percentage: number;
}

export interface TopProductData {
  rank: number;
  productName: string;
  sku: string;
  quantity: number;
  totalSales: number;
  orderCount: number;
}

export interface SalesForecastData {
  date: string;
  actual?: number;
  forecast?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** 채널 코드를 한글 라벨로 변환 */
function getChannelLabel(shopCd: string): string {
  const channelMap: Record<string, string> = {
    cafe24: "Cafe24",
    naver: "네이버",
    coupang: "쿠팡",
  };
  return channelMap[shopCd] || shopCd;
}

/** 기간에 따른 날짜 범위 계산 */
export function getDateRange(period: PeriodType): {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setHours(0, 0, 0, 0);
      break;

    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 6);
      prevStartDate.setHours(0, 0, 0, 0);
      break;

    case "month":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 29);
      prevStartDate.setHours(0, 0, 0, 0);
      break;

    case "quarter":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 89);
      prevStartDate.setHours(0, 0, 0, 0);
      break;

    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 29);
      prevStartDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * KPI 데이터 조회 (총매출, 주문수, 객단가, 성장률)
 */
export async function getKpiData(period: PeriodType): Promise<KpiData> {
  const adminClient = createAdminClient();
  const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period);

  // 현재 기간 데이터
  const { data: currentData } = await adminClient
    .from("orders")
    .select("pay_amt")
    .gte("ord_time", startDate.toISOString())
    .lte("ord_time", endDate.toISOString())
    .not("ord_status", "in", getCancelledStatusFilter());

  // 이전 기간 데이터
  const { data: prevData } = await adminClient
    .from("orders")
    .select("pay_amt")
    .gte("ord_time", prevStartDate.toISOString())
    .lte("ord_time", prevEndDate.toISOString())
    .not("ord_status", "in", getCancelledStatusFilter());

  // 현재 기간 계산
  const totalSales = currentData?.reduce((sum, order) => sum + (Number(order.pay_amt) || 0), 0) || 0;
  const orderCount = currentData?.length || 0;
  const avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

  // 이전 기간 계산
  const prevPeriodSales = prevData?.reduce((sum, order) => sum + (Number(order.pay_amt) || 0), 0) || 0;
  const prevPeriodOrders = prevData?.length || 0;
  const prevPeriodAvgOrderValue = prevPeriodOrders > 0 ? Math.round(prevPeriodSales / prevPeriodOrders) : 0;

  // 성장률 계산
  const growthRate = prevPeriodSales > 0
    ? ((totalSales - prevPeriodSales) / prevPeriodSales) * 100
    : totalSales > 0 ? 100 : 0;

  return {
    totalSales,
    orderCount,
    avgOrderValue,
    growthRate: Math.round(growthRate * 10) / 10,
    prevPeriodSales,
    prevPeriodOrders,
    prevPeriodAvgOrderValue,
  };
}

/**
 * 일별 매출 추이 조회
 */
export async function getDailySalesData(period: PeriodType): Promise<DailySalesData[]> {
  const adminClient = createAdminClient();
  const { startDate, endDate } = getDateRange(period);

  const { data } = await adminClient
    .from("orders")
    .select("ord_time, pay_amt")
    .gte("ord_time", startDate.toISOString())
    .lte("ord_time", endDate.toISOString())
    .not("ord_status", "in", getCancelledStatusFilter());

  if (!data || data.length === 0) {
    return [];
  }

  // 일별로 그룹화
  const dailyMap = new Map<string, { totalSales: number; orderCount: number }>();

  data.forEach((order) => {
    if (order.ord_time) {
      const date = order.ord_time.split("T")[0];
      const existing = dailyMap.get(date) || { totalSales: 0, orderCount: 0 };
      dailyMap.set(date, {
        totalSales: existing.totalSales + (Number(order.pay_amt) || 0),
        orderCount: existing.orderCount + 1,
      });
    }
  });

  // 배열로 변환 및 정렬
  const result: DailySalesData[] = [];
  dailyMap.forEach((value, date) => {
    result.push({
      date,
      totalSales: value.totalSales,
      orderCount: value.orderCount,
      avgOrderValue: value.orderCount > 0 ? Math.round(value.totalSales / value.orderCount) : 0,
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 채널별 매출 비교 조회
 */
export async function getChannelSalesData(period: PeriodType): Promise<ChannelSalesData[]> {
  const adminClient = createAdminClient();
  const { startDate, endDate } = getDateRange(period);

  const { data } = await adminClient
    .from("orders")
    .select("shop_cd, pay_amt")
    .gte("ord_time", startDate.toISOString())
    .lte("ord_time", endDate.toISOString())
    .not("ord_status", "in", getCancelledStatusFilter());

  if (!data || data.length === 0) {
    return [];
  }

  // 채널별로 그룹화
  const channelMap = new Map<string, { totalSales: number; orderCount: number }>();

  data.forEach((order) => {
    const channel = order.shop_cd || "기타";
    const existing = channelMap.get(channel) || { totalSales: 0, orderCount: 0 };
    channelMap.set(channel, {
      totalSales: existing.totalSales + (Number(order.pay_amt) || 0),
      orderCount: existing.orderCount + 1,
    });
  });

  // 총 매출 계산
  let grandTotal = 0;
  channelMap.forEach((value) => {
    grandTotal += value.totalSales;
  });

  // 배열로 변환
  const result: ChannelSalesData[] = [];
  channelMap.forEach((value, channel) => {
    result.push({
      channel,
      channelLabel: getChannelLabel(channel),
      totalSales: value.totalSales,
      orderCount: value.orderCount,
      avgOrderValue: value.orderCount > 0 ? Math.round(value.totalSales / value.orderCount) : 0,
      percentage: grandTotal > 0 ? Math.round((value.totalSales / grandTotal) * 1000) / 10 : 0,
    });
  });

  // 매출 순으로 정렬
  return result.sort((a, b) => b.totalSales - a.totalSales);
}

/**
 * 베스트셀러 TOP 10 조회
 */
export async function getTopProductsData(period: PeriodType): Promise<TopProductData[]> {
  const adminClient = createAdminClient();
  const { startDate, endDate } = getDateRange(period);

  const { data } = await adminClient
    .from("orders")
    .select("shop_sale_name, shop_sku_cd, sale_cnt, pay_amt")
    .gte("ord_time", startDate.toISOString())
    .lte("ord_time", endDate.toISOString())
    .not("ord_status", "in", getCancelledStatusFilter());

  if (!data || data.length === 0) {
    return [];
  }

  // 상품별로 그룹화
  const productMap = new Map<string, {
    productName: string;
    sku: string;
    quantity: number;
    totalSales: number;
    orderCount: number;
  }>();

  data.forEach((order) => {
    const productName = order.shop_sale_name || "알 수 없음";
    const sku = order.shop_sku_cd || "";
    const key = `${productName}_${sku}`;

    const existing = productMap.get(key) || {
      productName,
      sku,
      quantity: 0,
      totalSales: 0,
      orderCount: 0,
    };

    productMap.set(key, {
      productName,
      sku,
      quantity: existing.quantity + (order.sale_cnt || 1),
      totalSales: existing.totalSales + (Number(order.pay_amt) || 0),
      orderCount: existing.orderCount + 1,
    });
  });

  // 배열로 변환 및 정렬
  const result: TopProductData[] = [];
  productMap.forEach((value) => {
    result.push({
      rank: 0,
      productName: value.productName,
      sku: value.sku,
      quantity: value.quantity,
      totalSales: value.totalSales,
      orderCount: value.orderCount,
    });
  });

  // 매출 순으로 정렬 및 TOP 10
  const sorted = result
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10);

  // 순위 부여
  sorted.forEach((item, index) => {
    item.rank = index + 1;
  });

  return sorted;
}

/**
 * 매출 예측 (이동평균 기반)
 */
export async function getSalesForecastData(): Promise<SalesForecastData[]> {
  const adminClient = createAdminClient();

  // 최근 60일 데이터 조회
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);

  const { data } = await adminClient
    .from("orders")
    .select("ord_time, pay_amt")
    .gte("ord_time", startDate.toISOString())
    .not("ord_status", "in", getCancelledStatusFilter());

  if (!data || data.length === 0) {
    return [];
  }

  // 일별로 그룹화
  const dailyMap = new Map<string, number>();
  data.forEach((order) => {
    if (order.ord_time) {
      const date = order.ord_time.split("T")[0];
      const existing = dailyMap.get(date) || 0;
      dailyMap.set(date, existing + (Number(order.pay_amt) || 0));
    }
  });

  // 최근 30일 데이터 배열로 변환
  const result: SalesForecastData[] = [];
  const sortedDates = Array.from(dailyMap.keys()).sort();
  const recentDates = sortedDates.slice(-30);

  recentDates.forEach((date) => {
    result.push({
      date,
      actual: dailyMap.get(date),
    });
  });

  // 7일 이동평균으로 향후 7일 예측
  const salesValues = recentDates.map(d => dailyMap.get(d) || 0);
  const movingAvg = salesValues.slice(-7).reduce((a, b) => a + b, 0) / 7;

  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + i);
    result.push({
      date: forecastDate.toISOString().split("T")[0],
      forecast: Math.round(movingAvg),
    });
  }

  return result;
}

/**
 * 모든 대시보드 데이터 조회
 */
export async function getBusinessDashboardData(period: PeriodType) {
  const [kpi, dailySales, channelSales, topProducts, forecast] = await Promise.all([
    getKpiData(period),
    getDailySalesData(period),
    getChannelSalesData(period),
    getTopProductsData(period),
    getSalesForecastData(),
  ]);

  return {
    kpi,
    dailySales,
    channelSales,
    topProducts,
    forecast,
    period,
  };
}
