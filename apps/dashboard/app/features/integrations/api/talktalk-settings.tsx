/**
 * 네이버 톡톡 설정 API
 *
 * GET: 설정 조회
 * POST: 설정 저장
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { data } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { getTalkTalkSettings, testTalkTalkConnection } = await import(
      "../lib/talktalk"
    );

    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId") || "default";

    const settings = await getTalkTalkSettings(accountId);
    const connectionTest = settings ? await testTalkTalkConnection(accountId) : null;

    return data({
      success: true,
      settings: settings
        ? {
            ...settings,
            // 인증키는 마스킹 처리
            authorization_key: settings.authorization_key
              ? `${settings.authorization_key.slice(0, 10)}...`
              : null,
          }
        : null,
      connected: !!settings?.authorization_key,
      connectionStatus: connectionTest,
    });
  } catch (error) {
    console.error("❌ 톡톡 설정 조회 실패:", error);
    return data({ success: false, error: "설정 조회에 실패했습니다" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType") as string;

    const { saveTalkTalkSettings, disconnectTalkTalk, testTalkTalkConnection } =
      await import("../lib/talktalk");

    // 연동 해제
    if (actionType === "disconnect") {
      const accountId = (formData.get("accountId") as string) || "default";
      const result = await disconnectTalkTalk(accountId);
      return data({
        success: result.success,
        message: result.success ? "톡톡 연동이 해제되었습니다." : undefined,
        error: result.error,
      });
    }

    // 연결 테스트
    if (actionType === "test") {
      const accountId = (formData.get("accountId") as string) || "default";
      const result = await testTalkTalkConnection(accountId);
      return data({
        success: result.success,
        message: result.message,
      });
    }

    // 설정 저장
    if (actionType === "save") {
      const authorizationKey = formData.get("authorizationKey") as string;
      const webhookUrl = formData.get("webhookUrl") as string;
      const botName = formData.get("botName") as string;
      const welcomeMessage = formData.get("welcomeMessage") as string;
      const autoReplyEnabled = formData.get("autoReplyEnabled") === "true";
      const handoverEnabled = formData.get("handoverEnabled") === "true";
      const accountId = (formData.get("accountId") as string) || "default";

      if (!authorizationKey) {
        return data({ success: false, error: "인증키는 필수입니다." }, { status: 400 });
      }

      const result = await saveTalkTalkSettings({
        accountId,
        authorizationKey,
        webhookUrl: webhookUrl || undefined,
        botName: botName || undefined,
        welcomeMessage: welcomeMessage || undefined,
        autoReplyEnabled,
        handoverEnabled,
      });

      return data({
        success: result.success,
        message: result.success ? "설정이 저장되었습니다." : undefined,
        error: result.error,
      });
    }

    return data({ success: false, error: "알 수 없는 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("❌ 톡톡 설정 저장 실패:", error);
    return data({ success: false, error: "설정 저장에 실패했습니다" }, { status: 500 });
  }
}
