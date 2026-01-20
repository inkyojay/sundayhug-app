/**
 * 네이버 톡톡 설정 페이지
 *
 * 인증키 등록 및 봇 설정
 */

import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "react-router";
import { useEffect } from "react";
import { data, useLoaderData, useActionData } from "react-router";
import { Settings, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import { TalkTalkSettingsForm } from "../components/talktalk";
import type { TalkTalkSettings } from "../lib/talktalk/talktalk-types.server";

export const meta: MetaFunction = () => {
  return [{ title: "톡톡 설정 | 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { getTalkTalkSettings, testTalkTalkConnection } = await import(
    "../lib/talktalk"
  );

  const settings = await getTalkTalkSettings("default");
  const connectionTest = settings ? await testTalkTalkConnection("default") : null;

  // Webhook URL 생성 (현재 요청 URL 기반)
  const url = new URL(request.url);
  const webhookBaseUrl = `${url.protocol}//${url.host}`;

  return data({
    settings: settings
      ? {
          ...settings,
          authorization_key: settings.authorization_key
            ? `${settings.authorization_key.slice(0, 10)}...`
            : null,
        }
      : null,
    connected: !!settings?.authorization_key,
    connectionStatus: connectionTest,
    webhookBaseUrl,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { saveTalkTalkSettings, disconnectTalkTalk, testTalkTalkConnection } =
    await import("../lib/talktalk");

  // 연동 해제
  if (actionType === "disconnect") {
    const result = await disconnectTalkTalk("default");
    return data({
      success: result.success,
      message: result.success ? "톡톡 연동이 해제되었습니다." : undefined,
      error: result.error,
    });
  }

  // 연결 테스트
  if (actionType === "test") {
    const result = await testTalkTalkConnection("default");
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

    if (!authorizationKey) {
      return data({ success: false, error: "인증키는 필수입니다." }, { status: 400 });
    }

    const result = await saveTalkTalkSettings({
      accountId: "default",
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
}

export default function TalkTalkSettingsPage() {
  const { settings, connected, connectionStatus, webhookBaseUrl } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // 액션 결과 처리
  useEffect(() => {
    if (actionData) {
      if (actionData.success && actionData.message) {
        toast.success(actionData.message);
      } else if (actionData.error) {
        toast.error(actionData.error);
      }
    }
  }, [actionData]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/talktalk/chats">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            톡톡 설정
          </h1>
          <p className="text-muted-foreground mt-1">
            네이버 톡톡 챗봇 연동을 설정합니다.
          </p>
        </div>
      </div>

      {/* 연결 상태 */}
      {connectionStatus && (
        <div
          className={`p-4 rounded-lg ${
            connectionStatus.success
              ? "bg-green-500/10 text-green-600"
              : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {connectionStatus.message}
        </div>
      )}

      {/* 설정 폼 */}
      <TalkTalkSettingsForm
        settings={settings as Partial<TalkTalkSettings> | null}
        webhookBaseUrl={webhookBaseUrl}
      />
    </div>
  );
}
