/**
 * 네이버 톡톡 메시지 발송 API
 *
 * POST: 대시보드에서 메시지 발송
 */

import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType") as string;
    const userId = formData.get("userId") as string;
    const accountId = (formData.get("accountId") as string) || "default";

    if (!userId) {
      return data({ success: false, error: "사용자 ID가 필요합니다." }, { status: 400 });
    }

    const {
      sendTextMessage,
      sendImageMessage,
      passToAgent,
      takeFromAgent,
      sendTypingOn,
      sendTypingOff,
      saveMessage,
      getChat,
      resetUnreadCount,
    } = await import("../lib/talktalk");

    // 텍스트 메시지 발송
    if (actionType === "sendText") {
      const text = formData.get("text") as string;

      if (!text) {
        return data({ success: false, error: "메시지 내용이 필요합니다." }, { status: 400 });
      }

      const result = await sendTextMessage(userId, text, { accountId });

      if (result.success) {
        // 발송 메시지를 DB에 저장
        const chat = await getChat(userId);
        if (chat) {
          await saveMessage(chat.id, userId, "outbound", "send", {
            textContent: { text },
          });
        }
      }

      return data({
        success: result.success,
        message: result.success ? "메시지가 발송되었습니다." : undefined,
        error: result.error,
      });
    }

    // 이미지 메시지 발송
    if (actionType === "sendImage") {
      const imageUrl = formData.get("imageUrl") as string;

      if (!imageUrl) {
        return data({ success: false, error: "이미지 URL이 필요합니다." }, { status: 400 });
      }

      const result = await sendImageMessage(userId, imageUrl, accountId);

      if (result.success) {
        const chat = await getChat(userId);
        if (chat) {
          await saveMessage(chat.id, userId, "outbound", "send", {
            imageContent: { imageUrl },
          });
        }
      }

      return data({
        success: result.success,
        message: result.success ? "이미지가 발송되었습니다." : undefined,
        error: result.error,
      });
    }

    // 상담원 전환 (passThread)
    if (actionType === "passToAgent") {
      // 먼저 상담원 연결 안내 메시지 발송
      await sendTextMessage(
        userId,
        "상담원에게 연결해 드리겠습니다. 잠시만 기다려 주세요.",
        { accountId }
      );

      const result = await passToAgent(userId, accountId);

      return data({
        success: result.success,
        message: result.success ? "상담원에게 전환되었습니다." : undefined,
        error: result.error,
      });
    }

    // 챗봇으로 복귀 (takeThread)
    if (actionType === "takeFromAgent") {
      const result = await takeFromAgent(userId, accountId);

      return data({
        success: result.success,
        message: result.success ? "챗봇으로 전환되었습니다." : undefined,
        error: result.error,
      });
    }

    // 타이핑 상태 표시
    if (actionType === "typingOn") {
      const result = await sendTypingOn(userId, accountId);
      return data({ success: result.success, error: result.error });
    }

    if (actionType === "typingOff") {
      const result = await sendTypingOff(userId, accountId);
      return data({ success: result.success, error: result.error });
    }

    // 읽음 처리
    if (actionType === "markAsRead") {
      await resetUnreadCount(userId);
      return data({ success: true, message: "읽음 처리되었습니다." });
    }

    return data({ success: false, error: "알 수 없는 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("❌ 메시지 발송 실패:", error);
    return data({ success: false, error: "메시지 발송에 실패했습니다" }, { status: 500 });
  }
}
