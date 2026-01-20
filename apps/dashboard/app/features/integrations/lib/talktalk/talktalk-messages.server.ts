/**
 * 네이버 톡톡 챗봇 API - 메시지 발송 모듈
 *
 * 다양한 형식의 메시지를 사용자에게 발송합니다.
 * - 텍스트 메시지
 * - 이미지 메시지
 * - 복합 메시지 (카드, 버튼, 목록)
 * - 퀵 버튼
 */

import { talktalkFetch } from "./talktalk-auth.server";
import type {
  TalkTalkApiResponse,
  TextContent,
  ImageContent,
  CompositeContent,
  QuickReply,
  Button,
  CompositeItem,
} from "./talktalk-types.server";

// ============================================================================
// 텍스트 메시지
// ============================================================================

/**
 * 텍스트 메시지 발송
 * @param user 사용자 ID
 * @param text 메시지 내용 (최대 1만자)
 * @param options 추가 옵션
 */
export async function sendTextMessage(
  user: string,
  text: string,
  options?: {
    code?: string;
    quickReply?: QuickReply;
    accountId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const textContent: TextContent = {
    text,
    ...(options?.code && { code: options.code }),
    ...(options?.quickReply && { quickReply: options.quickReply }),
  };

  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "send",
      user,
      textContent,
    },
    accountId: options?.accountId,
  });

  return { success: result.success, error: result.error };
}

/**
 * 퀵 버튼이 있는 텍스트 메시지 발송
 */
export async function sendTextWithQuickReply(
  user: string,
  text: string,
  buttons: Button[],
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  return sendTextMessage(user, text, {
    quickReply: { buttonList: buttons as QuickReply["buttonList"] },
    accountId,
  });
}

// ============================================================================
// 이미지 메시지
// ============================================================================

/**
 * 이미지 메시지 발송
 * @param user 사용자 ID
 * @param imageUrl 이미지 URL (외부 접근 가능해야 함)
 * @param accountId 계정 ID
 */
export async function sendImageMessage(
  user: string,
  imageUrl: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const imageContent: ImageContent = { imageUrl };

  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "send",
      user,
      imageContent,
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

/**
 * 미리 업로드한 이미지 ID로 메시지 발송
 */
export async function sendImageById(
  user: string,
  imageId: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const imageContent: ImageContent = { imageId };

  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "send",
      user,
      imageContent,
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

// ============================================================================
// 복합 메시지 (Composite)
// ============================================================================

/**
 * 복합 메시지 발송
 * 카드 형태로 이미지, 텍스트, 버튼을 함께 표시
 */
export async function sendCompositeMessage(
  user: string,
  compositeList: CompositeItem[],
  options?: {
    quickReply?: QuickReply;
    accountId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const compositeContent: CompositeContent = { compositeList };

  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "send",
      user,
      compositeContent,
      ...(options?.quickReply && { quickReply: options.quickReply }),
    },
    accountId: options?.accountId,
  });

  return { success: result.success, error: result.error };
}

/**
 * 단일 카드 메시지 발송 (헬퍼)
 */
export async function sendCardMessage(
  user: string,
  card: {
    title?: string;
    description?: string;
    imageUrl?: string;
    buttons?: Button[];
  },
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const compositeItem: CompositeItem = {
    ...(card.title && { title: card.title }),
    ...(card.description && { description: card.description }),
    ...(card.imageUrl && { image: { imageUrl: card.imageUrl } }),
    ...(card.buttons && { buttonList: card.buttons }),
  };

  return sendCompositeMessage(user, [compositeItem], { accountId });
}

// ============================================================================
// 액션 이벤트
// ============================================================================

/**
 * 타이핑 상태 표시
 * 메시지 처리 중임을 사용자에게 알림
 */
export async function sendTypingOn(
  user: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "action",
      user,
      options: { action: "typingOn" },
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

/**
 * 타이핑 상태 해제
 */
export async function sendTypingOff(
  user: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "action",
      user,
      options: { action: "typingOff" },
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

// ============================================================================
// Handover 관련
// ============================================================================

/**
 * 상담원에게 대화 주도권 전달
 * 챗봇 → 상담원 전환
 */
export async function passToAgent(
  user: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "passThread",
      user,
      options: { standby: true },
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

/**
 * 챗봇이 대화 주도권 가져오기
 * 상담원 → 챗봇 전환
 */
export async function takeFromAgent(
  user: string,
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "takeThread",
      user,
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

// ============================================================================
// 상품 메시지 (스마트스토어 연동)
// ============================================================================

/**
 * 스마트스토어 상품 메시지 발송
 * @param user 사용자 ID
 * @param productIds 상품 번호 배열 (single: 최대 15개, list: 최대 4개)
 * @param displayType 표시 방식
 */
export async function sendProductMessage(
  user: string,
  productIds: number[],
  displayType: "single" | "list" = "single",
  accountId?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await talktalkFetch<TalkTalkApiResponse>("/chatbot/v1/event", {
    method: "POST",
    body: {
      event: "product",
      user,
      options: {
        ids: productIds,
        displayType,
      },
    },
    accountId,
  });

  return { success: result.success, error: result.error };
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 텍스트 버튼 생성 헬퍼
 */
export function createTextButton(title: string, code: string): Button {
  return {
    type: "TEXT",
    data: { title, code },
  };
}

/**
 * 링크 버튼 생성 헬퍼
 */
export function createLinkButton(
  title: string,
  url: string,
  mobileUrl?: string
): Button {
  return {
    type: "LINK",
    data: { title, url, ...(mobileUrl && { mobileUrl }) },
  };
}

/**
 * 옵션 버튼 생성 헬퍼
 */
export function createOptionButton(
  title: string,
  buttonList: Button[]
): Button {
  return {
    type: "OPTION",
    data: { title, buttonList: buttonList as any },
  };
}
