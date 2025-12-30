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
    console.log(`📋 네이버 주문 조회 완료: ${fetchMs}ms`);

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

    // 2-3) 재고 차감 처리 - 결제완료 또는 상품준비중 상태일 때
    const stockDeductionStatuses = ["결제완료", "상품준비중", "PAYED"];
    let stockDeductedCount = 0;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const upsertedOrder = upsertedOrders?.[i];
      
      if (!upsertedOrder) continue;
      
      // 매핑된 상태 확인
      const mappedStatus = mapNaverOrderStatus(order.productOrderStatus);
      if (!stockDeductionStatuses.includes(mappedStatus) && !stockDeductionStatuses.includes(order.productOrderStatus)) {
        continue;
      }

      try {
        // 네이버 상품에서 SKU 찾기
        const { data: optionData } = await adminClient
          .from("naver_product_options")
          .select("sku_id, products:sku_id(sku)")
          .eq("origin_product_no", parseInt(order.productId))
          .limit(1)
          .single();

        if (optionData?.products && typeof optionData.products === 'object' && 'sku' in optionData.products) {
          const sku = optionData.products.sku as string;
          
          // 재고 차감
          const { data: inventoryData, error: fetchError } = await adminClient
            .from("inventory")
            .select("id, current_stock")
            .eq("sku", sku)
            .order("synced_at", { ascending: false })
            .limit(1)
            .single();

          if (!fetchError && inventoryData) {
            const newStock = Math.max(0, inventoryData.current_stock - order.quantity);
            await adminClient
              .from("inventory")
              .update({ 
                current_stock: newStock,
                previous_stock: inventoryData.current_stock,
                stock_change: -order.quantity,
                synced_at: new Date().toISOString(),
              })
              .eq("id", inventoryData.id);
            
            stockDeductedCount++;
            console.log(`📉 재고 차감: ${sku} ${inventoryData.current_stock} → ${newStock} (-${order.quantity})`);
          }
        }
      } catch (stockErr) {
        console.warn("재고 차감 실패:", stockErr);
      }
    }

    const duration = Date.now() - syncStartTime;
    console.log(`✅ 네이버 주문 동기화 완료: ${syncedCount}건 성공, ${failedCount}건 실패, ${customerMatchedCount}건 고객 매칭, ${stockDeductedCount}건 재고 차감 (${duration}ms)`);

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
      message: `${syncedCount}건의 주문이 동기화되었습니다. (재고 ${stockDeductedCount}건 차감)`,
      synced: syncedCount,
      failed: failedCount,
      stockDeducted: stockDeductedCount,
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

