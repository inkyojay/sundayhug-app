/**
 * 네이버 주문 동기화 API
 * 
 * POST /api/integrations/naver/sync-orders
 * 네이버 스마트스토어 주문을 Supabase orders 테이블로 동기화
 */
import { data } from "react-router";

import type { Route } from "./+types/naver-sync-orders";

import { getOrders, getOrderDetails } from "../lib/naver.server";

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
    // 1. 주문 목록 조회
    const ordersResult = await getOrders({
      orderDateFrom: startDate || undefined,
      orderDateTo: endDate || undefined,
    });

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

    let syncedCount = 0;
    let failedCount = 0;

    for (const order of orders) {
      try {
        // orders 테이블에 upsert
        const { error: upsertError } = await adminClient
          .from("orders")
          .upsert({
            // 네이버 주문 고유번호를 uniq로 사용
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
            sol_no: 0, // 네이버는 PlayAuto와 무관
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "uniq" });

        if (upsertError) {
          console.error(`❌ 주문 저장 실패 (${order.productOrderId}):`, upsertError);
          failedCount++;
        } else {
          syncedCount++;
        }
      } catch (err) {
        console.error(`❌ 주문 처리 중 오류 (${order.productOrderId}):`, err);
        failedCount++;
      }
    }

    const duration = Date.now() - syncStartTime;
    console.log(`✅ 네이버 주문 동기화 완료: ${syncedCount}건 성공, ${failedCount}건 실패 (${duration}ms)`);

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

