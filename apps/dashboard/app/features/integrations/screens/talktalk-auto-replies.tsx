/**
 * 네이버 톡톡 자동 응답 관리 페이지
 */

import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useState, useEffect } from "react";
import { data, useLoaderData, useRevalidator } from "react-router";
import { Zap, Plus, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import { TalkTalkAutoReplyList, TalkTalkAutoReplyDialog } from "../components/talktalk";
import type { TalkTalkAutoReply } from "../lib/talktalk/talktalk-types.server";

export const meta: MetaFunction = () => {
  return [{ title: "자동 응답 관리 | 톡톡 | 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 자동 응답 규칙 조회
  const { data: rules, error } = await adminClient
    .from("talktalk_auto_replies")
    .select("*")
    .order("priority", { ascending: false });

  // 설정 확인 (자동 응답 활성화 여부)
  const { data: settings } = await adminClient
    .from("talktalk_settings")
    .select("auto_reply_enabled")
    .eq("account_id", "default")
    .single();

  return data({
    rules: (rules || []) as TalkTalkAutoReply[],
    autoReplyEnabled: settings?.auto_reply_enabled || false,
    error: error?.message,
  });
}

export default function TalkTalkAutoRepliesPage() {
  const { rules, autoReplyEnabled, error } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TalkTalkAutoReply | null>(null);

  // 에러 표시
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 새 규칙 추가
  const handleAddRule = () => {
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  // 규칙 수정
  const handleEditRule = (rule: TalkTalkAutoReply) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  // 다이얼로그 닫힐 때 목록 새로고침
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      revalidator.revalidate();
    }
  };

  // 새로고침
  const handleRefresh = () => {
    revalidator.revalidate();
    toast.success("새로고침 완료");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 자동 응답 비활성화 경고 */}
      {!autoReplyEnabled && (
        <div className="p-4 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>자동 응답이 비활성화되어 있습니다. 설정에서 활성화해주세요.</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/talktalk/settings">설정으로 이동</Link>
          </Button>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/talktalk/chats">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6" />
              자동 응답 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              키워드 기반 자동 응답 규칙을 관리합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={revalidator.state === "loading"}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${revalidator.state === "loading" ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
          <Button onClick={handleAddRule}>
            <Plus className="h-4 w-4 mr-1" />
            규칙 추가
          </Button>
        </div>
      </div>

      {/* 규칙 목록 */}
      <TalkTalkAutoReplyList rules={rules} onEdit={handleEditRule} />

      {/* 규칙 추가/수정 다이얼로그 */}
      <TalkTalkAutoReplyDialog
        rule={editingRule}
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
      />
    </div>
  );
}
