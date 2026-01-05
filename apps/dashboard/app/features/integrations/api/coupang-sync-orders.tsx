/**
 * 쿠팡 로켓그로스 주문 동기화 API
 *
 * POST: 주문 데이터 동기화
 */

import type { Route } from "./+types/coupang-sync-orders";
import { createClient } from "@supabase/supabase-js";
import {
  getCoupangCredentials,
  getCoupangCredentialsByVendorId,
  getAllCoupangOrders,
  formatDateForCoupang,
  parseUnixTimestamp,
  type CoupangOrder,
  type CoupangOrderItem,
} from "../lib/coupang.server";

// 쿠팡 주문을 orders 테이블 형식으로 변환
function mapCoupangOrderToDb(
  order: CoupangOrder,
  item: CoupangOrderItem,
  _itemIndex: number
) {
  const paidDate = parseUnixTimestamp(order.paidAt);

  return {
    // 고유 식별자
    uniq: `COUPANG-${order.orderId}-${item.vendorItemId}`,
    ori_uniq: String(order.orderId),
    bundle_no: String(order.orderId),
    sol_no: String(order.orderId), // 솔루션 주문번호 (필수)
    ord_no: String(order.orderId), // 주문번호

    // 쇼핑몰 정보
    shop_cd: "coupang",
    shop_name: "쿠팡 로켓그로스",
    shop_ord_no: String(order.orderId),
    shop_ord_no_real: String(order.orderId),

    // 주문 상태 (로켓그로스는 결제 완료된 주문만 조회됨)
    ord_status: "결제완료",

    // 상품 정보
    shop_sale_name: item.productName,
    shop_sku_cd: String(item.vendorItemId),
    shop_opt_name: item.sellerProductItemName || "",

    // 수량 및 금액
    sale_cnt: item.salesQuantity,
    pay_amt: item.unitSalesPrice * item.salesQuantity,

    // 시간 정보
    ord_time: paidDate.toISOString(),
    pay_time: paidDate.toISOString(),

    // 통화
    ord_curr_cd: item.currency || "KRW",

    // 동기화 시간
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await request.formData();
  const vendorIdParam = formData.get("vendor_id") as string;
  const dateFromStr = formData.get("date_from") as string; // yyyyMMdd
  const dateToStr = formData.get("date_to") as string; // yyyyMMdd

  // 인증 정보 조회 ("auto"인 경우 활성화된 첫 번째 인증정보 사용)
  const credentials = vendorIdParam === "auto"
    ? await getCoupangCredentials()
    : await getCoupangCredentialsByVendorId(vendorIdParam);

  if (!credentials) {
    return { error: "쿠팡 연동 정보가 없습니다. 먼저 연동을 설정해주세요." };
  }

  if (!credentials.is_active) {
    return { error: "쿠팡 연동이 비활성화되어 있습니다." };
  }

  const vendorId = credentials.vendor_id;

  // 날짜 기본값 (오늘 기준 7일)
  const now = new Date();
  let dateFrom: Date;
  let dateTo: Date;

  if (dateFromStr && dateToStr) {
    dateFrom = new Date(dateFromStr);
    dateTo = new Date(dateToStr);
  } else {
    dateTo = now;
    dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - 7);
  }

  // 최대 30일 제한 확인
  const daysDiff = Math.ceil(
    (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff > 30) {
    return { error: "최대 30일까지만 조회할 수 있습니다." };
  }

  const coupangDateFrom = formatDateForCoupang(dateFrom);
  const coupangDateTo = formatDateForCoupang(dateTo);

  const startTime = Date.now();
  let syncedCount = 0;
  let failedCount = 0;

  try {
    console.log(
      `[Coupang] Syncing orders from ${coupangDateFrom} to ${coupangDateTo}`
    );

    // 전체 주문 조회 (페이징 자동 처리)
    const orders = await getAllCoupangOrders(
      credentials,
      coupangDateFrom,
      coupangDateTo
    );

    if (orders.length === 0) {
      // 동기화 로그 저장
      await adminClient.from("coupang_sync_logs").insert({
        sync_type: "orders",
        status: "success",
        items_synced: 0,
        date_from: dateFrom.toISOString().slice(0, 10),
        date_to: dateTo.toISOString().slice(0, 10),
        duration_ms: Date.now() - startTime,
      });

      // 마지막 동기화 시간 업데이트
      await adminClient
        .from("coupang_credentials")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("vendor_id", vendorId);

      return {
        success: true,
        synced: 0,
        message: "동기화할 주문이 없습니다.",
      };
    }

    // 주문 데이터를 orders 테이블 형식으로 변환
    const orderRows = orders.flatMap((order) =>
      order.orderItems.map((item, idx) => mapCoupangOrderToDb(order, item, idx))
    );

    // 배치 upsert (500개씩)
    const batchSize = 500;
    for (let i = 0; i < orderRows.length; i += batchSize) {
      const batch = orderRows.slice(i, i + batchSize);

      const { error } = await adminClient
        .from("orders")
        .upsert(batch, { onConflict: "uniq" });

      if (error) {
        console.error(`[Coupang] Batch upsert error:`, error);
        failedCount += batch.length;
      } else {
        syncedCount += batch.length;
      }
    }

    // 동기화 로그 저장
    await adminClient.from("coupang_sync_logs").insert({
      sync_type: "orders",
      status: failedCount > 0 ? "partial" : "success",
      items_synced: syncedCount,
      items_failed: failedCount,
      date_from: dateFrom.toISOString().slice(0, 10),
      date_to: dateTo.toISOString().slice(0, 10),
      duration_ms: Date.now() - startTime,
    });

    // 마지막 동기화 시간 업데이트
    await adminClient
      .from("coupang_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("vendor_id", vendorId);

    console.log(
      `[Coupang] Sync completed: ${syncedCount} synced, ${failedCount} failed`
    );

    return {
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: orders.length,
      message: `${syncedCount}건의 주문이 동기화되었습니다.`,
    };
  } catch (error: any) {
    console.error("[Coupang] Sync error:", error);

    // 에러 로그 저장
    await adminClient.from("coupang_sync_logs").insert({
      sync_type: "orders",
      status: "error",
      items_synced: syncedCount,
      items_failed: failedCount,
      date_from: dateFrom.toISOString().slice(0, 10),
      date_to: dateTo.toISOString().slice(0, 10),
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    });

    return { error: `동기화 실패: ${error.message}` };
  }
}
