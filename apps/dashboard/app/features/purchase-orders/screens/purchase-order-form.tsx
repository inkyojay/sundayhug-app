/**
 * 발주 관리 - 발주서 작성/상세/수정
 */
import type { Route } from "./+types/purchase-order-form";

import { 
  ClipboardListIcon, 
  SaveIcon,
  PlusIcon, 
  TrashIcon,
  SearchIcon,
  DownloadIcon,
  SendIcon,
  ArrowLeftIcon,
  PackageIcon,
  FactoryIcon,
  CalendarIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useFetcher, useNavigate, redirect } from "react-router";

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
import { Checkbox } from "~/core/components/ui/checkbox";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = ({ data }) => {
  const title = data?.order ? `발주서 ${data.order.order_number}` : "발주서 작성";
  return [{ title: `${title} | Sundayhug Admin` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const orderId = params.id;

  // 공장 목록 조회
  const { data: factories } = await supabase
    .from("factories")
    .select("id, factory_name, factory_code")
    .eq("is_active", true)
    .order("factory_name");

  // 제품 목록 조회 (SKU 선택용)
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, sku, product_name, color_kr, sku_6_size, cost_price, parent_sku,
      parent_product:parent_products!fk_parent_product(id, product_name)
    `)
    .eq("is_active", true)
    .order("sku");

  // 기존 발주서 조회 (수정 모드)
  let order = null;
  let orderItems: any[] = [];

  if (orderId && orderId !== "new") {
    const { data: orderData } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        factory:factories(id, factory_name, factory_code)
      `)
      .eq("id", orderId)
      .single();

    if (orderData) {
      order = orderData;

      const { data: itemsData } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", orderId)
        .order("created_at");

      orderItems = itemsData || [];
    }
  }

  // 새 발주번호 생성
  let newOrderNumber = "";
  if (!order) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true })
      .ilike("order_number", `PO-${today}%`);
    
    newOrderNumber = `PO-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
  }

  return { 
    order, 
    orderItems,
    factories: factories || [], 
    products: products || [],
    newOrderNumber,
    isNew: !order,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    const orderId = params.id !== "new" ? params.id : null;
    const orderData = {
      order_number: formData.get("order_number") as string,
      factory_id: formData.get("factory_id") as string,
      status: formData.get("status") as string || "draft",
      order_date: formData.get("order_date") as string,
      expected_date: formData.get("expected_date") as string || null,
      notes: formData.get("notes") as string || null,
      total_quantity: parseInt(formData.get("total_quantity") as string) || 0,
      total_amount: parseFloat(formData.get("total_amount") as string) || 0,
    };

    const items = JSON.parse(formData.get("items") as string || "[]");

    if (orderId) {
      // 수정
      const { error } = await supabase
        .from("purchase_orders")
        .update({ ...orderData, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      
      if (error) return { error: error.message };

      // 기존 품목 삭제 후 재삽입
      await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", orderId);

      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          purchase_order_id: orderId,
          product_id: item.product_id || null,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        await supabase.from("purchase_order_items").insert(itemsToInsert);
      }

      return { success: true, message: "발주서가 수정되었습니다." };
    } else {
      // 새로 생성
      const { data: newOrder, error } = await supabase
        .from("purchase_orders")
        .insert(orderData)
        .select()
        .single();
      
      if (error) return { error: error.message };

      if (items.length > 0 && newOrder) {
        const itemsToInsert = items.map((item: any) => ({
          purchase_order_id: newOrder.id,
          product_id: item.product_id || null,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        await supabase.from("purchase_order_items").insert(itemsToInsert);
      }

      return redirect(`/dashboard/purchase-orders/${newOrder?.id}`);
    }
  }

  if (intent === "delete") {
    const orderId = params.id;
    if (orderId && orderId !== "new") {
      await supabase.from("purchase_order_items").delete().eq("purchase_order_id", orderId);
      await supabase.from("purchase_orders").delete().eq("id", orderId);
      return redirect("/dashboard/purchase-orders");
    }
  }

  return { error: "Unknown action" };
}

interface OrderItem {
  id?: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export default function PurchaseOrderForm({ loaderData, actionData }: Route.ComponentProps) {
  const { order, orderItems, factories, products, newOrderNumber, isNew } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [formData, setFormData] = useState({
    order_number: order?.order_number || newOrderNumber,
    factory_id: order?.factory_id || "",
    status: order?.status || "draft",
    order_date: order?.order_date || new Date().toISOString().slice(0, 10),
    expected_date: order?.expected_date || "",
    notes: order?.notes || "",
  });

  const [items, setItems] = useState<OrderItem[]>(
    orderItems.length > 0 
      ? orderItems.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      : []
  );

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

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
    const newItems = [...items];
    
    productsToAdd.forEach((product: any) => {
      const existingIndex = newItems.findIndex(item => item.sku === product.sku);
      if (existingIndex >= 0) {
        newItems[existingIndex].quantity += 1;
      } else {
        newItems.push({
          product_id: product.id,
          sku: product.sku,
          product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
          quantity: 1,
          unit_price: product.cost_price || 0,
        });
      }
    });
    
    setItems(newItems);
    setSelectedProducts(new Set());
    setIsProductDialogOpen(false);
    setProductSearch("");
  };

  const addProduct = (product: any) => {
    const existingIndex = items.findIndex(item => item.sku === product.sku);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: product.id,
        sku: product.sku,
        product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
        quantity: 1,
        unit_price: product.cost_price || 0,
      }]);
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const form = new FormData();
    form.append("intent", "save");
    form.append("order_number", formData.order_number);
    form.append("factory_id", formData.factory_id);
    form.append("status", formData.status);
    form.append("order_date", formData.order_date);
    form.append("expected_date", formData.expected_date);
    form.append("notes", formData.notes);
    form.append("total_quantity", String(totalQuantity));
    form.append("total_amount", String(totalAmount));
    form.append("items", JSON.stringify(items));
    
    fetcher.submit(form, { method: "post" });
  };

  const handleDelete = () => {
    if (confirm("발주서를 삭제하시겠습니까?")) {
      const form = new FormData();
      form.append("intent", "delete");
      fetcher.submit(form, { method: "post" });
    }
  };

  const downloadPDF = () => {
    // 간단한 발주서 텍스트 다운로드 (실제 PDF는 별도 라이브러리 필요)
    const factory = factories.find((f: any) => f.id === formData.factory_id);
    let content = `발주서\n${"=".repeat(50)}\n\n`;
    content += `발주번호: ${formData.order_number}\n`;
    content += `공장: ${factory?.factory_name || "-"}\n`;
    content += `발주일: ${formData.order_date}\n`;
    content += `예상입고일: ${formData.expected_date || "-"}\n\n`;
    content += `품목\n${"-".repeat(50)}\n`;
    items.forEach((item, i) => {
      content += `${i + 1}. ${item.sku} - ${item.product_name}\n`;
      content += `   수량: ${item.quantity}개, 단가: ${item.unit_price.toLocaleString()}원\n`;
    });
    content += `${"-".repeat(50)}\n`;
    content += `총 수량: ${totalQuantity}개\n`;
    content += `총 금액: ${totalAmount.toLocaleString()}원\n`;
    if (formData.notes) {
      content += `\n비고: ${formData.notes}\n`;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formData.order_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/purchase-orders">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardListIcon className="w-6 h-6" />
              {isNew ? "발주서 작성" : `발주서 ${order?.order_number}`}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "새 발주서를 작성합니다." : "발주서 상세 정보입니다."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" onClick={downloadPDF}>
                <DownloadIcon className="w-4 h-4 mr-2" />
                다운로드
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <TrashIcon className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={!formData.factory_id || items.length === 0}>
            <SaveIcon className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 발주 정보 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>발주 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>발주번호</Label>
              <Input value={formData.order_number} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>공장 *</Label>
              <Select 
                value={formData.factory_id} 
                onValueChange={(v) => setFormData({ ...formData, factory_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="공장 선택" />
                </SelectTrigger>
                <SelectContent>
                  {factories.map((factory: any) => (
                    <SelectItem key={factory.id} value={factory.id}>
                      {factory.factory_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">작성중</SelectItem>
                  <SelectItem value="sent">발주완료</SelectItem>
                  <SelectItem value="in_production">제작중</SelectItem>
                  <SelectItem value="shipping">배송중</SelectItem>
                  <SelectItem value="received">입고완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>발주일</Label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>예상입고일</Label>
              <Input
                type="date"
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 품목</span>
                <span className="font-medium">{items.length}건</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 수량</span>
                <span className="font-medium">{totalQuantity.toLocaleString()}개</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>총 금액</span>
                <span>{formatCurrency(totalAmount)}원</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 발주 품목 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>발주 품목</CardTitle>
              <Button onClick={() => setIsProductDialogOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                제품 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="w-[100px]">수량</TableHead>
                  <TableHead className="w-[120px]">단가</TableHead>
                  <TableHead className="text-right w-[120px]">금액</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      제품을 추가해주세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {item.sku}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.product_name}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <TrashIcon className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 제품 선택 Sheet (오른쪽 슬라이드) */}
      <Sheet open={isProductDialogOpen} onOpenChange={(open) => {
        setIsProductDialogOpen(open);
        if (!open) {
          setSelectedProducts(new Set());
          setProductSearch("");
          setColorFilter("");
          setSizeFilter("");
          setCategoryFilter("");
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>제품 선택</SheetTitle>
            <SheetDescription>
              발주할 제품을 선택해주세요. 여러 개 선택 후 한번에 추가할 수 있습니다.
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
                      <TableHead className="text-right">원가</TableHead>
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
                              addProduct(product);
                              setIsProductDialogOpen(false);
                              setProductSearch("");
                              setSelectedProducts(new Set());
                            }}
                          >
                            추가
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell>{product.product_name || "-"}</TableCell>
                        <TableCell>{product.parent_product?.product_name || "-"}</TableCell>
                        <TableCell>{product.color_kr || "-"}</TableCell>
                        <TableCell>{product.sku_6_size || "-"}</TableCell>
                        <TableCell className="text-right">
                          {product.cost_price ? formatCurrency(product.cost_price) : "-"}
                        </TableCell>
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

