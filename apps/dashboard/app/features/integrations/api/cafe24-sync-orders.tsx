/**
 * Cafe24 주문 동기화 API
 * 
 * Cafe24에서 주문 데이터를 가져와 orders 테이블에 저장합니다.
 */
import { data } from "react-router";

import type { Route } from "./+types/cafe24-sync-orders";

import { getOrders, type Cafe24Order } from "../lib/cafe24.server";

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    ordersSynced: number;
    ordersSkipped: number;
    durationMs: number;
  };
}

/**
 * POST /api/integrations/cafe24/sync-orders
 * Cafe24 주문 동기화
 */
export async function action({ request }: Route.ActionArgs): Promise<SyncResult> {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    // Cafe24에서 주문 조회
    const ordersResult = await getOrders({
      startDate,
      endDate,
      limit: 100,
    });

    if (!ordersResult.success) {
      return {
        success: false,
        error: ordersResult.error || "Cafe24 주문 조회 실패",
      };
    }

    const cafe24Orders = ordersResult.orders || [];
    console.log(`📦 Cafe24에서 ${cafe24Orders.length}개 주문 조회됨`);

    if (cafe24Orders.length === 0) {
      return {
        success: true,
        message: "동기화할 주문이 없습니다",
        data: {
          ordersSynced: 0,
          ordersSkipped: 0,
          durationMs: Date.now() - startTime,
        },
      };
    }

    // Supabase에 주문 저장
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    // 고객 매칭 유틸리티 import
    const { matchOrCreateCustomer, linkOrderToCustomer } = await import(
      "~/features/customer-analytics/lib/customer-matcher.server"
    );

    let syncedCount = 0;
    let skippedCount = 0;
    let customerMatchedCount = 0;

    for (const cafe24Order of cafe24Orders) {
      // 주문 상품별로 개별 레코드 생성 (기존 orders 테이블 구조와 호환)
      for (const item of cafe24Order.items || []) {
        const orderData = mapCafe24OrderToDb(cafe24Order, item);

        // uniq 기준으로 upsert
        const { data: upsertedOrder, error: upsertError } = await adminClient
          .from("orders")
          .upsert(orderData, {
            onConflict: "uniq",
          })
          .select("id, to_name, to_tel, to_htel, pay_amt, ord_time, shop_cd")
          .single();

        if (upsertError) {
          console.error("❌ 주문 저장 실패:", upsertError, orderData.uniq);
          skippedCount++;
        } else {
          syncedCount++;

          // 고객 매칭 처리
          if (upsertedOrder) {
            try {
              const customerId = await matchOrCreateCustomer(adminClient, {
                id: upsertedOrder.id,
                to_name: upsertedOrder.to_name,
                to_tel: upsertedOrder.to_tel,
                to_htel: upsertedOrder.to_htel,
                sale_price: upsertedOrder.pay_amt, // pay_amt를 sale_price로 전달
                ord_time: upsertedOrder.ord_time,
                shop_cd: upsertedOrder.shop_cd,
              });

              if (customerId) {
                await linkOrderToCustomer(adminClient, upsertedOrder.id, customerId);
                customerMatchedCount++;
              }
            } catch (matchErr) {
              console.warn("고객 매칭 실패:", matchErr);
            }
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`✅ Cafe24 주문 동기화 완료: ${syncedCount}건 저장, ${skippedCount}건 실패, ${customerMatchedCount}건 고객 매칭 (${durationMs}ms)`);

    return {
      success: true,
      message: `${syncedCount}개 주문 동기화 완료`,
      data: {
        ordersSynced: syncedCount,
        ordersSkipped: skippedCount,
        durationMs,
      },
    };

  } catch (error) {
    console.error("❌ Cafe24 주문 동기화 중 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "동기화 중 오류 발생",
    };
  }
}

/**
 * Cafe24 주문을 DB 스키마에 맞게 변환
 */
function mapCafe24OrderToDb(order: Cafe24Order, item: Cafe24Order["items"][0]) {
  // Cafe24 주문 상태를 기존 상태값으로 매핑
  const statusMap: Record<string, string> = {
    "N00": "입금전",
    "N10": "결제완료",
    "N20": "상품준비중",
    "N21": "배송대기",
    "N22": "배송보류",
    "N30": "배송중",
    "N40": "배송완료",
    "C00": "취소",
    "C10": "취소완료",
    "R00": "반품",
    "R10": "반품완료",
    "E00": "교환",
    "E10": "교환완료",
  };

  const receiver = order.receiver || {};

  return {
    // 고유 식별자: Cafe24 주문번호 + 주문상품코드
    uniq: `cafe24_${order.order_id}_${item.order_item_code}`,
    
    // PlayAuto 호환 필드
    sol_no: 0, // Cafe24는 sol_no 없음
    ori_uniq: null,
    bundle_no: null,
    
    // 주문 상태
    ord_status: statusMap[item.order_status] || item.order_status || "신규주문",
    
    // 쇼핑몰 정보
    shop_cd: "cafe24",
    shop_name: "카페24",
    shop_id: "cafe24",
    shop_ord_no: order.order_id,
    shop_ord_no_real: order.order_id,
    shop_sale_no: String(item.product_no),
    shop_sale_name: item.product_name,
    shop_sku_cd: item.product_code,
    shop_opt_name: item.option_value || null,
    
    // 주문 수량
    sale_cnt: item.quantity,
    
    // 시간 정보
    ord_time: order.order_date,
    pay_time: order.order_date,
    
    // 금액 정보
    pay_amt: parseFloat(item.product_price) * item.quantity,
    sales: parseFloat(item.product_price) * item.quantity,
    discount_amt: parseFloat(item.additional_discount_price || "0"),
    
    // 주문자 정보
    order_name: order.order_name || order.buyer_name,
    order_tel: order.order_phone || order.buyer_phone,
    order_email: order.order_email || order.buyer_email,
    
    // 수령자 정보
    to_name: receiver.name || order.billing_name,
    to_tel: receiver.phone || "",
    to_htel: receiver.cellphone || "",
    to_addr1: receiver.address1 || "",
    to_addr2: receiver.address2 || "",
    to_zipcd: receiver.zipcode || "",
    
    // 배송 메시지
    ship_msg: receiver.shipping_message || null,
    
    // 송장 정보
    invoice_no: item.tracking_no || null,
    carr_name: item.shipping_company_code || null,
    
    // 타임스탬프
    synced_at: new Date().toISOString(),
  };
}

/**
 * GET /api/integrations/cafe24/sync-orders
 * 동기화 상태 조회 (테스트용)
 */
export async function loader({ request }: Route.LoaderArgs) {
  return data({
    message: "POST 요청으로 주문 동기화를 시작하세요",
    params: {
      startDate: "YYYY-MM-DD (선택, 기본: 7일 전)",
      endDate: "YYYY-MM-DD (선택, 기본: 오늘)",
    },
  });
}

