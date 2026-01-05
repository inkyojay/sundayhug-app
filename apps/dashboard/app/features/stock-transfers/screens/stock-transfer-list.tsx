/**
 * 재고 이동 - 창고간 이동 관리
 */
import type { Route } from "./+types/stock-transfer-list";

import {
  ArrowLeftRightIcon,
  PlusIcon,
  SearchIcon,
  ArrowRightIcon,
  SaveIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";

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
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";

import makeServerClient from "~/core/lib/supa-client.server";

import {
  getStockTransfers,
  getActiveWarehouses,
  generateNewTransferNumber,
  createStockTransfer,
  deleteStockTransfer,
  parseStockTransferQueryParams,
} from "../lib/stock-transfers.server";
import type {
  StockTransfer,
  StockTransferItem,
  StockTransferFormData,
  InventoryLocation,
} from "../lib/stock-transfers.shared";
import {
  TRANSFER_STATUSES,
  EMPTY_TRANSFER_FORM,
  inventoryToTransferItem,
} from "../lib/stock-transfers.shared";
import { StockTransferTable, StockTransferDeleteDialog } from "../components";

export const meta: Route.MetaFunction = () => {
  return [{ title: `재고 이동 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);
  const params = parseStockTransferQueryParams(url);

  const [transfers, warehouses, newTransferNumber] = await Promise.all([
    getStockTransfers(supabase, params),
    getActiveWarehouses(supabase),
    generateNewTransferNumber(supabase),
  ]);

  return {
    transfers,
    warehouses,
    search: params.search,
    statusFilter: params.statusFilter,
    newTransferNumber,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const items = JSON.parse(formData.get("items") as string || "[]");
    const totalQuantity = parseInt(formData.get("total_quantity") as string) || 0;

    return createStockTransfer(supabase, {
      transferNumber: formData.get("transfer_number") as string,
      fromWarehouseId: formData.get("from_warehouse_id") as string,
      toWarehouseId: formData.get("to_warehouse_id") as string,
      transferDate: formData.get("transfer_date") as string,
      notes: formData.get("notes") as string || null,
      totalQuantity,
      items,
    });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    return deleteStockTransfer(supabase, id);
  }

  return { error: "Unknown action" };
}

export default function StockTransferList({ loaderData }: Route.ComponentProps) {
  const { transfers, warehouses, search, statusFilter, newTransferNumber } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [deleteTransfer, setDeleteTransfer] = useState<StockTransfer | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StockTransferFormData>({
    ...EMPTY_TRANSFER_FORM,
    transfer_number: newTransferNumber,
  });
  const [items, setItems] = useState<StockTransferItem[]>([]);
  const [fromWarehouseStock, setFromWarehouseStock] = useState<InventoryLocation[]>([]);
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
      ...EMPTY_TRANSFER_FORM,
      transfer_number: newTransferNumber,
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

  const addItem = (stockItem: InventoryLocation) => {
    const existingIndex = items.findIndex(item => item.sku === stockItem.sku);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity = Math.min(
        newItems[existingIndex].quantity + 1,
        stockItem.quantity
      );
      setItems(newItems);
    } else {
      setItems([...items, inventoryToTransferItem(stockItem)]);
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
                {TRANSFER_STATUSES.map((status) => (
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
          <StockTransferTable
            transfers={transfers}
            onDelete={setDeleteTransfer}
          />
        </CardContent>
      </Card>

      <StockTransferDeleteDialog
        open={!!deleteTransfer}
        onOpenChange={(open) => !open && setDeleteTransfer(null)}
        transfer={deleteTransfer}
        onConfirm={handleDelete}
      />

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
                        {fromWarehouseStock.map((stockItem) => (
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
