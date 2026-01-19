/**
 * 네이버 정산 조회 API
 *
 * GET /api/integrations/naver/settlements
 *
 * 정산 내역 조회
 */
import { data } from "react-router";
import type { Route } from "./+types/naver-settlements";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // 쿼리 파라미터 추출
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  const settlementStatus = url.searchParams.get("settlementStatus") as
    | "SETTLEMENT_IN_PROGRESS"
    | "SETTLEMENT_DONE"
    | "SETTLEMENT_HOLD"
    | undefined;
  const page = url.searchParams.get("page")
    ? parseInt(url.searchParams.get("page")!)
    : undefined;
  const size = url.searchParams.get("size")
    ? parseInt(url.searchParams.get("size")!)
    : undefined;

  try {
    const { getSettlements } = await import("../lib/naver/naver-settlements.server");

    const result = await getSettlements({
      startDate,
      endDate,
      settlementStatus,
      page,
      size,
    });

    if (!result.success) {
      return data({ success: false, error: result.error }, { status: 500 });
    }

    return data({
      success: true,
      settlements: result.settlements,
      totalCount: result.totalCount,
      params: {
        startDate,
        endDate,
        settlementStatus,
        page,
        size,
      },
    });
  } catch (error) {
    console.error("❌ 정산 조회 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "정산 조회 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  try {
    switch (actionType) {
      case "get_detail": {
        const settlementTargetId = formData.get("settlementTargetId") as string;
        if (!settlementTargetId) {
          return data(
            { success: false, error: "settlementTargetId가 필요합니다" },
            { status: 400 }
          );
        }

        const { getSettlementDetail } = await import("../lib/naver/naver-settlements.server");
        const result = await getSettlementDetail(settlementTargetId);

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          settlement: result.settlement,
        });
      }

      case "get_expected": {
        const startDate = (formData.get("startDate") as string) || undefined;
        const endDate = (formData.get("endDate") as string) || undefined;

        const { getExpectedSettlements } = await import("../lib/naver/naver-settlements.server");
        const result = await getExpectedSettlements({ startDate, endDate });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          settlements: result.settlements,
          totalAmount: result.totalAmount,
        });
      }

      default:
        return data(
          {
            success: false,
            error: "알 수 없는 액션입니다. 지원: get_detail, get_expected",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ 정산 액션 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
