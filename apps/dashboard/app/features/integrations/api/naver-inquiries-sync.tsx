/**
 * 네이버 문의 동기화 API
 *
 * POST: 네이버 API에서 문의를 가져와 DB에 동기화
 * GET: 템플릿 목록 조회
 */
import type { Route } from "./+types/naver-inquiries-sync";

import { data } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "templates") {
    // 템플릿 목록 조회
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    const { data: templates, error } = await adminClient
      .from("naver_inquiry_templates")
      .select("*")
      .eq("is_active", true)
      .order("use_count", { ascending: false });

    if (error) {
      return data({ success: false, error: error.message });
    }

    return data({ success: true, templates });
  }

  if (action === "stats") {
    // DB에서 통계 조회
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    const { data: inquiries, error } = await adminClient
      .from("naver_inquiries")
      .select("inquiry_status")
      .gte("create_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      return data({ success: false, error: error.message });
    }

    const stats = {
      total: inquiries?.length || 0,
      waiting: inquiries?.filter((i) => i.inquiry_status === "WAITING").length || 0,
      answered: inquiries?.filter((i) => i.inquiry_status === "ANSWERED").length || 0,
      holding: inquiries?.filter((i) => i.inquiry_status === "HOLDING").length || 0,
    };

    return data({ success: true, stats });
  }

  return data({ success: false, error: "Invalid action" });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    if (actionType === "sync") {
      // 네이버 API에서 문의 가져오기
      const { getNaverToken } = await import("../lib/naver.server");
      const { getInquiries } = await import("../lib/naver/naver-inquiries.server");
      const { createAdminClient } = await import("~/core/lib/supa-admin.server");

      const token = await getNaverToken();
      if (!token) {
        return data({ success: false, error: "네이버 연동이 필요합니다." });
      }

      // 최근 30일 문의 조회
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await getInquiries({
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        size: 500,
      });

      if (!result.success) {
        return data({ success: false, error: result.error });
      }

      const inquiries = result.inquiries || [];
      const adminClient = createAdminClient();

      // DB에 upsert
      let syncedCount = 0;
      for (const inquiry of inquiries) {
        const { error } = await adminClient.from("naver_inquiries").upsert(
          {
            inquiry_no: inquiry.inquiryNo,
            inquiry_type_name: inquiry.inquiryTypeName,
            inquiry_status: inquiry.inquiryStatus,
            title: inquiry.title,
            content: inquiry.content,
            product_no: inquiry.productNo,
            product_name: inquiry.productName,
            product_order_id: inquiry.productOrderId,
            buyer_member_id: inquiry.buyerMemberId,
            create_date: inquiry.createDate,
            answer_content: inquiry.answerContent,
            answer_date: inquiry.answerDate,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "inquiry_no" }
        );

        if (!error) {
          syncedCount++;
        }
      }

      return data({
        success: true,
        message: `${syncedCount}건의 문의가 동기화되었습니다.`,
        syncedCount,
        totalCount: inquiries.length,
      });
    }

    if (actionType === "use_template") {
      // 템플릿 사용 횟수 증가
      const templateId = formData.get("templateId") as string;

      if (!templateId) {
        return data({ success: false, error: "템플릿 ID가 필요합니다." });
      }

      const { createAdminClient } = await import("~/core/lib/supa-admin.server");
      const adminClient = createAdminClient();

      const { error } = await adminClient.rpc("increment_template_use_count", {
        template_id: templateId,
      });

      // RPC가 없으면 직접 업데이트
      if (error) {
        await adminClient
          .from("naver_inquiry_templates")
          .update({ use_count: adminClient.sql`use_count + 1` })
          .eq("id", templateId);
      }

      return data({ success: true });
    }

    if (actionType === "save_template") {
      // 새 템플릿 저장
      const name = formData.get("name") as string;
      const content = formData.get("content") as string;
      const category = (formData.get("category") as string) || "general";

      if (!name || !content) {
        return data({ success: false, error: "이름과 내용을 입력해주세요." });
      }

      const { createAdminClient } = await import("~/core/lib/supa-admin.server");
      const adminClient = createAdminClient();

      const { data: template, error } = await adminClient
        .from("naver_inquiry_templates")
        .insert({ name, content, category })
        .select()
        .single();

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 저장되었습니다.", template });
    }

    if (actionType === "delete_template") {
      const templateId = formData.get("templateId") as string;

      if (!templateId) {
        return data({ success: false, error: "템플릿 ID가 필요합니다." });
      }

      const { createAdminClient } = await import("~/core/lib/supa-admin.server");
      const adminClient = createAdminClient();

      const { error } = await adminClient
        .from("naver_inquiry_templates")
        .delete()
        .eq("id", templateId);

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 삭제되었습니다." });
    }

    return data({ success: false, error: "알 수 없는 액션입니다." });
  } catch (error) {
    console.error("❌ 문의 동기화 API 오류:", error);
    return data({
      success: false,
      error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.",
    });
  }
}
