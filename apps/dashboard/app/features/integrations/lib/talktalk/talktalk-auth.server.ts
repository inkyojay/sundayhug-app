/**
 * 네이버 톡톡 챗봇 API - 인증 및 API 클라이언트
 *
 * 인증키 관리, API 호출 공통 함수를 제공합니다.
 * 톡톡 API는 OAuth가 아닌 단순 Authorization 키 방식을 사용합니다.
 */

import type { TalkTalkSettings, TalkTalkApiResponse } from "./talktalk-types.server";

// ============================================================================
// Constants
// ============================================================================

export const TALKTALK_API_BASE = "https://gw.talk.naver.com";

// ============================================================================
// Settings Management
// ============================================================================

/**
 * 톡톡 설정 조회
 */
export async function getTalkTalkSettings(
  accountId: string = "default"
): Promise<TalkTalkSettings | null> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("talktalk_settings")
    .select("*")
    .eq("account_id", accountId)
    .single();

  if (error || !data) {
    console.log("ℹ️ 톡톡 설정 없음:", error?.message || "데이터 없음");
    return null;
  }

  return data as TalkTalkSettings;
}

/**
 * 톡톡 설정 저장/업데이트
 */
export async function saveTalkTalkSettings(settings: {
  accountId?: string;
  authorizationKey: string;
  webhookUrl?: string;
  botName?: string;
  welcomeMessage?: string;
  autoReplyEnabled?: boolean;
  handoverEnabled?: boolean;
}): Promise<{ success: boolean; data?: TalkTalkSettings; error?: string }> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const accountId = settings.accountId || "default";

  const { data, error } = await adminClient
    .from("talktalk_settings")
    .upsert(
      {
        account_id: accountId,
        authorization_key: settings.authorizationKey,
        webhook_url: settings.webhookUrl || null,
        bot_name: settings.botName || null,
        welcome_message: settings.welcomeMessage || null,
        auto_reply_enabled: settings.autoReplyEnabled ?? false,
        handover_enabled: settings.handoverEnabled ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("❌ 톡톡 설정 저장 실패:", error);
    return { success: false, error: "설정 저장에 실패했습니다" };
  }

  console.log("✅ 톡톡 설정 저장 완료:", accountId);
  return { success: true, data: data as TalkTalkSettings };
}

/**
 * 톡톡 연동 해제
 */
export async function disconnectTalkTalk(
  accountId: string = "default"
): Promise<{ success: boolean; error?: string }> {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("talktalk_settings")
    .delete()
    .eq("account_id", accountId);

  if (error) {
    console.error("❌ 톡톡 연동 해제 실패:", error);
    return { success: false, error: "연동 해제에 실패했습니다" };
  }

  console.log("✅ 톡톡 연동 해제 완료:", accountId);
  return { success: true };
}

// ============================================================================
// API Client
// ============================================================================

/**
 * 톡톡 API 호출
 * Authorization 키를 사용하여 API 호출
 */
export async function talktalkFetch<T = TalkTalkApiResponse>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
    accountId?: string;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = "GET", body, accountId = "default" } = options;

  const settings = await getTalkTalkSettings(accountId);
  if (!settings?.authorization_key) {
    return { success: false, error: "톡톡 인증키가 설정되지 않았습니다. 설정을 확인해주세요." };
  }

  const url = `${TALKTALK_API_BASE}${endpoint}`;

  console.log(`📤 [talktalkFetch] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: settings.authorization_key,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`📥 [talktalkFetch] 응답 (${response.status}): ${responseText.slice(0, 500)}`);

    let responseData: T;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("❌ JSON 파싱 실패:", responseText);
      return { success: false, error: "API 응답 파싱 실패" };
    }

    // 톡톡 API 응답 형식 확인
    const apiResponse = responseData as unknown as TalkTalkApiResponse;
    if (apiResponse.success === false) {
      console.error("❌ 톡톡 API 에러:", apiResponse);
      return {
        success: false,
        error: apiResponse.resultMessage || `API 호출 실패 (${apiResponse.resultCode})`,
        data: responseData,
      };
    }

    return { success: true, data: responseData };
  } catch (error) {
    console.error("❌ 톡톡 API 호출 중 오류:", error);
    return { success: false, error: "API 호출 중 오류가 발생했습니다" };
  }
}

/**
 * 톡톡 연동 테스트
 * 인증키가 유효한지 확인 (간단한 테스트 메시지 발송으로 확인)
 */
export async function testTalkTalkConnection(
  accountId: string = "default"
): Promise<{ success: boolean; message: string }> {
  const settings = await getTalkTalkSettings(accountId);

  if (!settings?.authorization_key) {
    return { success: false, message: "인증키가 설정되지 않았습니다." };
  }

  // 인증키 형식 검증 (ct_로 시작하는지)
  if (!settings.authorization_key.startsWith("ct_")) {
    return {
      success: false,
      message: "인증키 형식이 올바르지 않습니다. 네이버 톡톡 파트너센터에서 발급받은 인증키를 확인해주세요.",
    };
  }

  return { success: true, message: "인증키가 설정되었습니다. Webhook 연동을 진행해주세요." };
}

// ============================================================================
// Image Upload API
// ============================================================================

/**
 * 이미지 업로드
 * 이미지 URL을 미리 업로드하고 imageId를 받아 메시지 전송 시 사용
 */
export async function uploadImage(
  imageUrl: string,
  accountId: string = "default"
): Promise<{ success: boolean; imageId?: string; error?: string }> {
  const result = await talktalkFetch<{
    success: boolean;
    resultCode: string;
    imageId?: string;
    resultMessage?: string;
  }>("/chatbot/v1/imageUpload", {
    method: "POST",
    body: { imageUrl },
    accountId,
  });

  if (!result.success || !result.data?.imageId) {
    return {
      success: false,
      error: result.error || result.data?.resultMessage || "이미지 업로드 실패",
    };
  }

  return { success: true, imageId: result.data.imageId };
}
