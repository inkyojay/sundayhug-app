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
  const type = url.searchParams.get("type") || "customer"; // customer | product
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
    if (type === "product") {
      // 상품 문의 조회
      const { getProductQnas } = await import("../lib/naver/naver-inquiries.server");

      const result = await getProductQnas({
        fromDate: startDate,
        toDate: endDate,
        answered,
        page,
        size,
      });

      if (!result.success) {
        return data({ success: false, error: result.error }, { status: 500 });
      }

      return data({
        success: true,
        type: "product",
        qnas: result.qnas,
        totalCount: result.totalCount,
        params: { startDate, endDate, answered, page, size },
      });
    } else {
      // 고객 문의 조회
      const { getCustomerInquiries } = await import("../lib/naver/naver-inquiries.server");

      const result = await getCustomerInquiries({
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
        type: "customer",
        inquiries: result.inquiries,
        totalCount: result.totalCount,
        params: { startDate, endDate, inquiryStatus, answered, page, size },
      });
    }
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
      // 고객 문의 답변 등록
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
          answerContentId: result.answerContentId,
        });
      }

      // 고객 문의 답변 수정
      case "update_answer": {
        const inquiryNo = formData.get("inquiryNo");
        const answerContent = formData.get("answerContent") as string;
        const answerContentId = formData.get("answerContentId");

        if (!inquiryNo) {
          return data({ success: false, error: "inquiryNo가 필요합니다" }, { status: 400 });
        }
        if (!answerContent || answerContent.trim().length === 0) {
          return data({ success: false, error: "answerContent가 필요합니다" }, { status: 400 });
        }
        if (!answerContentId) {
          return data({ success: false, error: "answerContentId가 필요합니다" }, { status: 400 });
        }

        const { updateInquiryAnswer } = await import("../lib/naver/naver-inquiries.server");
        const result = await updateInquiryAnswer({
          inquiryNo: Number(inquiryNo),
          answerContent,
          answerContentId: Number(answerContentId),
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

      // 상품 문의 답변 (등록/수정 모두)
      case "answer_product_qna": {
        const questionId = formData.get("questionId");
        const commentContent = formData.get("commentContent") as string;

        if (!questionId) {
          return data({ success: false, error: "questionId가 필요합니다" }, { status: 400 });
        }
        if (!commentContent || commentContent.trim().length === 0) {
          return data({ success: false, error: "commentContent가 필요합니다" }, { status: 400 });
        }

        const { answerProductQna } = await import("../lib/naver/naver-inquiries.server");
        const result = await answerProductQna({
          questionId: Number(questionId),
          commentContent,
        });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "답변이 등록되었습니다",
          questionId: Number(questionId),
        });
      }

      // 미답변 고객 문의 개수
      case "get_unanswered_count": {
        const { getUnansweredCustomerInquiryCount, getUnansweredProductQnaCount } = await import("../lib/naver/naver-inquiries.server");

        const [customerResult, productResult] = await Promise.all([
          getUnansweredCustomerInquiryCount(),
          getUnansweredProductQnaCount(),
        ]);

        const customerCount = customerResult.success ? (customerResult.count ?? 0) : 0;
        const productQnaCount = productResult.success ? (productResult.count ?? 0) : 0;

        return data({
          success: true,
          customerCount,
          productQnaCount,
          totalCount: customerCount + productQnaCount,
        });
      }

      default:
        return data(
          {
            success: false,
            error: "알 수 없는 액션입니다. 지원: answer, update_answer, answer_product_qna, get_unanswered_count",
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
