/**
 * 톡톡 설정 폼 컴포넌트
 */

import { useState } from "react";
import { useFetcher } from "react-router";
import {
  Key,
  Link,
  Bot,
  MessageSquare,
  Zap,
  HeadphonesIcon,
  Loader2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Textarea } from "~/core/components/ui/textarea";
import { Label } from "~/core/components/ui/label";
import { Switch } from "~/core/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Separator } from "~/core/components/ui/separator";
import type { TalkTalkSettings } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkSettingsFormProps {
  settings: Partial<TalkTalkSettings> | null;
  webhookBaseUrl: string;
}

export function TalkTalkSettingsForm({
  settings,
  webhookBaseUrl,
}: TalkTalkSettingsFormProps) {
  const fetcher = useFetcher();
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    authorizationKey: "",
    webhookUrl: settings?.webhook_url || "",
    botName: settings?.bot_name || "",
    welcomeMessage: settings?.welcome_message || "",
    autoReplyEnabled: settings?.auto_reply_enabled || false,
    handoverEnabled: settings?.handover_enabled || false,
  });

  const isSubmitting = fetcher.state === "submitting";
  const webhookUrl = `${webhookBaseUrl}/api/talktalk/webhook`;

  const handleCopyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    fetcher.submit(
      {
        actionType: "save",
        authorizationKey: formData.authorizationKey,
        webhookUrl: formData.webhookUrl,
        botName: formData.botName,
        welcomeMessage: formData.welcomeMessage,
        autoReplyEnabled: String(formData.autoReplyEnabled),
        handoverEnabled: String(formData.handoverEnabled),
      },
      { method: "POST", action: "/integrations/talktalk/settings" }
    );
  };

  const handleDisconnect = () => {
    if (!confirm("정말 톡톡 연동을 해제하시겠습니까?")) return;

    fetcher.submit(
      { actionType: "disconnect" },
      { method: "POST", action: "/integrations/talktalk/settings" }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Webhook URL 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Webhook URL
          </CardTitle>
          <CardDescription>
            네이버 톡톡 파트너센터에서 아래 URL을 Webhook으로 등록하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyWebhookUrl}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <a
              href="https://partner.talk.naver.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              네이버 톡톡 파트너센터로 이동
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>

      {/* 인증 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            인증 설정
          </CardTitle>
          <CardDescription>
            파트너센터 &gt; 개발자도구 &gt; 챗봇API 설정에서 발급받은 인증키를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="authorizationKey">인증키 (Authorization)</Label>
            <Input
              id="authorizationKey"
              type="password"
              placeholder="ct_wc8b1i_Pb1AXDQ0RZWuCccpzdNL"
              value={formData.authorizationKey}
              onChange={(e) =>
                setFormData({ ...formData, authorizationKey: e.target.value })
              }
            />
            {settings?.authorization_key && (
              <p className="text-xs text-muted-foreground">
                현재 설정됨: {settings.authorization_key}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 봇 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            봇 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botName">봇 이름</Label>
            <Input
              id="botName"
              placeholder="예: 고객센터 봇"
              value={formData.botName}
              onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">환영 메시지</Label>
            <Textarea
              id="welcomeMessage"
              placeholder="안녕하세요! 무엇을 도와드릴까요?"
              value={formData.welcomeMessage}
              onChange={(e) =>
                setFormData({ ...formData, welcomeMessage: e.target.value })
              }
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              사용자가 채팅창에 진입했을 때 자동으로 발송됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 기능 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            기능 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                자동 응답
              </Label>
              <p className="text-xs text-muted-foreground">
                키워드 기반 자동 응답 및 환영 메시지 활성화
              </p>
            </div>
            <Switch
              checked={formData.autoReplyEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, autoReplyEnabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <HeadphonesIcon className="h-4 w-4" />
                상담원 전환 (Handover)
              </Label>
              <p className="text-xs text-muted-foreground">
                챗봇에서 상담원으로 대화 전환 기능 활성화
              </p>
            </div>
            <Switch
              checked={formData.handoverEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, handoverEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between">
        {settings?.authorization_key && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDisconnect}
            disabled={isSubmitting}
          >
            연동 해제
          </Button>
        )}
        <div className="flex-1" />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            "설정 저장"
          )}
        </Button>
      </div>
    </form>
  );
}
