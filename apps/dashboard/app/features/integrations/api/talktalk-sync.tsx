/**
 * 네이버 톡톡 채팅 동기화 API
 *
 * GET: 채팅 목록 조회
 * POST: 자동 응답 규칙 관리
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { data } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // active, handover, completed
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50");

    // 채팅 목록 조회
    let query = adminClient
      .from("talktalk_chats")
      .select("*", { count: "exact" })
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`user_id.ilike.%${search}%,last_message_preview.ilike.%${search}%`);
    }

    // 페이지네이션
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: chats, error: chatsError, count } = await query;

    if (chatsError) {
      console.error("❌ 채팅 목록 조회 실패:", chatsError);
      return data({ success: false, error: "채팅 목록 조회에 실패했습니다" }, { status: 500 });
    }

    // 통계 조회
    const { data: statsData } = await adminClient.from("talktalk_chats").select("status, unread_count");

    const stats = {
      total: statsData?.length || 0,
      active: statsData?.filter((c) => c.status === "active").length || 0,
      handover: statsData?.filter((c) => c.status === "handover").length || 0,
      completed: statsData?.filter((c) => c.status === "completed").length || 0,
      unread: statsData?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0,
    };

    return data({
      success: true,
      chats: chats || [],
      stats,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("❌ 채팅 동기화 실패:", error);
    return data({ success: false, error: "채팅 동기화에 실패했습니다" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType") as string;

    const { createAdminClient } = await import("~/core/lib/supa-admin.server");
    const adminClient = createAdminClient();

    // 자동 응답 규칙 생성
    if (actionType === "createAutoReply") {
      const triggerType = formData.get("triggerType") as string;
      const triggerValue = formData.get("triggerValue") as string;
      const responseType = formData.get("responseType") as string;
      const responseContent = formData.get("responseContent") as string;
      const priority = parseInt(formData.get("priority") as string) || 0;

      if (!triggerType || !responseType || !responseContent) {
        return data({ success: false, error: "필수 필드가 누락되었습니다." }, { status: 400 });
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(responseContent);
      } catch {
        // 텍스트 응답인 경우
        parsedContent = { text: responseContent };
      }

      const { error } = await adminClient.from("talktalk_auto_replies").insert({
        trigger_type: triggerType,
        trigger_value: triggerValue || null,
        response_type: responseType,
        response_content: parsedContent,
        priority,
        is_active: true,
      });

      if (error) {
        console.error("❌ 자동 응답 규칙 생성 실패:", error);
        return data({ success: false, error: "규칙 생성에 실패했습니다" }, { status: 500 });
      }

      return data({ success: true, message: "자동 응답 규칙이 생성되었습니다." });
    }

    // 자동 응답 규칙 수정
    if (actionType === "updateAutoReply") {
      const id = formData.get("id") as string;
      const triggerType = formData.get("triggerType") as string;
      const triggerValue = formData.get("triggerValue") as string;
      const responseType = formData.get("responseType") as string;
      const responseContent = formData.get("responseContent") as string;
      const priority = parseInt(formData.get("priority") as string) || 0;
      const isActive = formData.get("isActive") === "true";

      if (!id) {
        return data({ success: false, error: "규칙 ID가 필요합니다." }, { status: 400 });
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(responseContent);
      } catch {
        parsedContent = { text: responseContent };
      }

      const { error } = await adminClient
        .from("talktalk_auto_replies")
        .update({
          trigger_type: triggerType,
          trigger_value: triggerValue || null,
          response_type: responseType,
          response_content: parsedContent,
          priority,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("❌ 자동 응답 규칙 수정 실패:", error);
        return data({ success: false, error: "규칙 수정에 실패했습니다" }, { status: 500 });
      }

      return data({ success: true, message: "자동 응답 규칙이 수정되었습니다." });
    }

    // 자동 응답 규칙 삭제
    if (actionType === "deleteAutoReply") {
      const id = formData.get("id") as string;

      if (!id) {
        return data({ success: false, error: "규칙 ID가 필요합니다." }, { status: 400 });
      }

      const { error } = await adminClient.from("talktalk_auto_replies").delete().eq("id", id);

      if (error) {
        console.error("❌ 자동 응답 규칙 삭제 실패:", error);
        return data({ success: false, error: "규칙 삭제에 실패했습니다" }, { status: 500 });
      }

      return data({ success: true, message: "자동 응답 규칙이 삭제되었습니다." });
    }

    // 채팅 메시지 조회
    if (actionType === "getMessages") {
      const chatId = formData.get("chatId") as string;

      if (!chatId) {
        return data({ success: false, error: "채팅 ID가 필요합니다." }, { status: 400 });
      }

      const { data: messages, error } = await adminClient
        .from("talktalk_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ 메시지 조회 실패:", error);
        return data({ success: false, error: "메시지 조회에 실패했습니다" }, { status: 500 });
      }

      return data({ success: true, messages: messages || [] });
    }

    // 채팅 상태 변경
    if (actionType === "updateChatStatus") {
      const chatId = formData.get("chatId") as string;
      const status = formData.get("status") as string;

      if (!chatId || !status) {
        return data({ success: false, error: "필수 필드가 누락되었습니다." }, { status: 400 });
      }

      const { error } = await adminClient
        .from("talktalk_chats")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", chatId);

      if (error) {
        console.error("❌ 채팅 상태 변경 실패:", error);
        return data({ success: false, error: "상태 변경에 실패했습니다" }, { status: 500 });
      }

      return data({ success: true, message: "채팅 상태가 변경되었습니다." });
    }

    return data({ success: false, error: "알 수 없는 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("❌ 동기화 액션 실패:", error);
    return data({ success: false, error: "작업에 실패했습니다" }, { status: 500 });
  }
}
