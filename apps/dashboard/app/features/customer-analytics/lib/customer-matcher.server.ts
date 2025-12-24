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

interface CustomerKeyAgg {
  key: string;
  name: string;
  phone: string;
  normalized_phone: string;
  first_order_date: string;
  last_order_date: string;
  total_orders_inc: number;
  total_amount_inc: number;
  channels: string[];
  orderIds: string[];
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
 * 주문 배열을 "고객(이름+전화번호)" 단위로 집계해 한 번에 customers 업데이트/생성하고,
 * orders.customer_id 연결을 배치로 처리합니다.
 *
 * - 성능 개선 목적: 주문당 N번 쿼리 → 고객당/배치 쿼리
 * - 주의: name/normalized_phone UNIQUE 제약이 존재해야 합니다.
 */
export async function matchOrCreateCustomersBulk(
  adminClient: SupabaseClient,
  orders: OrderData[]
): Promise<{
  customerIdByOrderId: Map<string, string>;
  matchedCustomers: number;
  createdCustomers: number;
  skippedOrders: number;
}> {
  const customerIdByOrderId = new Map<string, string>();

  // 1) 고객 키 집계
  const aggByKey = new Map<string, CustomerKeyAgg>();
  for (const order of orders) {
    const name = order.to_name?.trim();
    const phone = (order.to_tel || order.to_htel || "").trim();
    const normalizedPhone = normalizePhone(phone);
    if (!name || !normalizedPhone) continue;

    const key = `${name}::${normalizedPhone}`;
    const ordTime = order.ord_time || new Date().toISOString();
    const sale = Number(order.sale_price || 0);

    const prev = aggByKey.get(key);
    if (!prev) {
      aggByKey.set(key, {
        key,
        name,
        phone,
        normalized_phone: normalizedPhone,
        first_order_date: ordTime,
        last_order_date: ordTime,
        total_orders_inc: 1,
        total_amount_inc: sale,
        channels: [order.shop_cd],
        orderIds: [order.id],
      });
      continue;
    }

    prev.total_orders_inc += 1;
    prev.total_amount_inc += sale;
    prev.last_order_date = prev.last_order_date > ordTime ? prev.last_order_date : ordTime;
    prev.first_order_date = prev.first_order_date < ordTime ? prev.first_order_date : ordTime;
    if (!prev.channels.includes(order.shop_cd)) prev.channels.push(order.shop_cd);
    prev.orderIds.push(order.id);
  }

  const aggs = Array.from(aggByKey.values());
  const skippedOrders = orders.length - aggs.reduce((sum, a) => sum + a.orderIds.length, 0);
  if (aggs.length === 0) {
    return { customerIdByOrderId, matchedCustomers: 0, createdCustomers: 0, skippedOrders: orders.length };
  }

  // 2) 기존 customers 조회 (normalized_phone IN으로 좁히고, name까지 JS에서 필터)
  const normalizedPhones = Array.from(new Set(aggs.map((a) => a.normalized_phone)));
  const { data: existingCustomers, error: existingErr } = await adminClient
    .from("customers")
    .select("id,name,phone,normalized_phone,total_orders,total_amount,channels,first_order_date,last_order_date")
    .in("normalized_phone", normalizedPhones);

  if (existingErr) {
    console.error("[CustomerMatcher] Bulk: error fetching existing customers:", existingErr);
    return { customerIdByOrderId, matchedCustomers: 0, createdCustomers: 0, skippedOrders: orders.length };
  }

  const existingByKey = new Map<string, any>();
  for (const c of existingCustomers || []) {
    const k = `${c.name}::${c.normalized_phone}`;
    existingByKey.set(k, c);
  }

  // 3) 새 고객 insert (배치)
  const toInsert = aggs
    .filter((a) => !existingByKey.has(a.key))
    .map((a) => ({
      name: a.name,
      phone: a.phone || "",
      normalized_phone: a.normalized_phone,
      first_order_date: a.first_order_date,
      last_order_date: a.last_order_date,
      total_orders: a.total_orders_inc,
      total_amount: a.total_amount_inc,
      channels: a.channels,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  let createdCustomers = 0;
  if (toInsert.length > 0) {
    const { data: inserted, error: insertErr } = await adminClient
      .from("customers")
      .insert(toInsert)
      .select("id,name,normalized_phone");

    if (insertErr) {
      // 동시성(UNIQUE) 가능성: 일부 실패하더라도 아래에서 재조회로 커버
      console.warn("[CustomerMatcher] Bulk: insert customers failed (will retry via re-fetch):", insertErr);
    } else {
      createdCustomers = inserted?.length || 0;
      for (const c of inserted || []) {
        existingByKey.set(`${c.name}::${c.normalized_phone}`, c);
      }
    }
  }

  // 4) 기존 고객 업데이트는 "고객당 1회"로 배치 upsert(id conflict)
  const toUpdate = aggs
    .map((a) => {
      const existing = existingByKey.get(a.key);
      if (!existing?.id) return null;
      const channels = Array.isArray(existing.channels) ? [...existing.channels] : [];
      for (const ch of a.channels) if (!channels.includes(ch)) channels.push(ch);
      return {
        id: existing.id,
        // NOT NULL 컬럼 보호: insert로 떨어지더라도 제약 위반 방지
        name: existing.name || a.name,
        phone: (existing.phone ?? a.phone ?? "").toString(),
        normalized_phone: existing.normalized_phone || a.normalized_phone,
        last_order_date: existing.last_order_date && existing.last_order_date > a.last_order_date
          ? existing.last_order_date
          : a.last_order_date,
        first_order_date: existing.first_order_date && existing.first_order_date < a.first_order_date
          ? existing.first_order_date
          : a.first_order_date,
        total_orders: Number(existing.total_orders || 0) + a.total_orders_inc,
        total_amount: Number(existing.total_amount || 0) + a.total_amount_inc,
        channels,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as any[];

  if (toUpdate.length > 0) {
    // upsert가 insert로 떨어져도 NOT NULL 필드를 포함하므로 안전
    const { error: updErr } = await adminClient.from("customers").upsert(toUpdate, { onConflict: "id" });
    if (updErr) {
      console.error("[CustomerMatcher] Bulk: update customers failed:", updErr);
    }
  }

  // 5) customer id 매핑 확보를 위해 재조회(삽입 실패/동시성 케이스 커버)
  const { data: customersAfter, error: afterErr } = await adminClient
    .from("customers")
    .select("id,name,normalized_phone")
    .in("normalized_phone", normalizedPhones);

  if (afterErr) {
    console.error("[CustomerMatcher] Bulk: re-fetch customers failed:", afterErr);
    return { customerIdByOrderId, matchedCustomers: 0, createdCustomers, skippedOrders };
  }

  const finalByKey = new Map<string, string>();
  for (const c of customersAfter || []) {
    finalByKey.set(`${c.name}::${c.normalized_phone}`, c.id);
  }

  // 6) orders.customer_id 연결(배치 upsert on id)
  const orderIdsByCustomerId = new Map<string, string[]>();
  for (const a of aggs) {
    const customerId = finalByKey.get(a.key);
    if (!customerId) continue;
    for (const orderId of a.orderIds) {
      customerIdByOrderId.set(orderId, customerId);
      const prev = orderIdsByCustomerId.get(customerId) || [];
      prev.push(orderId);
      orderIdsByCustomerId.set(customerId, prev);
    }
  }

  // ⚠️ orders는 NOT NULL 컬럼이 많아서 upsert가 insert로 떨어지면 제약 위반 위험.
  // 안전하게 "update ... in(id)" 로만 처리 (insert 불가).
  const linkNow = new Date().toISOString();
  for (const [customerId, orderIds] of orderIdsByCustomerId.entries()) {
    if (orderIds.length === 0) continue;
    const { error: linkErr } = await adminClient
      .from("orders")
      .update({ customer_id: customerId, updated_at: linkNow })
      .in("id", orderIds);
    if (linkErr) console.error("[CustomerMatcher] Bulk: link orders failed:", linkErr);
  }

  return {
    customerIdByOrderId,
    matchedCustomers: finalByKey.size,
    createdCustomers,
    skippedOrders,
  };
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

