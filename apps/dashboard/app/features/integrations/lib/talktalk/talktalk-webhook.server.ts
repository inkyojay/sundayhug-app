/**
 * 네이버 톡톡 챗봇 API - Webhook 처리 모듈
 *
 * 사용자 이벤트 수신 및 처리:
 * - 채팅방 관리 (생성/업데이트)
 * - 메시지 저장
 * - 자동 응답 처리
 * - Handover 상태 관리
 */

import { getTalkTalkSettings } from "./talktalk-auth.server";
import { sendTextMessage } from "./talktalk-messages.server";
import type {
  TalkTalkEvent,
  OpenEvent,
  SendEvent,
  FriendEvent,
  LeaveEvent,
  EchoEvent,
  HandoverEvent,
  TalkTalkChat,
  TalkTalkMessage,
  TalkTalkAutoReply,
  ChatStatus,
  ThreadOwner,
  TextContent,
  CompositeContent,
} from "./talktalk-types.server";

// ============================================================================
// Chat Management
// ============================================================================

/**
 * 채팅방 upsert (생성 또는 업데이트)
 */
export async function upsertChat(
  userId: string,
  options?: {
    status?: ChatStatus;
    threadOwner?: ThreadOwner;
    isFriend?: boolean;
    lastMessagePreview?: string;
  }
): Promise<TalkTalkChat | null> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const now = new Date().toISOString();

  const { data, error } = await adminClient
    .from("talktalk_chats")
    .upsert(
      {
        user_id: userId,
        ...(options?.status && { status: options.status }),
        ...(options?.threadOwner && { thread_owner: options.threadOwner }),
        ...(options?.isFriend !== undefined && { is_friend: options.isFriend }),
        ...(options?.lastMessagePreview && { last_message_preview: options.lastMessagePreview }),
        last_message_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("❌ 채팅방 upsert 실패:", error);
    return null;
  }

  return data as TalkTalkChat;
}

/**
 * 채팅방 상태 업데이트
 */
export async function updateChatStatus(
  userId: string,
  status: ChatStatus,
  threadOwner?: ThreadOwner
): Promise<boolean> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("talktalk_chats")
    .update({
      status,
      ...(threadOwner && { thread_owner: threadOwner }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("❌ 채팅 상태 업데이트 실패:", error);
    return false;
  }

  return true;
}

/**
 * 채팅방 조회
 */
export async function getChat(userId: string): Promise<TalkTalkChat | null> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("talktalk_chats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data as TalkTalkChat;
}

/**
 * 안읽은 메시지 수 증가
 */
export async function incrementUnreadCount(userId: string): Promise<void> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  await adminClient.rpc("increment_talktalk_unread", { user_id_param: userId });
}

/**
 * 안읽은 메시지 수 초기화
 */
export async function resetUnreadCount(userId: string): Promise<void> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  await adminClient
    .from("talktalk_chats")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

// ============================================================================
// Message Management
// ============================================================================

/**
 * 메시지 저장
 */
export async function saveMessage(
  chatId: string,
  userId: string,
  direction: "inbound" | "outbound",
  eventType: string,
  content: Record<string, unknown>,
  options?: {
    messageType?: string;
    inputType?: string;
  }
): Promise<TalkTalkMessage | null> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("talktalk_messages")
    .insert({
      chat_id: chatId,
      user_id: userId,
      direction,
      event_type: eventType,
      message_type: options?.messageType || null,
      content,
      input_type: options?.inputType || null,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ 메시지 저장 실패:", error);
    return null;
  }

  return data as TalkTalkMessage;
}

/**
 * 채팅방의 메시지 목록 조회
 */
export async function getMessages(
  chatId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<TalkTalkMessage[]> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  let query = adminClient
    .from("talktalk_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ 메시지 조회 실패:", error);
    return [];
  }

  return data as TalkTalkMessage[];
}

// ============================================================================
// Auto Reply
// ============================================================================

/**
 * 활성화된 자동 응답 규칙 조회
 */
export async function getActiveAutoReplies(): Promise<TalkTalkAutoReply[]> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("talktalk_auto_replies")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (error) {
    console.error("❌ 자동 응답 규칙 조회 실패:", error);
    return [];
  }

  return data as TalkTalkAutoReply[];
}

/**
 * 자동 응답 처리
 * 메시지 내용에 매칭되는 자동 응답 규칙 찾기
 */
export async function processAutoReply(
  userId: string,
  message: string,
  triggerType: "keyword" | "open" | "friend"
): Promise<boolean> {
  const rules = await getActiveAutoReplies();

  for (const rule of rules) {
    if (rule.trigger_type !== triggerType) continue;

    let matched = false;

    if (triggerType === "keyword" && rule.trigger_value) {
      // 키워드 매칭 (쉼표로 구분된 키워드)
      const keywords = rule.trigger_value.split(",").map((k) => k.trim().toLowerCase());
      matched = keywords.some((k) => message.toLowerCase().includes(k));
    } else if (triggerType === "open" || triggerType === "friend") {
      // open, friend 이벤트는 trigger_value 없이 매칭
      matched = true;
    }

    if (matched) {
      // 매칭된 규칙의 응답 발송
      if (rule.response_type === "text") {
        const textContent = rule.response_content as TextContent;
        await sendTextMessage(userId, textContent.text);
      } else if (rule.response_type === "composite") {
        const { sendCompositeMessage } = await import("./talktalk-messages.server");
        const compositeContent = rule.response_content as CompositeContent;
        await sendCompositeMessage(userId, compositeContent.compositeList);
      }

      return true;
    }
  }

  return false;
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * open 이벤트 처리
 * 사용자가 채팅창에 진입했을 때
 */
export async function handleOpenEvent(
  event: OpenEvent,
  accountId: string = "default"
): Promise<Record<string, unknown> | null> {
  const { user, options } = event;

  console.log(`📥 [open] 사용자 입장: ${user}, 경로: ${options.inflow}`);

  // 채팅방 생성/업데이트
  const chat = await upsertChat(user, {
    status: "active",
    threadOwner: "bot",
    isFriend: options.friend,
  });

  if (!chat) {
    console.error("❌ 채팅방 생성 실패");
    return null;
  }

  // 설정에서 환영 메시지 확인
  const settings = await getTalkTalkSettings(accountId);

  if (settings?.welcome_message && settings.auto_reply_enabled) {
    // 환영 메시지 발송
    return {
      event: "send",
      textContent: { text: settings.welcome_message },
    };
  }

  // 자동 응답 규칙 확인 (open 트리거)
  if (settings?.auto_reply_enabled) {
    const replied = await processAutoReply(user, "", "open");
    if (replied) {
      return null; // 자동 응답이 비동기로 발송됨
    }
  }

  return null;
}

/**
 * send 이벤트 처리
 * 사용자가 메시지를 보냈을 때
 */
export async function handleSendEvent(
  event: SendEvent,
  accountId: string = "default"
): Promise<Record<string, unknown> | null> {
  const { user, textContent, imageContent, compositeContent, options } = event;

  console.log(`📥 [send] 메시지 수신: ${user}`);

  // 상담원 응대 중이면 챗봇은 응답하지 않음
  if (options?.standby) {
    console.log("ℹ️ 상담원 응대 중 - 챗봇 응답 스킵");
    return null;
  }

  // 채팅방 가져오기/생성
  let chat = await getChat(user);
  if (!chat) {
    chat = await upsertChat(user, { status: "active", threadOwner: "bot" });
  }

  if (!chat) {
    console.error("❌ 채팅방 조회/생성 실패");
    return null;
  }

  // 메시지 내용 추출
  let messagePreview = "";
  let messageType = "text";
  const content: Record<string, unknown> = {};

  if (textContent) {
    messagePreview = textContent.text.slice(0, 100);
    content.textContent = textContent;
  } else if (imageContent) {
    messagePreview = "[이미지]";
    messageType = "image";
    content.imageContent = imageContent;
  } else if (compositeContent) {
    messagePreview = "[복합 메시지]";
    messageType = "composite";
    content.compositeContent = compositeContent;
  }

  // 메시지 저장
  await saveMessage(chat.id, user, "inbound", "send", content, {
    messageType,
    inputType: textContent?.inputType,
  });

  // 채팅방 정보 업데이트
  await upsertChat(user, { lastMessagePreview: messagePreview });

  // 안읽은 메시지 수 증가
  await incrementUnreadCount(user);

  // 설정 확인
  const settings = await getTalkTalkSettings(accountId);

  // 자동 응답 처리
  if (settings?.auto_reply_enabled && textContent) {
    const replied = await processAutoReply(user, textContent.text, "keyword");
    if (replied) {
      return null; // 자동 응답이 비동기로 발송됨
    }
  }

  // 기본 응답 없음 (대시보드에서 수동 응답)
  return null;
}

/**
 * friend 이벤트 처리
 * 친구 추가/철회 시
 */
export async function handleFriendEvent(
  event: FriendEvent,
  accountId: string = "default"
): Promise<Record<string, unknown> | null> {
  const { user, options } = event;
  const isFriend = options.set === "on";

  console.log(`📥 [friend] 친구 ${isFriend ? "추가" : "철회"}: ${user}`);

  // 채팅방 업데이트
  await upsertChat(user, { isFriend });

  // 친구 추가 시 감사 메시지
  if (isFriend) {
    const settings = await getTalkTalkSettings(accountId);

    if (settings?.auto_reply_enabled) {
      const replied = await processAutoReply(user, "", "friend");
      if (replied) {
        return null;
      }

      // 기본 친구 추가 감사 메시지
      return {
        event: "send",
        textContent: { text: "친구가 되어주셔서 감사합니다! 무엇이든 물어보세요 😊" },
      };
    }
  }

  return null;
}

/**
 * leave 이벤트 처리
 * 사용자가 채팅방을 나갔을 때
 */
export async function handleLeaveEvent(event: LeaveEvent): Promise<null> {
  const { user } = event;

  console.log(`📥 [leave] 사용자 퇴장: ${user}`);

  // 채팅 상태를 completed로 변경
  await updateChatStatus(user, "completed");

  return null;
}

/**
 * echo 이벤트 처리
 * 메시지 발송 확인
 */
export async function handleEchoEvent(event: EchoEvent): Promise<null> {
  const { user, echoedEvent, textContent, imageContent, compositeContent } = event;

  console.log(`📥 [echo] 메시지 에코: ${user}, 원본 이벤트: ${echoedEvent}`);

  // 발송한 메시지를 DB에 저장
  const chat = await getChat(user);
  if (chat) {
    let messageType = "text";
    const content: Record<string, unknown> = {};

    if (textContent) {
      content.textContent = textContent;
    } else if (imageContent) {
      messageType = "image";
      content.imageContent = imageContent;
    } else if (compositeContent) {
      messageType = "composite";
      content.compositeContent = compositeContent;
    }

    await saveMessage(chat.id, user, "outbound", echoedEvent, content, { messageType });
  }

  return null;
}

/**
 * handover 이벤트 처리
 * 대화 주도권 변경 시
 */
export async function handleHandoverEvent(event: HandoverEvent): Promise<null> {
  const { user, options } = event;

  console.log(`📥 [handover] 주도권 변경: ${user}, owner: ${options.threadOwnerId}`);

  // 상태 업데이트
  const isBot = options.threadOwnerId === "bot" || !options.standby;
  await updateChatStatus(user, isBot ? "active" : "handover", isBot ? "bot" : "agent");

  return null;
}

// ============================================================================
// Main Event Router
// ============================================================================

/**
 * Webhook 이벤트 라우터
 * 이벤트 타입에 따라 적절한 핸들러 호출
 */
export async function routeWebhookEvent(
  event: TalkTalkEvent,
  accountId: string = "default"
): Promise<Record<string, unknown> | null> {
  switch (event.event) {
    case "open":
      return handleOpenEvent(event as OpenEvent, accountId);

    case "send":
      return handleSendEvent(event as SendEvent, accountId);

    case "friend":
      return handleFriendEvent(event as FriendEvent, accountId);

    case "leave":
      return handleLeaveEvent(event as LeaveEvent);

    case "echo":
      return handleEchoEvent(event as EchoEvent);

    case "handover":
      return handleHandoverEvent(event as HandoverEvent);

    default:
      console.log(`ℹ️ 처리되지 않은 이벤트: ${event.event}`);
      return null;
  }
}
