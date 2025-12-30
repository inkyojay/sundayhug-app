/**
 * 재고 이동 - 창고간 이동 관리
 */
import type { Route } from "./+types/stock-transfer-list";

import { 
  ArrowLeftRightIcon, 
  PlusIcon, 
  SearchIcon,
  WarehouseIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  SaveIcon,
  TrashIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
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

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `재고 이동 | Sundayhug Admin` }];
};

const transferStatuses = [
  { value: "pending", label: "대기중", color: "secondary" },
  { value: "in_transit", label: "이동중", color: "outline" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

const getStatusInfo = (status: string) => {
  return transferStatuses.find(s => s.value === status) || transferStatuses[0];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "";

  // 창고 목록 조회
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, warehouse_name, warehouse_code")
    .eq("is_active", true)
    .order("warehouse_name");

  // 재고 이동 목록 조회 (삭제되지 않은 것만)
  let query = supabase
    .from("stock_transfers")
    .select(`
      *,
      from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id, warehouse_name),
      to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id, warehouse_name),
      items:stock_transfer_items(id, sku, product_name, quantity)
    `)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("transfer_number", `%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  const { data: transfers, error } = await query;

  if (error) {
    console.error("Failed to load stock transfers:", error);
  }

  // 새 이동번호 생성
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("stock_transfers")
    .select("*", { count: "exact", head: true })
    .ilike("transfer_number", `ST-${today}%`);
  
  const newTransferNumber = `ST-${today}-${String((count || 0) + 1).padStart(4, "0")}`;

  return { 
    transfers: transfers || [], 
    warehouses: warehouses || [],
    search, 
    statusFilter, 
    newTransferNumber,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const transferData = {
      transfer_number: formData.get("transfer_number") as string,
      from_warehouse_id: formData.get("from_warehouse_id") as string,
      to_warehouse_id: formData.get("to_warehouse_id") as string,
      transfer_date: formData.get("transfer_date") as string,
      status: "completed",
      notes: formData.get("notes") as string || null,
      total_quantity: parseInt(formData.get("total_quantity") as string) || 0,
    };

    const items = JSON.parse(formData.get("items") as string || "[]");

    // 출발 창고 재고 확인 및 차감
    for (const item of items) {
      const { data: fromStock } = await supabase
        .from("inventory_locations")
        .select("id, quantity")
        .eq("warehouse_id", transferData.from_warehouse_id)
        .eq("sku", item.sku)
        .single();

      if (!fromStock || fromStock.quantity < item.quantity) {
        return { error: `${item.sku} 재고가 부족합니다. (보유: ${fromStock?.quantity || 0}, 요청: ${item.quantity})` };
      }
    }

    // 이동 헤더 생성
    const { data: newTransfer, error: transferError } = await supabase
      .from("stock_transfers")
      .insert(transferData)
      .select()
      .single();

    if (transferError) return { error: transferError.message };

    // 이동 품목 생성
    if (items.length > 0 && newTransfer) {
      const itemsToInsert = items.map((item: any) => ({
        stock_transfer_id: newTransfer.id,
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
      }));

      await supabase.from("stock_transfer_items").insert(itemsToInsert);

      // 출발 창고 재고 차감
      for (const item of items) {
        const { data: fromStock } = await supabase
          .from("inventory_locations")
          .select("id, quantity")
          .eq("warehouse_id", transferData.from_warehouse_id)
          .eq("sku", item.sku)
          .single();

        if (fromStock) {
          await supabase
            .from("inventory_locations")
            .update({ 
              quantity: fromStock.quantity - item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", fromStock.id);
        }
      }

      // 도착 창고 재고 증가
      for (const item of items) {
        const { data: toStock } = await supabase
          .from("inventory_locations")
          .select("id, quantity")
          .eq("warehouse_id", transferData.to_warehouse_id)
          .eq("sku", item.sku)
          .single();

        if (toStock) {
          await supabase
            .from("inventory_locations")
            .update({ 
              quantity: toStock.quantity + item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", toStock.id);
        } else {
          await supabase
            .from("inventory_locations")
            .insert({
              warehouse_id: transferData.to_warehouse_id,
              product_id: item.product_id || null,
              sku: item.sku,
              quantity: item.quantity,
            });
        }
      }
    }

    return { success: true, message: "재고 이동이 완료되었습니다." };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    
    // 소프트 삭제 (is_deleted = true, deleted_at 설정)
    const { error } = await supabase
      .from("stock_transfers")
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true, message: "재고 이동이 삭제되었습니다." };
  }

  return { error: "Unknown action" };
}

interface TransferItem {
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  available_quantity: number;
}

export default function StockTransferList({ loaderData, actionData }: Route.ComponentProps) {
  const { transfers, warehouses, search, statusFilter, newTransferNumber } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [deleteTransfer, setDeleteTransfer] = useState<any | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    transfer_number: newTransferNumber,
    from_warehouse_id: "",
    to_warehouse_id: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [items, setItems] = useState<TransferItem[]>([]);
  const [fromWarehouseStock, setFromWarehouseStock] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedStatus) params.set("status", selectedStatus);
    navigate(`/dashboard/stock-transfers?${params.toString()}`);
  };

  const handleDelete = () => {
    if (!deleteTransfer) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", deleteTransfer.id);
    fetcher.submit(form, { method: "post" });
    setDeleteTransfer(null);
  };

  const openCreateDialog = () => {
    setFormData({
      transfer_number: newTransferNumber,
      from_warehouse_id: "",
      to_warehouse_id: "",
      transfer_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setItems([]);
    setFromWarehouseStock([]);
    setIsDialogOpen(true);
  };

  const handleFromWarehouseChange = async (warehouseId: string) => {
    setFormData({ ...formData, from_warehouse_id: warehouseId });
    setItems([]);
    
    if (!warehouseId) {
      setFromWarehouseStock([]);
      return;
    }

    setLoadingStock(true);
    try {
      const response = await fetch(`/api/inventory-locations?warehouse_id=${warehouseId}`);
      if (response.ok) {
        const data = await response.json();
        setFromWarehouseStock(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load warehouse stock:", error);
    }
    setLoadingStock(false);
  };

  const addItem = (stockItem: any) => {
    const existingIndex = items.findIndex(item => item.sku === stockItem.sku);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity = Math.min(
        newItems[existingIndex].quantity + 1,
        stockItem.quantity
      );
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: stockItem.product_id,
        sku: stockItem.sku,
        product_name: stockItem.product_name || stockItem.sku,
        quantity: 1,
        available_quantity: stockItem.quantity,
      }]);
    }
  };

  const updateItem = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.min(quantity, newItems[index].available_quantity);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = () => {
    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      alert("출발 창고와 도착 창고가 같습니다.");
      return;
    }

    const form = new FormData();
    form.append("intent", "create");
    form.append("transfer_number", formData.transfer_number);
    form.append("from_warehouse_id", formData.from_warehouse_id);
    form.append("to_warehouse_id", formData.to_warehouse_id);
    form.append("transfer_date", formData.transfer_date);
    form.append("notes", formData.notes);
    form.append("total_quantity", String(totalQuantity));
    form.append("items", JSON.stringify(items.map(item => ({
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
    }))));
    
    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRightIcon className="w-6 h-6" />
            재고 이동
          </h1>
          <p className="text-muted-foreground">
            창고간 재고를 이동합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          이동 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이동번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="상태 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">상태 전체</SelectItem>
                {transferStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
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
                <TableHead>이동번호</TableHead>
                <TableHead>출발 창고</TableHead>
                <TableHead></TableHead>
                <TableHead>도착 창고</TableHead>
                <TableHead>이동일</TableHead>
                <TableHead className="text-center">품목수</TableHead>
                <TableHead className="text-right">총 수량</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    이동 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer: any) => {
                  const statusInfo = getStatusInfo(transfer.status);
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {transfer.transfer_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                          {transfer.from_warehouse?.warehouse_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                          {transfer.to_warehouse?.warehouse_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(transfer.transfer_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {transfer.items?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {transfer.total_quantity?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.color as any}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTransfer(transfer)}
                        >
                          <TrashIcon className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTransfer} onOpenChange={(open) => !open && setDeleteTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>재고 이동 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              재고 이동 "{deleteTransfer?.transfer_number}"를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 재고 이동 등록 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>재고 이동</DialogTitle>
            <DialogDescription>
              출발 창고에서 도착 창고로 재고를 이동합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>이동번호</Label>
                <Input value={formData.transfer_number} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>이동일</Label>
                <Input
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                />
              </div>
            </div>

            {/* 창고 선택 */}
            <div className="grid grid-cols-5 gap-4 items-end">
              <div className="col-span-2 space-y-2">
                <Label>출발 창고 *</Label>
                <Select 
                  value={formData.from_warehouse_id} 
                  onValueChange={handleFromWarehouseChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="출발 창고 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh: any) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center">
                <ArrowRightIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>도착 창고 *</Label>
                <Select 
                  value={formData.to_warehouse_id} 
                  onValueChange={(v) => setFormData({ ...formData, to_warehouse_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="도착 창고 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((wh: any) => wh.id !== formData.from_warehouse_id)
                      .map((wh: any) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.warehouse_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 출발 창고 재고 목록 */}
            {formData.from_warehouse_id && (
              <div className="space-y-2">
                <Label>출발 창고 재고 (클릭하여 추가)</Label>
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  {loadingStock ? (
                    <div className="p-4 text-center text-muted-foreground">
                      재고 조회 중...
                    </div>
                  ) : fromWarehouseStock.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      재고가 없습니다.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>제품명</TableHead>
                          <TableHead className="text-right">재고</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fromWarehouseStock.map((stockItem: any) => (
                          <TableRow 
                            key={stockItem.id} 
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => addItem(stockItem)}
                          >
                            <TableCell className="font-mono text-sm">{stockItem.sku}</TableCell>
                            <TableCell>{stockItem.product_name || stockItem.sku}</TableCell>
                            <TableCell className="text-right">{stockItem.quantity}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost">추가</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}

            {/* 이동 품목 */}
            <div className="space-y-2">
              <Label>이동 품목</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead className="text-center">가용재고</TableHead>
                    <TableHead className="text-center w-[120px]">이동수량</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        이동할 품목을 추가해주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.available_quantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={item.available_quantity}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, parseInt(e.target.value) || 0)}
                            className="w-24 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <TrashIcon className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 비고 */}
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* 총 수량 */}
            <div className="flex justify-end text-lg font-bold">
              총 이동 수량: {totalQuantity.toLocaleString()}개
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.from_warehouse_id || !formData.to_warehouse_id || items.length === 0}
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              이동 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

