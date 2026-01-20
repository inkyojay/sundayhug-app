/**
 * 상품 문의 상세 슬라이드 패널 컴포넌트
 *
 * 상품 Q&A 상세 정보 표시 및 답변 작성
 */

import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Calendar,
  Package,
  User,
  MessageSquare,
  Loader2,
  Send,
  Edit,
  ExternalLink,
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
import type { NaverProductQna } from "../../lib/naver/naver-types.server";

interface ProductQnaDetailSheetProps {
  qna: NaverProductQna | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnswerSubmit: (questionId: number, content: string) => void;
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

export function ProductQnaDetailSheet({
  qna,
  open,
  onOpenChange,
  onAnswerSubmit,
  isSubmitting,
  templates = [],
  onSaveTemplate,
  onDeleteTemplate,
}: ProductQnaDetailSheetProps) {
  const [answerContent, setAnswerContent] = useState("");
  const isUpdate = Boolean(qna?.answer);

  // 템플릿 선택 시 내용 적용
  const handleTemplateSelect = (content: string) => {
    setAnswerContent(content);
  };

  // 기존 답변이 있으면 불러오기
  useEffect(() => {
    if (qna?.answer) {
      setAnswerContent(qna.answer);
    } else {
      setAnswerContent("");
    }
  }, [qna]);

  const handleSubmit = () => {
    if (!qna || !answerContent.trim()) return;
    onAnswerSubmit(qna.questionId, answerContent.trim());
  };

  if (!qna) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-6">
        <SheetHeader className="space-y-1 pb-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <SheetTitle className="text-lg">상품 문의 상세</SheetTitle>
            <InquiryStatusBadge status={qna.answered ? "ANSWERED" : "WAITING"} />
          </div>
          <SheetDescription className="text-sm">문의번호: {qna.questionId}</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6 px-1">
          {/* 문의 정보 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              문의 정보
            </h3>
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">상품</p>
                  <p className="text-sm">{qna.productName || "-"}</p>
                  {qna.productId && (
                    <Link
                      to={`/dashboard/products/naver?productId=${qna.productId}`}
                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      상품 상세 보기
                    </Link>
                  )}
                </div>
              </div>
              <InfoItem
                icon={User}
                label="작성자"
                value={qna.maskedWriterId || "-"}
              />
              <InfoItem
                icon={Calendar}
                label="문의일시"
                value={formatDate(qna.createDate)}
              />
              {qna.productId && (
                <InfoItem
                  icon={Package}
                  label="상품ID"
                  value={String(qna.productId)}
                />
              )}
            </div>
          </div>

          {/* 문의 내용 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              질문 내용
            </h3>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {qna.question || "내용 없음"}
              </p>
            </div>
          </div>

          <Separator />

          {/* 답변 작성/수정 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
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
                {qna.answerDate && (
                  <p className="text-xs text-muted-foreground">
                    답변일: {formatDate(qna.answerDate)}
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

            <div className="space-y-1.5">
              <Label htmlFor="answer-content" className="text-sm">답변 내용</Label>
              <Textarea
                id="answer-content"
                placeholder="고객에게 전달할 답변을 작성하세요..."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                rows={5}
                disabled={isSubmitting}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !answerContent.trim()}
              className="w-full"
              size="lg"
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
