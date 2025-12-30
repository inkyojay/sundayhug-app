/**
 * 입고 관리 - 입고 목록 및 등록
 */
import type { Route } from "./+types/stock-receipt-list";

import { 
  PackageIcon, 
  PlusIcon, 
  EyeIcon, 
  SearchIcon,
  WarehouseIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ClipboardListIcon,
  SaveIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useFetcher, useNavigate } from "react-router";

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "~/core/components/ui/sheet";
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
import { Checkbox } from "~/core/components/ui/checkbox";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `입고 관리 | Sundayhug Admin` }];
};

const receiptStatuses = [
  { value: "pending", label: "대기중", color: "secondary" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

const getStatusInfo = (status: string) => {
  return receiptStatuses.find(s => s.value === status) || receiptStatuses[0];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "";
  const warehouseFilter = url.searchParams.get("warehouse") || "";

  // 창고 목록 조회
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, warehouse_name, warehouse_code")
    .eq("is_active", true)
    .order("warehouse_name");

  // 발주서 목록 조회 (입고 연결용)
  const { data: purchaseOrders } = await supabase
    .from("purchase_orders")
    .select(`
      id, order_number, factory_id, status, order_date, total_quantity,
      factory:factories(factory_name),
      items:purchase_order_items(id, sku, product_name, quantity, received_quantity)
    `)
    .in("status", ["sent", "in_production", "shipping"])
    .order("order_date", { ascending: false });

  // 입고 목록 조회 (삭제되지 않은 것만)
  let query = supabase
    .from("stock_receipts")
    .select(`
      *,
      warehouse:warehouses(id, warehouse_name, warehouse_code),
      purchase_order:purchase_orders(id, order_number),
      items:stock_receipt_items(id, sku, product_name, received_quantity)
    `)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("receipt_number", `%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (warehouseFilter && warehouseFilter !== "__all__") {
    query = query.eq("warehouse_id", warehouseFilter);
  }

  const { data: receipts, error } = await query;

  if (error) {
    console.error("Failed to load stock receipts:", error);
  }

  // 제품 목록 (직접 입고용)
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, sku, product_name, color_kr, sku_6_size, parent_sku,
      parent_product:parent_products!fk_parent_product(id, product_name)
    `)
    .eq("is_active", true)
    .order("sku");

  // 새 입고번호 생성
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("stock_receipts")
    .select("*", { count: "exact", head: true })
    .ilike("receipt_number", `SR-${today}%`);
  
  const newReceiptNumber = `SR-${today}-${String((count || 0) + 1).padStart(4, "0")}`;

  return { 
    receipts: receipts || [], 
    warehouses: warehouses || [],
    purchaseOrders: purchaseOrders || [],
    products: products || [],
    search, 
    statusFilter, 
    warehouseFilter,
    newReceiptNumber,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const receiptData = {
      receipt_number: formData.get("receipt_number") as string,
      purchase_order_id: formData.get("purchase_order_id") as string || null,
      warehouse_id: formData.get("warehouse_id") as string,
      receipt_date: formData.get("receipt_date") as string,
      status: "completed",
      notes: formData.get("notes") as string || null,
      total_quantity: parseInt(formData.get("total_quantity") as string) || 0,
    };

    const items = JSON.parse(formData.get("items") as string || "[]");

    // 입고 헤더 생성
    const { data: newReceipt, error: receiptError } = await supabase
      .from("stock_receipts")
      .insert(receiptData)
      .select()
      .single();

    if (receiptError) return { error: receiptError.message };

    // 입고 품목 생성
    if (items.length > 0 && newReceipt) {
      const itemsToInsert = items.map((item: any) => ({
        stock_receipt_id: newReceipt.id,
        purchase_order_item_id: item.purchase_order_item_id || null,
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        expected_quantity: item.expected_quantity || 0,
        received_quantity: item.received_quantity,
        damaged_quantity: item.damaged_quantity || 0,
      }));

      await supabase.from("stock_receipt_items").insert(itemsToInsert);

      // 창고 재고 업데이트
      for (const item of items) {
        const { data: existing } = await supabase
          .from("inventory_locations")
          .select("id, quantity")
          .eq("warehouse_id", receiptData.warehouse_id)
          .eq("sku", item.sku)
          .single();

        if (existing) {
          await supabase
            .from("inventory_locations")
            .update({ 
              quantity: existing.quantity + item.received_quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("inventory_locations")
            .insert({
              warehouse_id: receiptData.warehouse_id,
              product_id: item.product_id || null,
              sku: item.sku,
              quantity: item.received_quantity,
            });
        }
      }

      // 발주서 품목 입고수량 업데이트
      if (receiptData.purchase_order_id) {
        for (const item of items) {
          if (item.purchase_order_item_id) {
            const { data: poItem } = await supabase
              .from("purchase_order_items")
              .select("received_quantity")
              .eq("id", item.purchase_order_item_id)
              .single();
            
            if (poItem) {
              await supabase
                .from("purchase_order_items")
                .update({ 
                  received_quantity: (poItem.received_quantity || 0) + item.received_quantity 
                })
                .eq("id", item.purchase_order_item_id);
            }
          }
        }
      }
    }

    return { success: true, message: "입고가 완료되었습니다." };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    
    // 소프트 삭제 (is_deleted = true, deleted_at 설정)
    const { error } = await supabase
      .from("stock_receipts")
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true, message: "입고가 삭제되었습니다." };
  }

  return { error: "Unknown action" };
}

interface ReceiptItem {
  purchase_order_item_id?: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  expected_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
}

export default function StockReceiptList({ loaderData, actionData }: Route.ComponentProps) {
  const { receipts, warehouses, purchaseOrders, products, search, statusFilter, warehouseFilter, newReceiptNumber } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [selectedWarehouse, setSelectedWarehouse] = useState(warehouseFilter);
  const [deleteReceipt, setDeleteReceipt] = useState<any | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [receiptMode, setReceiptMode] = useState<"po" | "direct">("po");
  const [formData, setFormData] = useState({
    receipt_number: newReceiptNumber,
    purchase_order_id: "",
    warehouse_id: "",
    receipt_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [items, setItems] = useState<ReceiptItem[]>([]);

  // 제품 추가용 다이얼로그
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedStatus) params.set("status", selectedStatus);
    if (selectedWarehouse) params.set("warehouse", selectedWarehouse);
    navigate(`/dashboard/stock-receipts?${params.toString()}`);
  };

  const handleDelete = () => {
    if (!deleteReceipt) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", deleteReceipt.id);
    fetcher.submit(form, { method: "post" });
    setDeleteReceipt(null);
  };

  const openCreateDialog = () => {
    setFormData({
      receipt_number: newReceiptNumber,
      purchase_order_id: "",
      warehouse_id: "",
      receipt_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setItems([]);
    setReceiptMode("po");
    setIsDialogOpen(true);
  };

  const handlePOSelect = (poId: string) => {
    const po = purchaseOrders.find((p: any) => p.id === poId);
    if (po) {
      setFormData({ ...formData, purchase_order_id: poId });
      setItems(po.items.map((item: any) => ({
        purchase_order_item_id: item.id,
        product_id: null,
        sku: item.sku,
        product_name: item.product_name,
        expected_quantity: item.quantity - (item.received_quantity || 0),
        received_quantity: item.quantity - (item.received_quantity || 0),
        damaged_quantity: 0,
      })));
    }
  };

  const addDirectProduct = (product: any) => {
    setItems([...items, {
      product_id: product.id,
      sku: product.sku,
      product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
      expected_quantity: 0,
      received_quantity: 1,
      damaged_quantity: 0,
    }]);
    setIsProductDialogOpen(false);
    setProductSearch("");
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.received_quantity, 0);

  const handleSubmit = () => {
    const form = new FormData();
    form.append("intent", "create");
    form.append("receipt_number", formData.receipt_number);
    form.append("purchase_order_id", formData.purchase_order_id);
    form.append("warehouse_id", formData.warehouse_id);
    form.append("receipt_date", formData.receipt_date);
    form.append("notes", formData.notes);
    form.append("total_quantity", String(totalQuantity));
    form.append("items", JSON.stringify(items));
    
    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  // 필터링된 제품 목록
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = 
      p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesColor = !colorFilter || colorFilter === "__all__" || p.color_kr === colorFilter;
    const matchesSize = !sizeFilter || sizeFilter === "__all__" || p.sku_6_size === sizeFilter;
    const matchesCategory = !categoryFilter || categoryFilter === "__all__" || p.parent_product?.product_name === categoryFilter;
    return matchesSearch && matchesColor && matchesSize && matchesCategory;
  });

  // 사용 가능한 필터 옵션
  const availableColors = Array.from(new Set(products.map((p: any) => p.color_kr).filter(Boolean))).sort();
  const availableSizes = Array.from(new Set(products.map((p: any) => p.sku_6_size).filter(Boolean))).sort();
  const availableCategories = Array.from(new Set(products.map((p: any) => p.parent_product?.product_name).filter(Boolean))).sort();

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const addSelectedProducts = () => {
    const productsToAdd = filteredProducts.filter((p: any) => selectedProducts.has(p.id));
    const newItems = productsToAdd.map((product: any) => ({
      product_id: product.id,
      sku: product.sku,
      product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
      expected_quantity: 0,
      received_quantity: 1,
      damaged_quantity: 0,
    }));
    setItems([...items, ...newItems]);
    setSelectedProducts(new Set());
    setIsProductDialogOpen(false);
    setProductSearch("");
    setColorFilter("");
    setSizeFilter("");
    setCategoryFilter("");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageIcon className="w-6 h-6" />
            입고 관리
          </h1>
          <p className="text-muted-foreground">
            발주 입고 및 직접 입고를 관리합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          입고 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="입고번호 검색..."
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
                {receiptStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="창고 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">창고 전체</SelectItem>
                {warehouses.map((wh: any) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.warehouse_name}
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
                <TableHead>입고번호</TableHead>
                <TableHead>발주번호</TableHead>
                <TableHead>창고</TableHead>
                <TableHead>입고일</TableHead>
                <TableHead className="text-center">품목수</TableHead>
                <TableHead className="text-right">총 수량</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    입고 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt: any) => {
                  const statusInfo = getStatusInfo(receipt.status);
                  return (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {receipt.receipt_number}
                      </TableCell>
                      <TableCell>
                        {receipt.purchase_order ? (
                          <Link 
                            to={`/dashboard/purchase-orders/${receipt.purchase_order.id}`}
                            className="text-primary hover:underline"
                          >
                            {receipt.purchase_order.order_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">직접입고</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                          {receipt.warehouse?.warehouse_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(receipt.receipt_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {receipt.items?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {receipt.total_quantity?.toLocaleString() || 0}
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
                          onClick={() => setDeleteReceipt(receipt)}
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
      <AlertDialog open={!!deleteReceipt} onOpenChange={(open) => !open && setDeleteReceipt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입고 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              입고 "{deleteReceipt?.receipt_number}"를 삭제하시겠습니까?
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

      {/* 입고 등록 Sheet (오른쪽 슬라이드) */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>입고 등록</SheetTitle>
            <SheetDescription>
              입고 정보를 입력해주세요.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-6">
            {/* 입고 방식 선택 */}
            <div className="flex gap-4">
              <Button 
                variant={receiptMode === "po" ? "default" : "outline"}
                onClick={() => { setReceiptMode("po"); setItems([]); setFormData({ ...formData, purchase_order_id: "" }); }}
              >
                <ClipboardListIcon className="w-4 h-4 mr-2" />
                발주서 연결
              </Button>
              <Button 
                variant={receiptMode === "direct" ? "default" : "outline"}
                onClick={() => { setReceiptMode("direct"); setItems([]); setFormData({ ...formData, purchase_order_id: "" }); }}
              >
                <PackageIcon className="w-4 h-4 mr-2" />
                직접 입고
              </Button>
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>입고번호</Label>
                <Input value={formData.receipt_number} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>입고 창고 *</Label>
                <Select 
                  value={formData.warehouse_id} 
                  onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="창고 선택" />
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
              <div className="space-y-2">
                <Label>입고일</Label>
                <Input
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                />
              </div>
              {receiptMode === "po" && (
                <div className="space-y-2">
                  <Label>발주서 선택</Label>
                  <Select 
                    value={formData.purchase_order_id} 
                    onValueChange={handlePOSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="발주서 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders.map((po: any) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.order_number} - {po.factory?.factory_name} ({po.items?.length}품목)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 입고 품목 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>입고 품목</Label>
                {receiptMode === "direct" && (
                  <Button size="sm" onClick={() => setIsProductDialogOpen(true)}>
                    <PlusIcon className="w-4 h-4 mr-1" />
                    제품 추가
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    {receiptMode === "po" && <TableHead className="text-center">예정</TableHead>}
                    <TableHead className="text-center w-[100px]">입고</TableHead>
                    <TableHead className="text-center w-[100px]">불량</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={receiptMode === "po" ? 6 : 5} className="text-center py-4 text-muted-foreground">
                        {receiptMode === "po" ? "발주서를 선택해주세요." : "제품을 추가해주세요."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.product_name}</TableCell>
                        {receiptMode === "po" && (
                          <TableCell className="text-center">{item.expected_quantity}</TableCell>
                        )}
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.received_quantity}
                            onChange={(e) => updateItem(index, "received_quantity", parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.damaged_quantity}
                            onChange={(e) => updateItem(index, "damaged_quantity", parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
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
              총 입고 수량: {totalQuantity.toLocaleString()}개
            </div>
          </div>

          <SheetFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.warehouse_id || items.length === 0}
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              입고 완료
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 제품 선택 Sheet (오른쪽 슬라이드) */}
      <Sheet open={isProductDialogOpen} onOpenChange={(open) => {
        setIsProductDialogOpen(open);
        if (!open) {
          setProductSearch("");
          setSelectedProducts(new Set());
          setColorFilter("");
          setSizeFilter("");
          setCategoryFilter("");
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>제품 선택</SheetTitle>
            <SheetDescription>
              입고할 제품을 선택해주세요. 여러 개 선택 후 한번에 추가할 수 있습니다.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 px-6">
            {/* 검색 및 필터 */}
            <div className="space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="SKU 또는 제품명 검색..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="분류 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">분류 전체</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="색상 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">색상 전체</SelectItem>
                    {availableColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="사이즈 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">사이즈 전체</SelectItem>
                    {availableSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProducts.size > 0 && (
                <div className="flex items-center justify-between p-2 bg-accent rounded-lg">
                  <span className="text-sm font-medium">{selectedProducts.size}개 선택됨</span>
                  <Button onClick={addSelectedProducts} size="sm">
                    선택한 제품 추가 ({selectedProducts.size})
                  </Button>
                </div>
              )}
            </div>

            {/* 제품 목록 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={filteredProducts.length > 0 && filteredProducts.every((p: any) => selectedProducts.has(p.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts(new Set(filteredProducts.map((p: any) => p.id)));
                            } else {
                              filteredProducts.forEach((p: any) => {
                                const newSelected = new Set(selectedProducts);
                                newSelected.delete(p.id);
                                setSelectedProducts(newSelected);
                              });
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-[80px]">추가</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>제품명</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>색상</TableHead>
                      <TableHead>사이즈</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 200).map((product: any) => (
                      <TableRow 
                        key={product.id}
                        className={selectedProducts.has(product.id) ? "bg-accent" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              addDirectProduct(product);
                              setIsProductDialogOpen(false);
                              setProductSearch("");
                              setSelectedProducts(new Set());
                            }}
                          >
                            추가
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>{product.product_name || "-"}</TableCell>
                        <TableCell>{product.parent_product?.product_name || "-"}</TableCell>
                        <TableCell>{product.color_kr || "-"}</TableCell>
                        <TableCell>{product.sku_6_size || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <SheetFooter className="px-6">
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              취소
            </Button>
            {selectedProducts.size > 0 && (
              <Button onClick={addSelectedProducts}>
                선택한 제품 추가 ({selectedProducts.size})
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

