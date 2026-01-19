/**
 * 네이버 문의 관리 API
 *
 * GET /api/integrations/naver/inquiries - 문의 목록 조회
 * POST /api/integrations/naver/inquiries - 문의 답변/수정
 */
import { data } from "react-router";
import type { Route } from "./+types/naver-inquiries";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // 쿼리 파라미터 추출
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  const inquiryStatus = url.searchParams.get("inquiryStatus") as
    | "WAITING"
    | "ANSWERED"
    | "HOLDING"
    | undefined;
  const answered = url.searchParams.has("answered")
    ? url.searchParams.get("answered") === "true"
    : undefined;
  const page = url.searchParams.get("page")
    ? parseInt(url.searchParams.get("page")!)
    : undefined;
  const size = url.searchParams.get("size")
    ? parseInt(url.searchParams.get("size")!)
    : undefined;

  try {
    const { getInquiries } = await import("../lib/naver/naver-inquiries.server");

    const result = await getInquiries({
      startDate,
      endDate,
      inquiryStatus,
      answered,
      page,
      size,
    });

    if (!result.success) {
      return data({ success: false, error: result.error }, { status: 500 });
    }

    return data({
      success: true,
      inquiries: result.inquiries,
      totalCount: result.totalCount,
      params: {
        startDate,
        endDate,
        inquiryStatus,
        answered,
        page,
        size,
      },
    });
  } catch (error) {
    console.error("❌ 문의 조회 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "문의 조회 중 오류가 발생했습니다",
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
        const inquiryNo = formData.get("inquiryNo");
        if (!inquiryNo) {
          return data({ success: false, error: "inquiryNo가 필요합니다" }, { status: 400 });
        }

        const { getInquiryDetail } = await import("../lib/naver/naver-inquiries.server");
        const result = await getInquiryDetail(Number(inquiryNo));

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          inquiry: result.inquiry,
        });
      }

      case "answer": {
        const inquiryNo = formData.get("inquiryNo");
        const answerContent = formData.get("answerContent") as string;

        if (!inquiryNo) {
          return data({ success: false, error: "inquiryNo가 필요합니다" }, { status: 400 });
        }
        if (!answerContent || answerContent.trim().length === 0) {
          return data({ success: false, error: "answerContent가 필요합니다" }, { status: 400 });
        }

        const { answerInquiry } = await import("../lib/naver/naver-inquiries.server");
        const result = await answerInquiry({
          inquiryNo: Number(inquiryNo),
          answerContent,
        });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "답변이 등록되었습니다",
          inquiryNo: Number(inquiryNo),
        });
      }

      case "update_answer": {
        const inquiryNo = formData.get("inquiryNo");
        const answerContent = formData.get("answerContent") as string;

        if (!inquiryNo) {
          return data({ success: false, error: "inquiryNo가 필요합니다" }, { status: 400 });
        }
        if (!answerContent || answerContent.trim().length === 0) {
          return data({ success: false, error: "answerContent가 필요합니다" }, { status: 400 });
        }

        const { updateInquiryAnswer } = await import("../lib/naver/naver-inquiries.server");
        const result = await updateInquiryAnswer({
          inquiryNo: Number(inquiryNo),
          answerContent,
        });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "답변이 수정되었습니다",
          inquiryNo: Number(inquiryNo),
        });
      }

      case "get_unanswered_count": {
        const { getUnansweredInquiryCount } = await import("../lib/naver/naver-inquiries.server");
        const result = await getUnansweredInquiryCount();

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          count: result.count,
        });
      }

      default:
        return data(
          {
            success: false,
            error: "알 수 없는 액션입니다. 지원: get_detail, answer, update_answer, get_unanswered_count",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ 문의 액션 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
