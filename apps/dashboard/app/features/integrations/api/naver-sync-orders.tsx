/**
 * 네이버 주문 동기화 API
 * 
 * POST /api/integrations/naver/sync-orders
 * 네이버 스마트스토어 주문을 Supabase orders 테이블로 동기화
 */
import { data } from "react-router";

import type { Route } from "./+types/naver-sync-orders";

/**
 * POST - 주문 동기화
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  console.log("📦 네이버 주문 동기화 시작...");
  const syncStartTime = Date.now();

  try {
    // 동적 import로 서버 전용 모듈 로드
    const { getOrders } = await import("../lib/naver.server");
    
    // 1. 주문 목록 조회
    const fetchT0 = Date.now();
    const ordersResult = await getOrders({
      orderDateFrom: startDate || undefined,
      orderDateTo: endDate || undefined,
    });
    const fetchMs = Date.now() - fetchT0;
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/876e79b7-3e6f-4fe2-a898-0e4d7dc77d34",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"naver-sync-orders.tsx:action",message:"orders fetched",data:{inputStartDate:startDate||null,inputEndDate:endDate||null,success:ordersResult.success,count:ordersResult.count||0,fetchMs},timestamp:Date.now(),sessionId:"debug-session",runId:"pre-fix",hypothesisId:"H2"})}).catch(()=>{});
    // #endregion

    if (!ordersResult.success) {
      console.error("❌ 주문 조회 실패:", ordersResult.error);
      return data({
        success: false,
        error: ordersResult.error,
      }, { status: 500 });
    }

    const orders = ordersResult.orders || [];
    console.log(`📋 조회된 주문: ${orders.length}건`);

    if (orders.length === 0) {
      return data({
        success: true,
        message: "동기화할 주문이 없습니다.",
        synced: 0,
        duration: Date.now() - syncStartTime,
      });
    }

    // 2. Supabase에 주문 저장
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    // 고객 매칭 유틸리티 import (배치 처리)
    const { matchOrCreateCustomersBulk } = await import(
      "~/features/customer-analytics/lib/customer-matcher.server"
    );

    let syncedCount = 0;
    let failedCount = 0;
    let customerMatchedCount = 0;
    const upsertT0 = Date.now();

    // 2-1) 주문 배치 upsert
    const nowIso = new Date().toISOString();
    const rows = orders.map((order) => ({
      uniq: `NAVER-${order.productOrderId}`,
      ori_uniq: order.orderId,
      shop_cd: "naver",
      shop_name: "네이버스마트스토어",
      shop_ord_no: order.orderId,
      shop_ord_no_real: order.productOrderId,
      ord_status: mapNaverOrderStatus(order.productOrderStatus),
      ord_time: order.orderDate ? new Date(order.orderDate) : null,
      pay_time: order.paymentDate ? new Date(order.paymentDate) : null,
      order_name: order.ordererName,
      order_tel: order.ordererTel,
      to_name: order.receiverName,
      to_tel: order.receiverTel,
      to_addr1: order.receiverAddress,
      ship_msg: order.deliveryMemo,
      invoice_no: order.trackingNumber,
      carr_name: order.deliveryCompanyCode,
      shop_sale_name: order.productName,
      shop_opt_name: order.productOption,
      sale_cnt: order.quantity,
      pay_amt: order.totalPaymentAmount,
      ship_cost: order.deliveryFee,
      sol_no: 0,
      synced_at: nowIso,
      updated_at: nowIso,
    }));

    const upsertBatchT0 = Date.now();
    const { data: upsertedOrders, error: upsertBatchError } = await adminClient
      .from("orders")
      .upsert(rows, { onConflict: "uniq" })
      .select("id, uniq, to_name, to_tel, pay_amt, ord_time, shop_cd");
    const upsertBatchMs = Date.now() - upsertBatchT0;

    if (upsertBatchError) {
      console.error("❌ 주문 배치 저장 실패:", upsertBatchError);
      return data({ success: false, error: "주문 저장 실패" }, { status: 500 });
    }

    syncedCount = upsertedOrders?.length || 0;
    failedCount = Math.max(0, orders.length - syncedCount);
    console.log(`🧱 [PERF] orders upsert(batch): ${syncedCount}/${orders.length} rows (${upsertBatchMs}ms)`);

    // 2-2) 고객 매칭/연결 배치 처리 (고객당 1회 집계 업데이트 + orders.customer_id 배치)
    const customerT0 = Date.now();
    const matchingInput = (upsertedOrders || []).map((o) => ({
      id: o.id,
      to_name: o.to_name,
      to_tel: o.to_tel,
      sale_price: o.pay_amt,
      ord_time: o.ord_time,
      shop_cd: o.shop_cd,
    }));
    const bulkRes = await matchOrCreateCustomersBulk(adminClient, matchingInput);
    const customerMs = Date.now() - customerT0;
    customerMatchedCount = matchingInput.length - bulkRes.skippedOrders;
    console.log(
      `🧱 [PERF] customer match/link(batch): orders=${matchingInput.length}, matchedCustomers=${bulkRes.matchedCustomers}, createdCustomers=${bulkRes.createdCustomers} (${customerMs}ms)`
    );
    const upsertMs = Date.now() - upsertT0;

    const duration = Date.now() - syncStartTime;
    console.log(`✅ 네이버 주문 동기화 완료: ${syncedCount}건 성공, ${failedCount}건 실패, ${customerMatchedCount}건 고객 매칭 (${duration}ms)`);
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/876e79b7-3e6f-4fe2-a898-0e4d7dc77d34",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"naver-sync-orders.tsx:action",message:"sync done",data:{syncedCount,failedCount,customerMatchedCount,durationMs:duration,upsertMs},timestamp:Date.now(),sessionId:"debug-session",runId:"pre-fix",hypothesisId:"H2"})}).catch(()=>{});
    // #endregion

    // 3. 동기화 로그 저장
    await adminClient.from("order_sync_logs").insert({
      sync_type: "manual",
      status: failedCount === 0 ? "success" : "partial",
      orders_synced: syncedCount,
      orders_failed: failedCount,
      date_range_start: startDate || null,
      date_range_end: endDate || null,
      shop_cd: "naver",
      duration_ms: duration,
      source: "api",
    });

    return data({
      success: true,
      message: `${syncedCount}건의 주문이 동기화되었습니다.`,
      synced: syncedCount,
      failed: failedCount,
      total: orders.length,
      duration,
    });
  } catch (error) {
    console.error("❌ 주문 동기화 중 오류:", error);
    return data({
      success: false,
      error: "주문 동기화 중 오류가 발생했습니다.",
    }, { status: 500 });
  }
}

/**
 * GET - API 정보
 */
export async function loader() {
  return data({
    message: "POST /api/integrations/naver/sync-orders",
    description: "네이버 스마트스토어 주문을 동기화합니다.",
  });
}

/**
 * 네이버 주문 상태 → 내부 주문 상태 매핑
 */
function mapNaverOrderStatus(naverStatus: string): string {
  const statusMap: Record<string, string> = {
    "PAYED": "결제완료",
    "DELIVERING": "배송중",
    "DELIVERED": "배송완료",
    "PURCHASE_DECIDED": "구매확정",
    "EXCHANGED": "교환완료",
    "CANCELED": "취소완료",
    "RETURNED": "반품완료",
    "CANCEL_REQUEST": "취소요청",
    "RETURN_REQUEST": "반품요청",
    "EXCHANGE_REQUEST": "교환요청",
  };
  return statusMap[naverStatus] || naverStatus;
}

