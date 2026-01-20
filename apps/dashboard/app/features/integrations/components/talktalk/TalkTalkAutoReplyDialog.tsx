/**
 * 톡톡 자동 응답 규칙 생성/수정 다이얼로그
 */

import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Textarea } from "~/core/components/ui/textarea";
import { Label } from "~/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import type { TalkTalkAutoReply } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkAutoReplyDialogProps {
  rule: TalkTalkAutoReply | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TalkTalkAutoReplyDialog({
  rule,
  open,
  onOpenChange,
}: TalkTalkAutoReplyDialogProps) {
  const fetcher = useFetcher();
  const isEdit = !!rule;

  const [formData, setFormData] = useState({
    triggerType: "keyword",
    triggerValue: "",
    responseType: "text",
    responseContent: "",
    priority: "0",
  });

  // 수정 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (rule) {
      let responseText = "";
      if (rule.response_type === "text") {
        const content = rule.response_content as { text?: string };
        responseText = content.text || "";
      } else {
        responseText = JSON.stringify(rule.response_content, null, 2);
      }

      setFormData({
        triggerType: rule.trigger_type,
        triggerValue: rule.trigger_value || "",
        responseType: rule.response_type,
        responseContent: responseText,
        priority: String(rule.priority),
      });
    } else {
      setFormData({
        triggerType: "keyword",
        triggerValue: "",
        responseType: "text",
        responseContent: "",
        priority: "0",
      });
    }
  }, [rule, open]);

  // 저장 결과 처리
  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      onOpenChange(false);
    }
  }, [fetcher.data, onOpenChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: Record<string, string> = {
      actionType: isEdit ? "updateAutoReply" : "createAutoReply",
      triggerType: formData.triggerType,
      triggerValue: formData.triggerValue,
      responseType: formData.responseType,
      responseContent: formData.responseContent,
      priority: formData.priority,
    };

    if (isEdit && rule) {
      submitData.id = rule.id;
      submitData.isActive = String(rule.is_active);
    }

    fetcher.submit(submitData, {
      method: "POST",
      action: "/integrations/talktalk/sync",
    });
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "자동 응답 규칙 수정" : "새 자동 응답 규칙"}
            </DialogTitle>
            <DialogDescription>
              특정 조건에 맞는 자동 응답을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 트리거 유형 */}
            <div className="space-y-2">
              <Label>트리거 유형</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) =>
                  setFormData({ ...formData, triggerType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">키워드 매칭</SelectItem>
                  <SelectItem value="open">채팅 시작 시</SelectItem>
                  <SelectItem value="friend">친구 추가 시</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 키워드 (keyword 유형일 때만) */}
            {formData.triggerType === "keyword" && (
              <div className="space-y-2">
                <Label htmlFor="triggerValue">키워드</Label>
                <Input
                  id="triggerValue"
                  placeholder="배송, 반품, 교환 (쉼표로 구분)"
                  value={formData.triggerValue}
                  onChange={(e) =>
                    setFormData({ ...formData, triggerValue: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  여러 키워드는 쉼표(,)로 구분하세요. 하나라도 포함되면 응답합니다.
                </p>
              </div>
            )}

            {/* 응답 유형 */}
            <div className="space-y-2">
              <Label>응답 유형</Label>
              <Select
                value={formData.responseType}
                onValueChange={(value) =>
                  setFormData({ ...formData, responseType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">텍스트</SelectItem>
                  <SelectItem value="composite">복합 메시지 (JSON)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 응답 내용 */}
            <div className="space-y-2">
              <Label htmlFor="responseContent">응답 내용</Label>
              <Textarea
                id="responseContent"
                placeholder={
                  formData.responseType === "text"
                    ? "응답 메시지를 입력하세요..."
                    : '{"text": "응답 메시지"}'
                }
                value={formData.responseContent}
                onChange={(e) =>
                  setFormData({ ...formData, responseContent: e.target.value })
                }
                rows={formData.responseType === "composite" ? 6 : 3}
                className={formData.responseType === "composite" ? "font-mono text-sm" : ""}
              />
            </div>

            {/* 우선순위 */}
            <div className="space-y-2">
              <Label htmlFor="priority">우선순위</Label>
              <Input
                id="priority"
                type="number"
                placeholder="0"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                숫자가 높을수록 먼저 적용됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : isEdit ? (
                "수정"
              ) : (
                "생성"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
