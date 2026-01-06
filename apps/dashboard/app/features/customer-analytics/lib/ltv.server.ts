/**
 * LTV (고객 생애 가치) 분석 서버 로직
 *
 * - 고객별 LTV 계산
 * - LTV 분포 분석
 * - LTV 요약 통계
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LTVData, LTVSummary, LTVDistribution } from "../types";

// ===== LTV 분석 함수 =====

/**
 * 고객 LTV 데이터를 계산합니다.
 */
export async function calculateLTV(
  adminClient: SupabaseClient
): Promise<{ data: LTVData[]; summary: LTVSummary; distribution: LTVDistribution[] }> {
  // 고객별 총 구매 금액 조회
  const { data: customers, error } = await adminClient
    .from('customers')
    .select('id, name, phone, total_orders, total_amount, first_order_date, last_order_date')
    .gt('total_amount', 0)
    .order('total_amount', { ascending: false });

  if (error || !customers || customers.length === 0) {
    return {
      data: [],
      summary: { avgLTV: 0, top10PercentLTV: 0, bottom50PercentLTV: 0, medianLTV: 0, totalLTV: 0 },
      distribution: [],
    };
  }

  // LTV 데이터 생성
  const ltvData: LTVData[] = customers.map((c) => {
    const firstPurchase = c.first_order_date;
    const lastPurchase = c.last_order_date;

    let customerLifetimeDays = 0;
    if (firstPurchase && lastPurchase) {
      customerLifetimeDays = Math.max(1, Math.floor(
        (new Date(lastPurchase).getTime() - new Date(firstPurchase).getTime()) / (1000 * 60 * 60 * 24)
      ));
    }

    return {
      customerId: c.id,
      customerName: c.name || '',
      customerPhone: c.phone || '',
      ltv: Number(c.total_amount) || 0,
      orderCount: Number(c.total_orders) || 0,
      avgOrderValue: c.total_orders > 0 ? Math.round((c.total_amount || 0) / c.total_orders) : 0,
      firstPurchase,
      lastPurchase,
      customerLifetimeDays,
    };
  });

  // 요약 통계
  const ltvValues = ltvData.map((d) => d.ltv).sort((a, b) => a - b);
  const totalLTV = ltvValues.reduce((sum, v) => sum + v, 0);
  const avgLTV = Math.round(totalLTV / ltvValues.length);

  const top10Index = Math.floor(ltvValues.length * 0.9);
  const bottom50Index = Math.floor(ltvValues.length * 0.5);
  const medianIndex = Math.floor(ltvValues.length / 2);

  const top10PercentLTV = Math.round(
    ltvValues.slice(top10Index).reduce((sum, v) => sum + v, 0) /
    Math.max(1, ltvValues.length - top10Index)
  );
  const bottom50PercentLTV = Math.round(
    ltvValues.slice(0, bottom50Index).reduce((sum, v) => sum + v, 0) /
    Math.max(1, bottom50Index)
  );
  const medianLTV = ltvValues[medianIndex] || 0;

  // 분포 계산
  const distribution = calculateLTVDistribution(ltvValues);

  return {
    data: ltvData,
    summary: {
      avgLTV,
      top10PercentLTV,
      bottom50PercentLTV,
      medianLTV,
      totalLTV,
    },
    distribution,
  };
}

/**
 * LTV 분포를 구간별로 계산합니다.
 */
function calculateLTVDistribution(ltvValues: number[]): LTVDistribution[] {
  const ranges: LTVDistribution[] = [
    { range: '0-5만', count: 0, minValue: 0, maxValue: 50000 },
    { range: '5-10만', count: 0, minValue: 50000, maxValue: 100000 },
    { range: '10-30만', count: 0, minValue: 100000, maxValue: 300000 },
    { range: '30-50만', count: 0, minValue: 300000, maxValue: 500000 },
    { range: '50-100만', count: 0, minValue: 500000, maxValue: 1000000 },
    { range: '100만+', count: 0, minValue: 1000000, maxValue: Infinity },
  ];

  ltvValues.forEach((ltv) => {
    for (const range of ranges) {
      if (ltv >= range.minValue && ltv < range.maxValue) {
        range.count++;
        break;
      }
    }
  });

  return ranges;
}
