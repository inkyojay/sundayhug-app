/**
 * RFM 분석 서버 로직
 *
 * - RFM 스코어 계산 (Recency, Frequency, Monetary)
 * - 고객 세그먼트 분류
 * - 세그먼트별 분포 계산
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEGMENT_INFO,
  type CustomerSegment,
  type RFMScore,
  type RFMSummary,
  type SegmentDistribution,
} from "../types";

// ===== 내부 타입 =====

interface RawRFMData {
  customer_phone: string;
  customer_name: string;
  recency: number;
  frequency: number;
  monetary: number;
  first_purchase: string | null;
  last_purchase: string | null;
}

// ===== 헬퍼 함수 =====

/**
 * 전화번호 정규화
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s]/g, '').trim();
}

/**
 * NTILE(5) 맵 생성
 */
function createNTileMap(sortedArray: RawRFMData[], keyField: keyof RawRFMData): Map<string, number> {
  const map = new Map<string, number>();
  const n = sortedArray.length;
  const bucketSize = Math.ceil(n / 5);

  sortedArray.forEach((item, index) => {
    const ntile = Math.min(5, Math.floor(index / bucketSize) + 1);
    map.set(item[keyField] as string, ntile);
  });

  return map;
}

// ===== RFM 세그먼트 분류 로직 =====

/**
 * RFM 스코어를 기반으로 고객 세그먼트를 분류합니다.
 */
export function classifySegment(rScore: number, fScore: number, mScore: number): CustomerSegment {
  // Champions: R >= 4, F >= 4, M >= 4
  if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
    return 'Champions';
  }

  // Can't Lose Them: R <= 2, F >= 4, M >= 4
  if (rScore <= 2 && fScore >= 4 && mScore >= 4) {
    return "Can't Lose Them";
  }

  // Loyal Customers: F >= 4
  if (fScore >= 4) {
    return 'Loyal Customers';
  }

  // At Risk: R <= 2, F >= 2
  if (rScore <= 2 && fScore >= 2) {
    return 'At Risk';
  }

  // Potential Loyalists: R >= 4, F >= 2
  if (rScore >= 4 && fScore >= 2) {
    return 'Potential Loyalists';
  }

  // New Customers: R >= 4, F = 1
  if (rScore >= 4 && fScore === 1) {
    return 'New Customers';
  }

  // Promising: R >= 3, F <= 2
  if (rScore >= 3 && fScore <= 2) {
    return 'Promising';
  }

  // Need Attention: R = 3, F = 3
  if (rScore === 3 && fScore === 3) {
    return 'Need Attention';
  }

  // About To Sleep: R = 2, F = 2-3
  if (rScore === 2 && fScore >= 2 && fScore <= 3) {
    return 'About To Sleep';
  }

  // Hibernating: R <= 2, F <= 2
  if (rScore <= 2 && fScore <= 2) {
    return 'Hibernating';
  }

  // Lost: R = 1, F = 1
  if (rScore === 1 && fScore === 1) {
    return 'Lost';
  }

  // 기본값
  return 'Hibernating';
}

// ===== RFM 분석 함수 =====

/**
 * 주문 데이터에서 RFM 분석을 수행합니다.
 */
export async function calculateRFMScores(
  adminClient: SupabaseClient
): Promise<{ scores: RFMScore[]; summary: RFMSummary }> {
  // RFM 원본 데이터 조회
  const { data: rfmRawData, error } = await adminClient.rpc('get_rfm_data');

  if (error) {
    console.error('[CustomerAnalytics] RFM query error:', error);
    // 직접 쿼리로 폴백
    return await calculateRFMScoresFallback(adminClient);
  }

  if (!rfmRawData || rfmRawData.length === 0) {
    return {
      scores: [],
      summary: { totalCustomers: 0, avgRecency: 0, avgFrequency: 0, avgMonetary: 0 },
    };
  }

  return processRFMData(rfmRawData as RawRFMData[]);
}

/**
 * RPC가 없을 경우 직접 쿼리로 RFM 데이터를 계산합니다.
 */
async function calculateRFMScoresFallback(
  adminClient: SupabaseClient
): Promise<{ scores: RFMScore[]; summary: RFMSummary }> {
  // 취소되지 않은 주문 조회
  const { data: orders, error } = await adminClient
    .from('orders')
    .select('to_name, to_tel, to_htel, order_tel, ord_time, pay_amt')
    .not('ord_status', 'in', '(취소,CANCELED,반품완료,교환완료)')
    .gt('pay_amt', 0)
    .not('ord_time', 'is', null);

  if (error || !orders) {
    console.error('[CustomerAnalytics] Orders query error:', error);
    return {
      scores: [],
      summary: { totalCustomers: 0, avgRecency: 0, avgFrequency: 0, avgMonetary: 0 },
    };
  }

  // 고객별 집계
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    orders: Array<{ date: string; amount: number }>;
  }>();

  for (const order of orders) {
    const name = order.to_name?.trim() || '';
    const phone = normalizePhone(order.to_tel || order.to_htel || order.order_tel || '');

    if (!name || !phone) continue;

    const key = `${name}::${phone}`;
    const existing = customerMap.get(key);

    const orderDate = order.ord_time || '';
    const amount = Number(order.pay_amt) || 0;

    if (existing) {
      existing.orders.push({ date: orderDate, amount });
    } else {
      customerMap.set(key, {
        name,
        phone,
        orders: [{ date: orderDate, amount }],
      });
    }
  }

  // RFM 계산
  const now = new Date();
  const rfmRawData: RawRFMData[] = [];

  for (const [, customer] of customerMap) {
    const sortedOrders = customer.orders.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastPurchase = sortedOrders[0]?.date || null;
    const firstPurchase = sortedOrders[sortedOrders.length - 1]?.date || null;

    const recency = lastPurchase
      ? Math.floor((now.getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const frequency = sortedOrders.length;
    const monetary = sortedOrders.reduce((sum, o) => sum + o.amount, 0);

    rfmRawData.push({
      customer_name: customer.name,
      customer_phone: customer.phone,
      recency,
      frequency,
      monetary,
      first_purchase: firstPurchase,
      last_purchase: lastPurchase,
    });
  }

  return processRFMData(rfmRawData);
}

/**
 * RFM 원본 데이터를 스코어링하고 세그먼트를 분류합니다.
 */
function processRFMData(rfmRawData: RawRFMData[]): { scores: RFMScore[]; summary: RFMSummary } {
  if (rfmRawData.length === 0) {
    return {
      scores: [],
      summary: { totalCustomers: 0, avgRecency: 0, avgFrequency: 0, avgMonetary: 0 },
    };
  }

  // 정렬된 배열로 NTILE 계산
  const sortedByRecency = [...rfmRawData].sort((a, b) => b.recency - a.recency); // DESC (낮은 recency가 좋음)
  const sortedByFrequency = [...rfmRawData].sort((a, b) => a.frequency - b.frequency); // ASC
  const sortedByMonetary = [...rfmRawData].sort((a, b) => a.monetary - b.monetary); // ASC

  // 스코어 맵 생성
  const rScoreMap = createNTileMap(sortedByRecency, 'customer_phone');
  const fScoreMap = createNTileMap(sortedByFrequency, 'customer_phone');
  const mScoreMap = createNTileMap(sortedByMonetary, 'customer_phone');

  // RFM 스코어 생성
  const scores: RFMScore[] = rfmRawData.map((row) => {
    const key = row.customer_phone;
    const rScore = rScoreMap.get(key) || 3;
    const fScore = fScoreMap.get(key) || 3;
    const mScore = mScoreMap.get(key) || 3;

    return {
      customerId: key,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      recency: row.recency,
      frequency: row.frequency,
      monetary: row.monetary,
      rScore,
      fScore,
      mScore,
      segment: classifySegment(rScore, fScore, mScore),
      firstPurchase: row.first_purchase,
      lastPurchase: row.last_purchase,
    };
  });

  // 요약 통계
  const totalCustomers = scores.length;
  const avgRecency = Math.round(scores.reduce((sum, s) => sum + s.recency, 0) / totalCustomers);
  const avgFrequency = Number((scores.reduce((sum, s) => sum + s.frequency, 0) / totalCustomers).toFixed(1));
  const avgMonetary = Math.round(scores.reduce((sum, s) => sum + s.monetary, 0) / totalCustomers);

  return {
    scores,
    summary: {
      totalCustomers,
      avgRecency,
      avgFrequency,
      avgMonetary,
    },
  };
}

/**
 * 세그먼트별 분포를 계산합니다.
 */
export function calculateSegmentDistribution(scores: RFMScore[]): SegmentDistribution[] {
  const segmentCounts = new Map<CustomerSegment, number>();

  // 모든 세그먼트 초기화
  const allSegments: CustomerSegment[] = Object.keys(SEGMENT_INFO) as CustomerSegment[];
  allSegments.forEach((seg) => segmentCounts.set(seg, 0));

  // 카운트
  scores.forEach((score) => {
    const current = segmentCounts.get(score.segment) || 0;
    segmentCounts.set(score.segment, current + 1);
  });

  const total = scores.length;

  // 분포 생성 (0인 세그먼트는 제외)
  return allSegments
    .map((segment) => ({
      segment,
      count: segmentCounts.get(segment) || 0,
      percentage: total > 0 ? Number(((segmentCounts.get(segment) || 0) / total * 100).toFixed(1)) : 0,
      color: SEGMENT_INFO[segment].color,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}
