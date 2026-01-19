/**
 * 네이버 클레임 처리 API
 *
 * POST /api/integrations/naver/claims/action
 *
 * 취소/반품/교환 클레임에 대한 승인/거부/보류 처리
 */
import { data } from "react-router";
import type { Route } from "./+types/naver-claims-action";

export async function loader({ request }: Route.LoaderArgs) {
  return data({
    message: "POST 요청으로 클레임 처리를 진행하세요",
    supportedActions: {
      cancel: ["approve_cancel", "reject_cancel", "withdraw_cancel"],
      return: [
        "approve_return",
        "reject_return",
        "hold_return",
        "release_return_hold",
        "withdraw_return",
      ],
      exchange: [
        "collect_exchange",
        "dispatch_exchange",
        "hold_exchange",
        "release_exchange_hold",
        "reject_exchange",
        "withdraw_exchange",
      ],
    },
    requiredParams: {
      common: ["action", "productOrderId"],
      reject: ["rejectReason"],
      hold: ["holdReason"],
      dispatch: ["deliveryCompanyCode", "trackingNumber"],
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;
  const productOrderId = formData.get("productOrderId") as string;

  // 필수 파라미터 검증
  if (!actionType) {
    return data({ success: false, error: "action이 필요합니다" }, { status: 400 });
  }

  if (!productOrderId) {
    return data({ success: false, error: "productOrderId가 필요합니다" }, { status: 400 });
  }

  try {
    // 클레임 모듈 동적 import
    const claims = await import("../lib/naver/naver-claims.server");

    let result: { success: boolean; error?: string };

    switch (actionType) {
      // ============ 취소 처리 ============
      case "approve_cancel":
        result = await claims.approveCancelClaim({
          productOrderId,
          memo: (formData.get("memo") as string) || undefined,
        });
        break;

      case "reject_cancel": {
        const rejectReason = formData.get("rejectReason") as string;
        if (!rejectReason) {
          return data({ success: false, error: "rejectReason이 필요합니다" }, { status: 400 });
        }
        result = await claims.rejectCancelClaim({
          productOrderId,
          rejectReason,
          rejectDetailedReason: (formData.get("rejectDetailedReason") as string) || undefined,
        });
        break;
      }

      case "withdraw_cancel":
        result = await claims.withdrawCancelClaim({ productOrderId });
        break;

      // ============ 반품 처리 ============
      case "approve_return":
        result = await claims.approveReturnClaim({
          productOrderId,
          memo: (formData.get("memo") as string) || undefined,
        });
        break;

      case "reject_return": {
        const rejectReason = formData.get("rejectReason") as string;
        if (!rejectReason) {
          return data({ success: false, error: "rejectReason이 필요합니다" }, { status: 400 });
        }
        result = await claims.rejectReturnClaim({
          productOrderId,
          rejectReason,
          rejectDetailedReason: (formData.get("rejectDetailedReason") as string) || undefined,
        });
        break;
      }

      case "hold_return": {
        const holdReason = formData.get("holdReason") as string;
        if (!holdReason) {
          return data({ success: false, error: "holdReason이 필요합니다" }, { status: 400 });
        }
        result = await claims.holdReturnClaim({
          productOrderId,
          holdReason,
          holdDetailedReason: (formData.get("holdDetailedReason") as string) || undefined,
        });
        break;
      }

      case "release_return_hold":
        result = await claims.releaseReturnClaimHold(productOrderId);
        break;

      case "withdraw_return":
        result = await claims.withdrawReturnClaim({ productOrderId });
        break;

      // ============ 교환 처리 ============
      case "collect_exchange":
        result = await claims.completeExchangeCollect(productOrderId);
        break;

      case "dispatch_exchange": {
        const deliveryCompanyCode = formData.get("deliveryCompanyCode") as string;
        const trackingNumber = formData.get("trackingNumber") as string;
        if (!deliveryCompanyCode || !trackingNumber) {
          return data(
            { success: false, error: "deliveryCompanyCode와 trackingNumber가 필요합니다" },
            { status: 400 }
          );
        }
        result = await claims.dispatchExchange({
          productOrderId,
          deliveryCompanyCode,
          trackingNumber,
          dispatchDate: (formData.get("dispatchDate") as string) || undefined,
        });
        break;
      }

      case "hold_exchange": {
        const holdReason = formData.get("holdReason") as string;
        if (!holdReason) {
          return data({ success: false, error: "holdReason이 필요합니다" }, { status: 400 });
        }
        result = await claims.holdExchangeClaim({
          productOrderId,
          holdReason,
          holdDetailedReason: (formData.get("holdDetailedReason") as string) || undefined,
        });
        break;
      }

      case "release_exchange_hold":
        result = await claims.releaseExchangeClaimHold(productOrderId);
        break;

      case "reject_exchange": {
        const rejectReason = formData.get("rejectReason") as string;
        if (!rejectReason) {
          return data({ success: false, error: "rejectReason이 필요합니다" }, { status: 400 });
        }
        result = await claims.rejectExchangeClaim({
          productOrderId,
          rejectReason,
          rejectDetailedReason: (formData.get("rejectDetailedReason") as string) || undefined,
        });
        break;
      }

      case "withdraw_exchange":
        result = await claims.withdrawExchangeClaim({ productOrderId });
        break;

      default:
        return data({ success: false, error: `알 수 없는 액션입니다: ${actionType}` }, { status: 400 });
    }

    if (!result.success) {
      return data({ success: false, error: result.error }, { status: 500 });
    }

    return data({
      success: true,
      message: `${actionType} 처리가 완료되었습니다`,
      productOrderId,
    });
  } catch (error) {
    console.error("❌ 클레임 처리 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
