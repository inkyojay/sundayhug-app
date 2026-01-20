/**
 * 문의 답변 템플릿 관리 페이지
 *
 * 기능:
 * - 템플릿 목록 조회
 * - 템플릿 추가/수정/삭제
 * - 카테고리별 분류
 * - 사용 횟수 통계
 */
import type { Route } from "./+types/inquiry-templates";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
} from "lucide-react";
import { data, Link, useFetcher } from "react-router";
import { toast } from "sonner";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Badge } from "~/core/components/ui/badge";

export const meta: Route.MetaFunction = () => {
  return [{ title: "답변 템플릿 관리 | Sundayhug Admin" }];
};

interface InquiryTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  use_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "general", label: "일반" },
  { value: "shipping", label: "배송" },
  { value: "return", label: "반품/교환" },
  { value: "product", label: "상품" },
  { value: "payment", label: "결제" },
  { value: "etc", label: "기타" },
];

function getCategoryLabel(value: string): string {
  const category = CATEGORIES.find((c) => c.value === value);
  return category?.label || value;
}

export async function loader() {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const { data: templates, error } = await adminClient
    .from("naver_inquiry_templates")
    .select("*")
    .order("use_count", { ascending: false });

  if (error) {
    console.error("템플릿 조회 오류:", error);
    return data({
      templates: [],
      error: error.message,
    });
  }

  return data({
    templates: templates || [],
    error: null,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  try {
    // 템플릿 추가
    if (actionType === "create") {
      const name = formData.get("name") as string;
      const content = formData.get("content") as string;
      const category = formData.get("category") as string;

      if (!name || !content) {
        return data({ success: false, error: "이름과 내용을 입력해주세요." });
      }

      const { error } = await adminClient.from("naver_inquiry_templates").insert({
        name,
        content,
        category: category || "general",
        is_active: true,
        use_count: 0,
      });

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 추가되었습니다." });
    }

    // 템플릿 수정
    if (actionType === "update") {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const content = formData.get("content") as string;
      const category = formData.get("category") as string;

      if (!id || !name || !content) {
        return data({ success: false, error: "필수 정보가 누락되었습니다." });
      }

      const { error } = await adminClient
        .from("naver_inquiry_templates")
        .update({
          name,
          content,
          category: category || "general",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 수정되었습니다." });
    }

    // 템플릿 삭제
    if (actionType === "delete") {
      const id = formData.get("id") as string;

      if (!id) {
        return data({ success: false, error: "템플릿 ID가 필요합니다." });
      }

      const { error } = await adminClient
        .from("naver_inquiry_templates")
        .delete()
        .eq("id", id);

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({ success: true, message: "템플릿이 삭제되었습니다." });
    }

    // 템플릿 활성화/비활성화
    if (actionType === "toggle_active") {
      const id = formData.get("id") as string;
      const isActive = formData.get("isActive") === "true";

      if (!id) {
        return data({ success: false, error: "템플릿 ID가 필요합니다." });
      }

      const { error } = await adminClient
        .from("naver_inquiry_templates")
        .update({
          is_active: !isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return data({ success: false, error: error.message });
      }

      return data({
        success: true,
        message: isActive ? "템플릿이 비활성화되었습니다." : "템플릿이 활성화되었습니다.",
      });
    }

    return data({ success: false, error: "알 수 없는 액션입니다." });
  } catch (error) {
    console.error("템플릿 액션 오류:", error);
    return data({
      success: false,
      error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.",
    });
  }
}

export default function InquiryTemplates({ loaderData, actionData }: Route.ComponentProps) {
  const { templates, error } = loaderData;
  const fetcher = useFetcher();

  // 검색/필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // 다이얼로그 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InquiryTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 폼 상태
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");

  // 액션 결과 처리
  const handleActionResult = useCallback(() => {
    if (fetcher.data && "success" in fetcher.data) {
      if (fetcher.data.success) {
        if ("message" in fetcher.data) {
          toast.success(fetcher.data.message as string);
        }
        setIsCreateOpen(false);
        setEditingTemplate(null);
        setDeleteConfirmId(null);
        resetForm();
      } else if ("error" in fetcher.data) {
        toast.error(fetcher.data.error as string);
      }
    }
  }, [fetcher.data]);

  // fetcher.data 변경 시 처리
  if (fetcher.data && fetcher.state === "idle") {
    handleActionResult();
  }

  const resetForm = () => {
    setFormName("");
    setFormContent("");
    setFormCategory("general");
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (template: InquiryTemplate) => {
    setFormName(template.name);
    setFormContent(template.content);
    setFormCategory(template.category || "general");
    setEditingTemplate(template);
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.set("actionType", editingTemplate ? "update" : "create");
    formData.set("name", formName);
    formData.set("content", formContent);
    formData.set("category", formCategory);
    if (editingTemplate) {
      formData.set("id", editingTemplate.id);
    }
    fetcher.submit(formData, { method: "POST" });
  };

  const handleDelete = (id: string) => {
    const formData = new FormData();
    formData.set("actionType", "delete");
    formData.set("id", id);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleToggleActive = (template: InquiryTemplate) => {
    const formData = new FormData();
    formData.set("actionType", "toggle_active");
    formData.set("id", template.id);
    formData.set("isActive", String(template.is_active));
    fetcher.submit(formData, { method: "POST" });
  };

  // 필터링된 템플릿
  const filteredTemplates = (templates as InquiryTemplate[]).filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/inquiries/naver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-500" />
              답변 템플릿 관리
            </h1>
            <p className="text-muted-foreground">
              자주 사용하는 답변을 템플릿으로 저장하여 빠르게 답변합니다
            </p>
          </div>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          새 템플릿
        </Button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 메인 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>템플릿 목록</CardTitle>
          <CardDescription>
            총 {filteredTemplates.length}개의 템플릿
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터 */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="템플릿 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 테이블 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">이름</TableHead>
                  <TableHead className="w-[100px]">카테고리</TableHead>
                  <TableHead>내용 미리보기</TableHead>
                  <TableHead className="w-[80px] text-center">사용</TableHead>
                  <TableHead className="w-[80px] text-center">상태</TableHead>
                  <TableHead className="w-[120px] text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>템플릿이 없습니다</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {template.content}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{template.use_count}회</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={template.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(template)}
                        >
                          {template.is_active ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "템플릿 수정" : "새 템플릿 추가"}
            </DialogTitle>
            <DialogDescription>
              자주 사용하는 답변을 템플릿으로 저장합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">템플릿 이름</Label>
              <Input
                id="name"
                placeholder="예: 배송 안내"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">답변 내용</Label>
              <Textarea
                id="content"
                placeholder="템플릿 내용을 입력하세요..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTemplate(null);
                resetForm();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formName || !formContent}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>템플릿 삭제</DialogTitle>
            <DialogDescription>
              이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isSubmitting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
