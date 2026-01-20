/**
 * 문의 상세 슬라이드 패널 컴포넌트
 *
 * Intercom 스타일의 오른쪽 슬라이드 패널
 * - 문의 정보 표시
 * - 문의 내용 읽기
 * - 답변 작성/수정 폼
 * - 답변 템플릿 선택
 */

import { useState, useEffect } from "react";
import {
  Calendar,
  Package,
  User,
  Tag,
  MessageSquare,
  Loader2,
  Send,
  Edit,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/core/components/ui/sheet";
import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import { Label } from "~/core/components/ui/label";
import { Separator } from "~/core/components/ui/separator";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import { InquiryTemplateSelect, type InquiryTemplate } from "./InquiryTemplateSelect";
import type { NaverInquiry } from "../../lib/naver/naver-types.server";

interface InquiryDetailSheetProps {
  inquiry: NaverInquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnswerSubmit: (inquiryNo: number, content: string, isUpdate: boolean) => void;
  isSubmitting: boolean;
  templates?: InquiryTemplate[];
  onSaveTemplate?: (name: string, content: string, category: string) => void;
  onDeleteTemplate?: (id: string) => void;
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 정보 항목 컴포넌트
function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export function InquiryDetailSheet({
  inquiry,
  open,
  onOpenChange,
  onAnswerSubmit,
  isSubmitting,
  templates = [],
  onSaveTemplate,
  onDeleteTemplate,
}: InquiryDetailSheetProps) {
  const [answerContent, setAnswerContent] = useState("");
  const isUpdate = Boolean(inquiry?.answerContent);

  // 템플릿 선택 시 내용 적용
  const handleTemplateSelect = (content: string) => {
    setAnswerContent(content);
  };

  // 기존 답변이 있으면 불러오기
  useEffect(() => {
    if (inquiry?.answerContent) {
      setAnswerContent(inquiry.answerContent);
    } else {
      setAnswerContent("");
    }
  }, [inquiry]);

  const handleSubmit = () => {
    if (!inquiry || !answerContent.trim()) return;
    onAnswerSubmit(inquiry.inquiryNo, answerContent.trim(), isUpdate);
  };

  if (!inquiry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>문의 상세</SheetTitle>
            <InquiryStatusBadge status={inquiry.inquiryStatus} />
          </div>
          <SheetDescription>문의번호: {inquiry.inquiryNo}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 문의 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              문의 정보
            </h3>
            <div className="grid gap-3">
              <InfoItem
                icon={Tag}
                label="문의 유형"
                value={inquiry.inquiryTypeName || "-"}
              />
              <InfoItem
                icon={Package}
                label="상품"
                value={inquiry.productName || "-"}
              />
              <InfoItem
                icon={User}
                label="회원 ID"
                value={inquiry.buyerMemberId || "-"}
              />
              <InfoItem
                icon={Calendar}
                label="문의일시"
                value={formatDate(inquiry.createDate)}
              />
            </div>
          </div>

          <Separator />

          {/* 문의 내용 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              문의 내용
            </h3>
            {inquiry.title && (
              <p className="font-medium">{inquiry.title}</p>
            )}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {inquiry.content || "내용 없음"}
              </p>
            </div>
          </div>

          <Separator />

          {/* 답변 작성/수정 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                {isUpdate ? (
                  <>
                    <Edit className="h-4 w-4" />
                    답변 수정
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    답변 작성
                  </>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {inquiry.answerDate && (
                  <p className="text-xs text-muted-foreground">
                    답변일: {formatDate(inquiry.answerDate)}
                  </p>
                )}
                {templates.length > 0 && (
                  <InquiryTemplateSelect
                    templates={templates}
                    onSelect={handleTemplateSelect}
                    onSaveTemplate={onSaveTemplate}
                    onDeleteTemplate={onDeleteTemplate}
                    currentContent={answerContent}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer-content">답변 내용</Label>
              <Textarea
                id="answer-content"
                placeholder="고객에게 전달할 답변을 작성하세요..."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                rows={6}
                disabled={isSubmitting}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !answerContent.trim()}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : isUpdate ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  답변 수정
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  답변 등록
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
