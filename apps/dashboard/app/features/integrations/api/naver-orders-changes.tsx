/**
 * 네이버 주문 변경 내역 API
 *
 * GET /api/integrations/naver/orders/changes - 변경 주문 내역 조회
 * POST /api/integrations/naver/orders/changes - 발주 확인
 */
import { data } from "react-router";
import type { Route } from "./+types/naver-orders-changes";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // 쿼리 파라미터 추출
  const lastChangedFrom = url.searchParams.get("lastChangedFrom");
  const lastChangedTo = url.searchParams.get("lastChangedTo");
  const lastChangedType = url.searchParams.get("lastChangedType") as
    | "PAYED"
    | "DELIVERING"
    | "DELIVERED"
    | "PURCHASE_DECIDED"
    | "EXCHANGED"
    | "CANCELED"
    | "RETURNED"
    | "CLAIM_REJECTED"
    | undefined;

  // 기본값: 최근 24시간
  const now = new Date();
  const defaultTo = now.toISOString();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const from = lastChangedFrom || defaultFrom;
  const to = lastChangedTo || defaultTo;

  try {
    const { getLastChangedOrders } = await import("../lib/naver/naver-orders.server");

    const result = await getLastChangedOrders({
      lastChangedFrom: from,
      lastChangedTo: to,
      lastChangedType,
    });

    if (!result.success) {
      return data({ success: false, error: result.error }, { status: 500 });
    }

    return data({
      success: true,
      orders: result.orders,
      count: result.orders?.length || 0,
      params: {
        lastChangedFrom: from,
        lastChangedTo: to,
        lastChangedType,
      },
    });
  } catch (error) {
    console.error("❌ 변경 주문 조회 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "변경 주문 조회 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (!actionType) {
    return data({ success: false, error: "action이 필요합니다" }, { status: 400 });
  }

  try {
    const orders = await import("../lib/naver/naver-orders.server");

    switch (actionType) {
      // ============ 발주 확인 (단건) ============
      case "place_order": {
        const productOrderId = formData.get("productOrderId") as string;
        if (!productOrderId) {
          return data({ success: false, error: "productOrderId가 필요합니다" }, { status: 400 });
        }

        const result = await orders.placeOrder({ productOrderId });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "발주 확인이 완료되었습니다",
          productOrderId,
        });
      }

      // ============ 발주 확인 (일괄) ============
      case "place_orders_bulk": {
        const productOrderIdsStr = formData.get("productOrderIds") as string;
        if (!productOrderIdsStr) {
          return data({ success: false, error: "productOrderIds가 필요합니다" }, { status: 400 });
        }

        let productOrderIds: string[];
        try {
          productOrderIds = JSON.parse(productOrderIdsStr);
        } catch {
          // 쉼표로 구분된 문자열도 지원
          productOrderIds = productOrderIdsStr.split(",").map((id) => id.trim());
        }

        if (!Array.isArray(productOrderIds) || productOrderIds.length === 0) {
          return data(
            { success: false, error: "productOrderIds는 배열이어야 합니다" },
            { status: 400 }
          );
        }

        const result = await orders.placeOrdersBulk(productOrderIds);

        return data({
          success: result.success,
          message: `발주 확인 완료: 성공 ${result.successCount}건, 실패 ${result.failCount}건`,
          successCount: result.successCount,
          failCount: result.failCount,
          errors: result.errors,
        });
      }

      default:
        return data(
          { success: false, error: `알 수 없는 액션입니다: ${actionType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ 주문 액션 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
