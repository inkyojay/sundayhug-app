/**
 * 코호트 분석 서버 로직
 *
 * - 월별 코호트 리텐션 분석
 * - 첫 구매월 기준 고객 그룹화
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CohortRow } from "../types";

// ===== 헬퍼 함수 =====

/**
 * 전화번호 정규화
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s]/g, '').trim();
}

/**
 * 두 월 사이의 차이를 계산합니다.
 */
function monthDiff(fromMonth: string, toMonth: string): number {
  const [fromYear, fromMon] = fromMonth.split('-').map(Number);
  const [toYear, toMon] = toMonth.split('-').map(Number);

  return (toYear - fromYear) * 12 + (toMon - fromMon);
}

// ===== 코호트 분석 함수 =====

/**
 * 월별 코호트 리텐션 분석을 수행합니다.
 */
export async function calculateCohortAnalysis(
  adminClient: SupabaseClient
): Promise<CohortRow[]> {
  // 주문 데이터 조회
  const { data: orders, error } = await adminClient
    .from('orders')
    .select('to_name, to_tel, to_htel, order_tel, ord_time')
    .not('ord_status', 'in', '(취소,CANCELED,반품완료,교환완료)')
    .not('ord_time', 'is', null)
    .order('ord_time', { ascending: true });

  if (error || !orders || orders.length === 0) {
    return [];
  }

  // 고객별 주문 월 집계
  const customerOrderMonths = new Map<string, Set<string>>();
  const customerFirstMonth = new Map<string, string>();

  for (const order of orders) {
    const name = order.to_name?.trim() || '';
    const phone = normalizePhone(order.to_tel || order.to_htel || order.order_tel || '');

    if (!name || !phone) continue;

    const key = `${name}::${phone}`;
    const orderMonth = order.ord_time?.slice(0, 7); // YYYY-MM

    if (!orderMonth) continue;

    // 주문 월 기록
    if (!customerOrderMonths.has(key)) {
      customerOrderMonths.set(key, new Set());
      customerFirstMonth.set(key, orderMonth);
    }
    customerOrderMonths.get(key)!.add(orderMonth);

    // 첫 구매월 업데이트 (더 이른 월이면)
    const existingFirst = customerFirstMonth.get(key)!;
    if (orderMonth < existingFirst) {
      customerFirstMonth.set(key, orderMonth);
    }
  }

  // 코호트별 집계
  const cohortCustomers = new Map<string, Set<string>>(); // cohortMonth -> customer keys
  const cohortMonthlyActivity = new Map<string, Map<string, Set<string>>>(); // cohortMonth -> orderMonth -> customer keys

  for (const [customerKey, orderMonths] of customerOrderMonths) {
    const cohortMonth = customerFirstMonth.get(customerKey)!;

    // 코호트 고객 추가
    if (!cohortCustomers.has(cohortMonth)) {
      cohortCustomers.set(cohortMonth, new Set());
      cohortMonthlyActivity.set(cohortMonth, new Map());
    }
    cohortCustomers.get(cohortMonth)!.add(customerKey);

    // 월별 활동 기록
    const monthlyActivity = cohortMonthlyActivity.get(cohortMonth)!;
    for (const orderMonth of orderMonths) {
      if (!monthlyActivity.has(orderMonth)) {
        monthlyActivity.set(orderMonth, new Set());
      }
      monthlyActivity.get(orderMonth)!.add(customerKey);
    }
  }

  // 코호트 행 생성
  const cohortRows: CohortRow[] = [];
  const sortedCohortMonths = Array.from(cohortCustomers.keys()).sort();

  // 최근 12개월만
  const recentCohortMonths = sortedCohortMonths.slice(-12);

  for (const cohortMonth of recentCohortMonths) {
    const totalCustomers = cohortCustomers.get(cohortMonth)!.size;
    const monthlyActivity = cohortMonthlyActivity.get(cohortMonth)!;

    const retentionByMonth: Record<number, number> = {};

    // 월별 리텐션 계산
    for (const [orderMonth, activeCustomers] of monthlyActivity) {
      const monthsSinceFirst = monthDiff(cohortMonth, orderMonth);
      if (monthsSinceFirst >= 0 && monthsSinceFirst <= 12) {
        retentionByMonth[monthsSinceFirst] = Math.round(
          (activeCustomers.size / totalCustomers) * 100
        );
      }
    }

    cohortRows.push({
      cohortMonth,
      totalCustomers,
      retentionByMonth,
    });
  }

  return cohortRows;
}
