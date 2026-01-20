/**
 * 답변 템플릿 선택 컴포넌트
 *
 * 자주 사용하는 답변 템플릿을 선택하여 빠르게 답변 작성
 */

import { useState, useEffect } from "react";
import { FileText, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/core/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

export interface InquiryTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  use_count: number;
}

interface InquiryTemplateSelectProps {
  templates: InquiryTemplate[];
  onSelect: (content: string) => void;
  onSaveTemplate?: (name: string, content: string, category: string) => void;
  onDeleteTemplate?: (id: string) => void;
  currentContent?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "일반",
  shipping: "배송",
  return: "교환/반품",
  product: "상품",
  restock: "재입고",
};

export function InquiryTemplateSelect({
  templates,
  onSelect,
  onSaveTemplate,
  onDeleteTemplate,
  currentContent,
}: InquiryTemplateSelectProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("general");

  // 카테고리별로 그룹화
  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const category = template.category || "general";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, InquiryTemplate[]>
  );

  const handleSaveTemplate = () => {
    if (newTemplateName && currentContent && onSaveTemplate) {
      onSaveTemplate(newTemplateName, currentContent, newTemplateCategory);
      setIsDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateCategory("general");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            템플릿
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>답변 템플릿</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <DropdownMenuLabel className="text-xs text-muted-foreground py-1">
                {CATEGORY_LABELS[category] || category}
              </DropdownMenuLabel>
              {categoryTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => onSelect(template.content)}
                >
                  <span className="truncate">{template.name}</span>
                  {onDeleteTemplate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(template.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
          ))}

          {templates.length === 0 && (
            <DropdownMenuItem disabled>
              등록된 템플릿이 없습니다
            </DropdownMenuItem>
          )}

          {onSaveTemplate && currentContent && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                현재 내용을 템플릿으로 저장
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 새 템플릿 저장 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 저장</DialogTitle>
            <DialogDescription>
              현재 작성 중인 답변을 템플릿으로 저장합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">템플릿 이름</Label>
              <Input
                id="template-name"
                placeholder="예: 배송 지연 안내"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category">카테고리</Label>
              <Select
                value={newTemplateCategory}
                onValueChange={setNewTemplateCategory}
              >
                <SelectTrigger id="template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>미리보기</Label>
              <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
                {currentContent || "내용 없음"}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!newTemplateName}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
