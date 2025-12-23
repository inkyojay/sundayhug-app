/**
 * 고객 매칭 유틸리티
 * 
 * 주문 데이터에서 고객을 식별하고 customers 테이블에 매칭/생성
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface OrderData {
  id: string;
  to_name: string;
  to_tel?: string;
  to_htel?: string;
  sale_price?: number;
  ord_time?: string;
  shop_cd: string;
}

/**
 * 전화번호 정규화 (하이픈, 공백 제거)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[-\s]/g, "").trim();
}

/**
 * 주문에서 고객 매칭/생성 후 customer_id 반환
 */
export async function matchOrCreateCustomer(
  adminClient: SupabaseClient,
  order: OrderData
): Promise<string | null> {
  const name = order.to_name?.trim();
  const phone = order.to_tel || order.to_htel;
  const normalizedPhone = normalizePhone(phone);

  // 이름과 전화번호가 없으면 매칭 불가
  if (!name || !normalizedPhone) {
    return null;
  }

  try {
    // 1. 기존 고객 찾기
    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id, total_orders, total_amount, channels")
      .eq("name", name)
      .eq("normalized_phone", normalizedPhone)
      .single();

    if (existingCustomer) {
      // 2. 기존 고객 업데이트
      const channels = existingCustomer.channels || [];
      if (!channels.includes(order.shop_cd)) {
        channels.push(order.shop_cd);
      }

      await adminClient
        .from("customers")
        .update({
          last_order_date: order.ord_time || new Date().toISOString(),
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_amount: (existingCustomer.total_amount || 0) + (order.sale_price || 0),
          channels,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCustomer.id);

      return existingCustomer.id;
    }

    // 3. 새 고객 생성
    const { data: newCustomer, error } = await adminClient
      .from("customers")
      .insert({
        name,
        phone: phone || "",
        normalized_phone: normalizedPhone,
        first_order_date: order.ord_time || new Date().toISOString(),
        last_order_date: order.ord_time || new Date().toISOString(),
        total_orders: 1,
        total_amount: order.sale_price || 0,
        channels: [order.shop_cd],
      })
      .select("id")
      .single();

    if (error) {
      // UNIQUE 제약조건 위반 시 (동시 요청) 다시 조회
      if (error.code === "23505") {
        const { data: retryCustomer } = await adminClient
          .from("customers")
          .select("id")
          .eq("name", name)
          .eq("normalized_phone", normalizedPhone)
          .single();
        return retryCustomer?.id || null;
      }
      console.error("[CustomerMatcher] Error creating customer:", error);
      return null;
    }

    return newCustomer?.id || null;
  } catch (err) {
    console.error("[CustomerMatcher] Unexpected error:", err);
    return null;
  }
}

/**
 * 주문에 customer_id 연결
 */
export async function linkOrderToCustomer(
  adminClient: SupabaseClient,
  orderId: string,
  customerId: string
): Promise<void> {
  try {
    await adminClient
      .from("orders")
      .update({ customer_id: customerId })
      .eq("id", orderId);
  } catch (err) {
    console.error("[CustomerMatcher] Error linking order:", err);
  }
}

/**
 * 주문 배열에 대해 일괄 고객 매칭 처리
 */
export async function processOrdersForCustomerMatching(
  adminClient: SupabaseClient,
  orders: OrderData[]
): Promise<{ matched: number; created: number; failed: number }> {
  let matched = 0;
  let created = 0;
  let failed = 0;

  for (const order of orders) {
    const customerId = await matchOrCreateCustomer(adminClient, order);
    
    if (customerId) {
      await linkOrderToCustomer(adminClient, order.id, customerId);
      matched++;
    } else {
      failed++;
    }
  }

  return { matched, created, failed };
}

