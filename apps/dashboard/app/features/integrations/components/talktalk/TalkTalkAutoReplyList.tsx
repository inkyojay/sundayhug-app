/**
 * 톡톡 자동 응답 규칙 목록 컴포넌트
 */

import { Zap, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useFetcher } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import { Switch } from "~/core/components/ui/switch";
import type { TalkTalkAutoReply } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkAutoReplyListProps {
  rules: TalkTalkAutoReply[];
  onEdit: (rule: TalkTalkAutoReply) => void;
}

const triggerTypeLabels: Record<string, { label: string; color: string }> = {
  keyword: { label: "키워드", color: "bg-blue-100 text-blue-800" },
  open: { label: "채팅 시작", color: "bg-green-100 text-green-800" },
  friend: { label: "친구 추가", color: "bg-yellow-100 text-yellow-800" },
};

export function TalkTalkAutoReplyList({ rules, onEdit }: TalkTalkAutoReplyListProps) {
  const fetcher = useFetcher();

  const handleToggle = (rule: TalkTalkAutoReply) => {
    fetcher.submit(
      {
        actionType: "updateAutoReply",
        id: rule.id,
        triggerType: rule.trigger_type,
        triggerValue: rule.trigger_value || "",
        responseType: rule.response_type,
        responseContent: JSON.stringify(rule.response_content),
        priority: String(rule.priority),
        isActive: String(!rule.is_active),
      },
      { method: "POST", action: "/integrations/talktalk/sync" }
    );
  };

  const handleDelete = (rule: TalkTalkAutoReply) => {
    if (!confirm("정말 이 자동 응답 규칙을 삭제하시겠습니까?")) return;

    fetcher.submit(
      { actionType: "deleteAutoReply", id: rule.id },
      { method: "POST", action: "/integrations/talktalk/sync" }
    );
  };

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Zap className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">자동 응답 규칙이 없습니다</p>
        <p className="text-sm">새 규칙을 추가하여 자동 응답을 설정하세요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">유형</TableHead>
            <TableHead>트리거</TableHead>
            <TableHead>응답 내용</TableHead>
            <TableHead className="w-[80px] text-center">우선순위</TableHead>
            <TableHead className="w-[80px] text-center">활성화</TableHead>
            <TableHead className="w-[100px]">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const typeConfig = triggerTypeLabels[rule.trigger_type] || {
              label: rule.trigger_type,
              color: "bg-gray-100 text-gray-800",
            };

            // 응답 미리보기
            let responsePreview = "";
            if (rule.response_type === "text") {
              const content = rule.response_content as { text?: string };
              responsePreview = content.text || "[텍스트]";
            } else {
              responsePreview = "[복합 메시지]";
            }

            return (
              <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <Badge variant="outline" className={typeConfig.color}>
                    {typeConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {rule.trigger_type === "keyword" ? (
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {rule.trigger_value || "-"}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <p className="truncate max-w-[200px] text-sm">{responsePreview}</p>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{rule.priority}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggle(rule)}
                    disabled={fetcher.state === "submitting"}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule)}
                      disabled={fetcher.state === "submitting"}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
