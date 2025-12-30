/**
 * 공장 관리 - 공장 목록
 */
import type { Route } from "./+types/factory-list";

import { 
  FactoryIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  SearchIcon,
  DollarSignIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useFetcher, useRevalidator } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/core/components/ui/alert-dialog";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { Switch } from "~/core/components/ui/switch";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `공장 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";

  let query = supabase
    .from("factories")
    .select("*")
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`factory_name.ilike.%${search}%,factory_code.ilike.%${search}%`);
  }

  const { data: factories, error } = await query;

  if (error) {
    console.error("Failed to load factories:", error);
  }

  return { factories: factories || [], search };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create" || intent === "update") {
    const id = formData.get("id") as string | null;
    const factoryData = {
      factory_code: formData.get("factory_code") as string,
      factory_name: formData.get("factory_name") as string,
      contact_name: formData.get("contact_name") as string || null,
      contact_phone: formData.get("contact_phone") as string || null,
      contact_email: formData.get("contact_email") as string || null,
      address: formData.get("address") as string || null,
      notes: formData.get("notes") as string || null,
      is_active: formData.get("is_active") === "true",
    };

    if (id) {
      const { error } = await supabase
        .from("factories")
        .update({ ...factoryData, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) return { error: error.message };
      return { success: true, message: "공장 정보가 수정되었습니다." };
    } else {
      const { error } = await supabase
        .from("factories")
        .insert(factoryData);
      
      if (error) return { error: error.message };
      return { success: true, message: "공장이 등록되었습니다." };
    }
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    // 소프트 삭제 (is_deleted = true, deleted_at 설정)
    const { error } = await supabase
      .from("factories")
      .update({ 
        is_deleted: true, 
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true, message: "공장이 삭제되었습니다." };
  }

  return { error: "Unknown action" };
}

interface Factory {
  id: string;
  factory_code: string;
  factory_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export default function FactoryList({ loaderData, actionData }: Route.ComponentProps) {
  const { factories, search } = loaderData;
  const fetcher = useFetcher();
  const { revalidate } = useRevalidator();

  const [searchTerm, setSearchTerm] = useState(search);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [formData, setFormData] = useState({
    factory_code: "",
    factory_name: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    notes: "",
    is_active: true,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    window.location.href = `/dashboard/factories?${params.toString()}`;
  };

  const openCreateDialog = () => {
    setSelectedFactory(null);
    setFormData({
      factory_code: "",
      factory_name: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      address: "",
      notes: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (factory: Factory) => {
    setSelectedFactory(factory);
    setFormData({
      factory_code: factory.factory_code,
      factory_name: factory.factory_name,
      contact_name: factory.contact_name || "",
      contact_phone: factory.contact_phone || "",
      contact_email: factory.contact_email || "",
      address: factory.address || "",
      notes: factory.notes || "",
      is_active: factory.is_active,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (factory: Factory) => {
    setSelectedFactory(factory);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    const form = new FormData();
    form.append("intent", selectedFactory ? "update" : "create");
    if (selectedFactory) form.append("id", selectedFactory.id);
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, String(value));
    });
    
    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (!selectedFactory) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", selectedFactory.id);
    fetcher.submit(form, { method: "post" });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FactoryIcon className="w-6 h-6" />
            공장 관리
          </h1>
          <p className="text-muted-foreground">
            제품을 제조하는 공장을 관리합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          공장 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="공장명 또는 코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>공장코드</TableHead>
                <TableHead>공장명</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>주소</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    등록된 공장이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                factories.map((factory: Factory) => (
                  <TableRow key={factory.id}>
                    <TableCell className="font-mono text-sm">
                      {factory.factory_code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {factory.factory_name}
                    </TableCell>
                    <TableCell>{factory.contact_name || "-"}</TableCell>
                    <TableCell>
                      {factory.contact_phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <PhoneIcon className="w-3 h-3" />
                          {factory.contact_phone}
                        </div>
                      )}
                      {factory.contact_email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MailIcon className="w-3 h-3" />
                          {factory.contact_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {factory.address || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={factory.is_active ? "default" : "secondary"}>
                        {factory.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="제조원가 관리"
                        >
                          <Link to={`/dashboard/factories/${factory.id}/costs`}>
                            <DollarSignIcon className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(factory)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(factory)}
                        >
                          <TrashIcon className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 공장 등록/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedFactory ? "공장 정보 수정" : "공장 등록"}
            </DialogTitle>
            <DialogDescription>
              공장 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="factory_code">공장 코드 *</Label>
                <Input
                  id="factory_code"
                  value={formData.factory_code}
                  onChange={(e) => setFormData({ ...formData, factory_code: e.target.value })}
                  placeholder="예: FC001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="factory_name">공장명 *</Label>
                <Input
                  id="factory_name"
                  value={formData.factory_name}
                  onChange={(e) => setFormData({ ...formData, factory_name: e.target.value })}
                  placeholder="예: 썬데이허그 제1공장"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">담당자명</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">연락처</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">이메일</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">비고</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">활성화</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.factory_code || !formData.factory_name}>
              {selectedFactory ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedFactory?.factory_name}" 공장을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

