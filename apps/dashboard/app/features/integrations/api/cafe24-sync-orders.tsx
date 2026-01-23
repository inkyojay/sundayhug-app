/**
 * Cafe24 주문 동기화 API
 * 
 * Cafe24에서 주문 데이터를 가져와 orders 테이블에 저장합니다.
 */
import { data } from "react-router";

import type { Route } from "./+types/cafe24-sync-orders";

import { getOrders, type Cafe24Order } from "../lib/cafe24.server";
import { getCarrierByChannelCode } from "~/features/orders-unified/lib/carriers";

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    ordersSynced: number;
    ordersSkipped: number;
    stockDeducted: number;
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
          stockDeducted: 0,
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
    let stockDeductedCount = 0;

    // SKU 매핑 조회 (cafe24_product_variants에서 sku_id와 연결된 SKU 찾기)
    const { data: skuMappings } = await adminClient
      .from("cafe24_product_variants")
      .select("product_no, variant_code, options, sku_id, products:sku_id(sku)")
      .not("sku_id", "is", null);
    
    const skuMap = new Map<string, string>();
    for (const mapping of skuMappings || []) {
      const key = `${mapping.product_no}_${mapping.variant_code}`;
      if (mapping.products && typeof mapping.products === 'object' && 'sku' in mapping.products) {
        skuMap.set(key, mapping.products.sku as string);
      }
    }

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
          .select("id, to_name, to_tel, to_htel, pay_amt, ord_time, shop_cd, ord_status")
          .single();

        if (upsertError) {
          console.error("❌ 주문 저장 실패:", upsertError, orderData.uniq);
          skippedCount++;
        } else {
          syncedCount++;

          // 재고 차감 처리 - 결제완료 또는 상품준비중 상태일 때만
          const stockDeductionStatuses = ["결제완료", "상품준비중"];
          if (upsertedOrder && stockDeductionStatuses.includes(upsertedOrder.ord_status)) {
            try {
              // Cafe24 variant_code 찾기 (item에서)
              // cafe24_product_variants에서 SKU 찾기
              const { data: variantData } = await adminClient
                .from("cafe24_product_variants")
                .select("sku_id, products:sku_id(sku)")
                .eq("product_no", item.product_no)
                .single();

              if (variantData?.products && typeof variantData.products === 'object' && 'sku' in variantData.products) {
                const sku = variantData.products.sku as string;
                
                // 재고 차감
                const { data: inventoryData, error: fetchError } = await adminClient
                  .from("inventory")
                  .select("id, current_stock")
                  .eq("sku", sku)
                  .order("synced_at", { ascending: false })
                  .limit(1)
                  .single();

                if (!fetchError && inventoryData) {
                  const newStock = Math.max(0, inventoryData.current_stock - item.quantity);
                  await adminClient
                    .from("inventory")
                    .update({ 
                      current_stock: newStock,
                      previous_stock: inventoryData.current_stock,
                      stock_change: -item.quantity,
                      synced_at: new Date().toISOString(),
                    })
                    .eq("id", inventoryData.id);
                  
                  stockDeductedCount++;
                  console.log(`📉 재고 차감: ${sku} ${inventoryData.current_stock} → ${newStock} (-${item.quantity})`);
                }
              }
            } catch (stockErr) {
              console.warn("재고 차감 실패:", stockErr);
            }
          }

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
    console.log(`✅ Cafe24 주문 동기화 완료: ${syncedCount}건 저장, ${skippedCount}건 실패, ${customerMatchedCount}건 고객 매칭, ${stockDeductedCount}건 재고 차감 (${durationMs}ms)`);

    return {
      success: true,
      message: `${syncedCount}개 주문 동기화 완료 (재고 ${stockDeductedCount}건 차감)`,
      data: {
        ordersSynced: syncedCount,
        ordersSkipped: skippedCount,
        stockDeducted: stockDeductedCount,
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

  // receiver 처리: 단일 객체 또는 배열 모두 지원
  // Cafe24 API는 embed=receivers 시 receivers 배열로 반환할 수 있음
  let receiver: any = {};
  if (order.receiver) {
    receiver = order.receiver;
  } else if ((order as any).receivers && Array.isArray((order as any).receivers)) {
    receiver = (order as any).receivers[0] || {};
  }

  // 택배사 코드를 이름으로 변환
  let carrierName: string | null = null;
  if (item.shipping_company_code) {
    const carrier = getCarrierByChannelCode("cafe24", item.shipping_company_code);
    carrierName = carrier?.label || item.shipping_company_code;
  }

  // 상품별 실 결제 금액 계산
  // - product_price: 상품 단가
  // - quantity: 수량
  // - additional_discount_price: 추가 할인 금액
  //
  // 주의: actual_payment_amount는 주문 전체 금액이므로 사용하지 않음
  //       (여러 상품이 있으면 중복 합산되는 문제 발생)
  const productAmount = parseFloat(item.product_price || "0") * item.quantity;
  const discountAmount = parseFloat(item.additional_discount_price || "0");
  const itemPaymentAmount = productAmount - discountAmount;

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

    // 금액 정보 (상품별 실 결제 금액)
    pay_amt: itemPaymentAmount,
    sales: productAmount,
    discount_amt: discountAmount,

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

    // 송장 정보 (택배사 코드 → 이름 변환)
    invoice_no: item.tracking_no || null,
    carr_name: carrierName,

    // 외부몰 정보
    market_id: (order as any).market_id || null,
    market_order_no: (order as any).market_order_no || null,
    order_place_name: (order as any).order_place_name || null,

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

