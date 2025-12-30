/**
 * 창고 관리 - 창고 목록
 */
import type { Route } from "./+types/warehouse-list";

import { 
  WarehouseIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PhoneIcon,
  MapPinIcon,
  SearchIcon,
  BoxIcon,
  TruckIcon,
} from "lucide-react";
import { useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { Switch } from "~/core/components/ui/switch";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `창고 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const typeFilter = url.searchParams.get("type") || "";

  let query = supabase
    .from("warehouses")
    .select("*")
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`warehouse_name.ilike.%${search}%,warehouse_code.ilike.%${search}%`);
  }

  if (typeFilter) {
    query = query.eq("warehouse_type", typeFilter);
  }

  const { data: warehouses, error } = await query;

  if (error) {
    console.error("Failed to load warehouses:", error);
  }

  // 각 창고별 재고 수량 조회
  const warehouseIds = warehouses?.map(w => w.id) || [];
  let inventoryCounts: Record<string, number> = {};
  
  if (warehouseIds.length > 0) {
    const { data: inventoryData } = await supabase
      .from("inventory_locations")
      .select("warehouse_id, quantity")
      .in("warehouse_id", warehouseIds);
    
    if (inventoryData) {
      inventoryCounts = inventoryData.reduce((acc: Record<string, number>, item) => {
        acc[item.warehouse_id] = (acc[item.warehouse_id] || 0) + item.quantity;
        return acc;
      }, {});
    }
  }

  return { warehouses: warehouses || [], search, typeFilter, inventoryCounts };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create" || intent === "update") {
    const id = formData.get("id") as string | null;
    const warehouseData = {
      warehouse_code: formData.get("warehouse_code") as string,
      warehouse_name: formData.get("warehouse_name") as string,
      warehouse_type: formData.get("warehouse_type") as string,
      location: formData.get("location") as string || null,
      address: formData.get("address") as string || null,
      contact_name: formData.get("contact_name") as string || null,
      contact_phone: formData.get("contact_phone") as string || null,
      notes: formData.get("notes") as string || null,
      is_active: formData.get("is_active") === "true",
    };

    if (id) {
      const { error } = await supabase
        .from("warehouses")
        .update({ ...warehouseData, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) return { error: error.message };
      return { success: true, message: "창고 정보가 수정되었습니다." };
    } else {
      const { error } = await supabase
        .from("warehouses")
        .insert(warehouseData);
      
      if (error) return { error: error.message };
      return { success: true, message: "창고가 등록되었습니다." };
    }
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    // 소프트 삭제 (is_deleted = true, deleted_at 설정)
    const { error } = await supabase
      .from("warehouses")
      .update({ 
        is_deleted: true, 
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true, message: "창고가 삭제되었습니다." };
  }

  return { error: "Unknown action" };
}

const warehouseTypes = [
  { value: "owned", label: "자체 창고", icon: BoxIcon },
  { value: "3pl", label: "3PL 물류센터", icon: TruckIcon },
];

const getWarehouseTypeLabel = (type: string) => {
  return warehouseTypes.find(t => t.value === type)?.label || type;
};

interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
  location: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export default function WarehouseList({ loaderData, actionData }: Route.ComponentProps) {
  const { warehouses, search, typeFilter, inventoryCounts } = loaderData;
  const fetcher = useFetcher();
  const { revalidate } = useRevalidator();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedType, setSelectedType] = useState(typeFilter);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    warehouse_code: "",
    warehouse_name: "",
    warehouse_type: "owned",
    location: "",
    address: "",
    contact_name: "",
    contact_phone: "",
    notes: "",
    is_active: true,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedType) params.set("type", selectedType);
    window.location.href = `/dashboard/warehouses?${params.toString()}`;
  };

  const openCreateDialog = () => {
    setSelectedWarehouse(null);
    setFormData({
      warehouse_code: "",
      warehouse_name: "",
      warehouse_type: "owned",
      location: "",
      address: "",
      contact_name: "",
      contact_phone: "",
      notes: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      warehouse_code: warehouse.warehouse_code,
      warehouse_name: warehouse.warehouse_name,
      warehouse_type: warehouse.warehouse_type,
      location: warehouse.location || "",
      address: warehouse.address || "",
      contact_name: warehouse.contact_name || "",
      contact_phone: warehouse.contact_phone || "",
      notes: warehouse.notes || "",
      is_active: warehouse.is_active,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    const form = new FormData();
    form.append("intent", selectedWarehouse ? "update" : "create");
    if (selectedWarehouse) form.append("id", selectedWarehouse.id);
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, String(value));
    });
    
    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (!selectedWarehouse) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", selectedWarehouse.id);
    fetcher.submit(form, { method: "post" });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6" />
            창고 관리
          </h1>
          <p className="text-muted-foreground">
            자체 창고 및 3PL 물류센터를 관리합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          창고 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="창고명 또는 코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="유형 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체</SelectItem>
                {warehouseTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>창고코드</TableHead>
                <TableHead>창고명</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>위치</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead className="text-right">재고 수량</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    등록된 창고가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse: Warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-mono text-sm">
                      {warehouse.warehouse_code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {warehouse.warehouse_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.warehouse_type === "owned" ? "default" : "outline"}>
                        {getWarehouseTypeLabel(warehouse.warehouse_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {warehouse.location && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPinIcon className="w-3 h-3" />
                          {warehouse.location}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {warehouse.contact_name && (
                        <div className="text-sm">{warehouse.contact_name}</div>
                      )}
                      {warehouse.contact_phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <PhoneIcon className="w-3 h-3" />
                          {warehouse.contact_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(inventoryCounts[warehouse.id] || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                        {warehouse.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(warehouse)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(warehouse)}
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

      {/* 창고 등록/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedWarehouse ? "창고 정보 수정" : "창고 등록"}
            </DialogTitle>
            <DialogDescription>
              창고 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse_code">창고 코드 *</Label>
                <Input
                  id="warehouse_code"
                  value={formData.warehouse_code}
                  onChange={(e) => setFormData({ ...formData, warehouse_code: e.target.value })}
                  placeholder="예: WH001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse_name">창고명 *</Label>
                <Input
                  id="warehouse_name"
                  value={formData.warehouse_name}
                  onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                  placeholder="예: 본사 창고"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse_type">창고 유형 *</Label>
                <Select 
                  value={formData.warehouse_type} 
                  onValueChange={(value) => setFormData({ ...formData, warehouse_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">위치</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="예: 서울"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
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
            <Button onClick={handleSubmit} disabled={!formData.warehouse_code || !formData.warehouse_name}>
              {selectedWarehouse ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>창고 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedWarehouse?.warehouse_name}" 창고를 삭제하시겠습니까?
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

