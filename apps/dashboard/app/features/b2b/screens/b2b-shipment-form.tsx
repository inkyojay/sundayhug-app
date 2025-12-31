/**
 * B2B 출고 지시 화면
 * - 주문 품목 (Parent SKU) → SKU 단위로 분할
 * - 색상/사이즈별 수량 입력
 * - 박스 번호 지정
 * - 배송 정보 입력
 */
import type { Route } from "./+types/b2b-shipment-form";

import {
  TruckIcon,
  SaveIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  PackageIcon,
  BoxIcon,
  ChevronDownIcon,
  CheckIcon,
  WarehouseIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useFetcher, redirect } from "react-router";

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
import { Checkbox } from "~/core/components/ui/checkbox";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { Separator } from "~/core/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/core/components/ui/accordion";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `출고 지시 - ${data?.order?.order_number || ""} | Sundayhug Admin` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const orderId = params.id;

  // 주문 조회
  const { data: order, error } = await supabase
    .from("b2b_orders")
    .select(`
      *,
      customer:b2b_customers(id, customer_code, company_name, business_type)
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Response("주문을 찾을 수 없습니다.", { status: 404 });
  }

  // 주문 품목 조회
  const { data: orderItems } = await supabase
    .from("b2b_order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");

  // Parent SKU에 해당하는 SKU 목록 조회
  const parentSkus = orderItems?.map((item: any) => item.parent_sku) || [];

  const { data: products } = await supabase
    .from("products")
    .select("id, sku, product_name, color_kr, sku_6_size, parent_sku")
    .in("parent_sku", parentSkus)
    .eq("is_active", true)
    .order("sku");

  // SKU를 Parent SKU별로 그룹화
  const productsByParentSku: Record<string, any[]> = {};
  products?.forEach((product: any) => {
    if (!productsByParentSku[product.parent_sku]) {
      productsByParentSku[product.parent_sku] = [];
    }
    productsByParentSku[product.parent_sku].push(product);
  });

  // 창고 목록 조회
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, warehouse_code, warehouse_name, is_default")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("is_default", { ascending: false });

  // 모든 SKU에 대해 창고별 재고 조회
  const allSkus = products?.map((p: any) => p.sku) || [];
  const { data: inventoryLocations } = await supabase
    .from("inventory_locations")
    .select("warehouse_id, sku, quantity")
    .in("sku", allSkus);

  // SKU별 창고별 재고 맵 생성
  const inventoryBySkuWarehouse: Record<string, Record<string, number>> = {};
  inventoryLocations?.forEach((loc: any) => {
    if (!inventoryBySkuWarehouse[loc.sku]) {
      inventoryBySkuWarehouse[loc.sku] = {};
    }
    inventoryBySkuWarehouse[loc.sku][loc.warehouse_id] = loc.quantity;
  });

  // 새 출고번호 생성
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("b2b_shipments")
    .select("*", { count: "exact", head: true })
    .ilike("shipment_number", `SHP-${today}%`);

  const newShipmentNumber = `SHP-${today}-${String((count || 0) + 1).padStart(4, "0")}`;

  // 기본 창고 ID
  const defaultWarehouse = warehouses?.find((w: any) => w.is_default);

  return {
    order,
    orderItems: orderItems || [],
    productsByParentSku,
    newShipmentNumber,
    warehouses: warehouses || [],
    inventoryBySkuWarehouse,
    defaultWarehouseId: defaultWarehouse?.id || null,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const orderId = params.id;

  if (intent === "save") {
    const warehouseId = formData.get("warehouse_id") as string;

    if (!warehouseId) {
      return { success: false, error: "출고 창고를 선택해주세요." };
    }

    const shipmentData = {
      order_id: orderId,
      shipment_number: formData.get("shipment_number") as string,
      warehouse_id: warehouseId,
      status: (formData.get("status") as string) || "pending",
      planned_date: (formData.get("planned_date") as string) || null,
      shipping_method: (formData.get("shipping_method") as string) || null,
      carrier_name: (formData.get("carrier_name") as string) || null,
      tracking_number: (formData.get("tracking_number") as string) || null,
      shipping_cost: parseFloat(formData.get("shipping_cost") as string) || 0,
      notes: (formData.get("notes") as string) || null,
    };

    const items = JSON.parse((formData.get("items") as string) || "[]");

    // 출고 지시 생성
    const { data: newShipment, error } = await supabase
      .from("b2b_shipments")
      .insert(shipmentData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 출고 품목 생성
    if (items.length > 0 && newShipment) {
      const itemsToInsert = items.map((item: any) => ({
        shipment_id: newShipment.id,
        order_item_id: item.order_item_id || null,
        sku: item.sku,
        product_id: item.product_id || null,
        product_name: item.product_name,
        color: item.color || null,
        size: item.size || null,
        quantity: item.quantity,
        box_number: item.box_number || null,
      }));

      const { error: itemsError } = await supabase
        .from("b2b_shipment_items")
        .insert(itemsToInsert);

      if (itemsError) {
        // 롤백 - 출고 지시 삭제
        await supabase.from("b2b_shipments").delete().eq("id", newShipment.id);
        return { success: false, error: itemsError.message };
      }
    }

    // 주문 상태 업데이트
    await supabase
      .from("b2b_orders")
      .update({
        status: "shipping",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return redirect(`/dashboard/b2b/orders/${orderId}`);
  }

  return { success: false, error: "Unknown intent" };
}

interface ShipmentItem {
  order_item_id: string;
  parent_sku: string;
  sku: string;
  product_id: string;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  box_number: number | null;
}

export default function B2BShipmentForm({ loaderData }: Route.ComponentProps) {
  const {
    order,
    orderItems,
    productsByParentSku,
    newShipmentNumber,
    warehouses,
    inventoryBySkuWarehouse,
    defaultWarehouseId,
  } = loaderData;
  const fetcher = useFetcher();

  const [formData, setFormData] = useState({
    shipment_number: newShipmentNumber,
    warehouse_id: defaultWarehouseId || "",
    status: "pending",
    planned_date: "",
    shipping_method: "",
    carrier_name: "",
    tracking_number: "",
    shipping_cost: 0,
    notes: "",
  });

  // 선택된 창고의 SKU별 재고 조회 헬퍼
  const getSkuStock = (sku: string) => {
    if (!formData.warehouse_id) return 0;
    return inventoryBySkuWarehouse[sku]?.[formData.warehouse_id] || 0;
  };

  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [skuQuantities, setSkuQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (fetcher.data?.success === false && fetcher.data?.error) {
      setMessage(`❌ ${fetcher.data.error}`);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetcher.data]);

  // SKU 수량 업데이트
  const updateSkuQuantity = (sku: string, quantity: number) => {
    setSkuQuantities((prev) => ({
      ...prev,
      [sku]: quantity,
    }));
  };

  // SKU 추가 (아코디언 내에서 직접 추가)
  const addSkuItem = (product: any, orderItem: any, quantity: number) => {
    if (quantity <= 0) return;

    const newItem: ShipmentItem = {
      order_item_id: orderItem.id,
      parent_sku: orderItem.parent_sku,
      sku: product.sku,
      product_id: product.id,
      product_name: product.product_name || orderItem.product_name,
      color: product.color_kr || "",
      size: product.sku_6_size || "",
      quantity: quantity,
      box_number: null,
    };

    // 이미 동일한 SKU가 있는지 확인
    const existingIndex = items.findIndex((item) => item.sku === product.sku);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += quantity;
      setItems(newItems);
    } else {
      setItems([...items, newItem]);
    }

    // 수량 초기화
    setSkuQuantities((prev) => ({
      ...prev,
      [product.sku]: 0,
    }));
  };

  // 품목 업데이트
  const updateItem = (index: number, field: keyof ShipmentItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  // 품목 삭제
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 저장
  const handleSave = () => {
    if (items.length === 0) {
      setMessage("❌ 출고 품목을 추가해주세요.");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const form = new FormData();
    form.append("intent", "save");
    form.append("shipment_number", formData.shipment_number);
    form.append("warehouse_id", formData.warehouse_id);
    form.append("status", formData.status);
    form.append("planned_date", formData.planned_date);
    form.append("shipping_method", formData.shipping_method);
    form.append("carrier_name", formData.carrier_name);
    form.append("tracking_number", formData.tracking_number);
    form.append("shipping_cost", String(formData.shipping_cost));
    form.append("notes", formData.notes);
    form.append("items", JSON.stringify(items));

    fetcher.submit(form, { method: "POST" });
  };

  // 총 수량 계산
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Parent SKU별 주문 수량 대비 출고 수량 계산
  const getOrderItemStats = (orderItem: any) => {
    const orderedQty = orderItem.quantity;
    const shippingQty = items
      .filter((item) => item.parent_sku === orderItem.parent_sku)
      .reduce((sum, item) => sum + item.quantity, 0);
    return { orderedQty, shippingQty };
  };

  return (
    <div className="p-6 space-y-6">
      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/dashboard/b2b/orders/${order.id}`}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TruckIcon className="w-6 h-6" />
              출고 지시
            </h1>
            <p className="text-muted-foreground">
              주문번호: {order.order_number} | {order.customer?.company_name}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={fetcher.state !== "idle" || items.length === 0}>
          <SaveIcon className="w-4 h-4 mr-2" />
          출고 지시 생성
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 출고 정보 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>출고 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>출고번호</Label>
              <Input value={formData.shipment_number} disabled className="font-mono" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4" />
                출고 창고 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}
              >
                <SelectTrigger className={!formData.warehouse_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="창고를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh: any) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.warehouse_name}
                      {wh.is_default && " (기본)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.warehouse_id && (
                <p className="text-xs text-destructive">출고할 창고를 선택해주세요</p>
              )}
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
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="preparing">준비중</SelectItem>
                  <SelectItem value="shipped">출고됨</SelectItem>
                  <SelectItem value="delivered">배송완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>출고 예정일</Label>
              <Input
                type="date"
                value={formData.planned_date}
                onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>배송 방법</Label>
              <Input
                value={formData.shipping_method}
                onChange={(e) => setFormData({ ...formData, shipping_method: e.target.value })}
                placeholder="예: 택배, 항공, 해운"
              />
            </div>

            <div className="space-y-2">
              <Label>택배사</Label>
              <Input
                value={formData.carrier_name}
                onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                placeholder="예: CJ대한통운, DHL"
              />
            </div>

            <div className="space-y-2">
              <Label>운송장 번호</Label>
              <Input
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                placeholder="운송장 번호"
              />
            </div>

            <div className="space-y-2">
              <Label>배송비</Label>
              <Input
                type="number"
                min="0"
                value={formData.shipping_cost}
                onChange={(e) =>
                  setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="출고 관련 메모"
              />
            </div>

            <Separator />

            <div className="pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 품목</span>
                <span className="font-medium">{items.length}건</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-2">
                <span>총 수량</span>
                <span>{totalQuantity.toLocaleString()}개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 출고 품목 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>출고 품목 (SKU 단위)</CardTitle>
            <CardDescription>주문 품목에서 SKU를 선택하여 출고 수량을 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 주문 품목 (Parent SKU) 아코디언 */}
            <div>
              <h3 className="font-medium mb-3">주문 품목에서 SKU 선택</h3>
              <Accordion type="multiple" className="space-y-2">
                {orderItems.map((orderItem: any) => {
                  const { orderedQty, shippingQty } = getOrderItemStats(orderItem);
                  const skuList = productsByParentSku[orderItem.parent_sku] || [];
                  const isComplete = shippingQty >= orderedQty;

                  return (
                    <AccordionItem
                      key={orderItem.id}
                      value={orderItem.id}
                      className={`border rounded-lg overflow-hidden ${
                        isComplete ? "border-green-300 bg-green-50/50" : ""
                      }`}
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="text-left">
                            <div className="font-medium flex items-center gap-2">
                              {orderItem.product_name}
                              {isComplete && (
                                <CheckIcon className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              주문: {orderedQty}개 | 출고예정:{" "}
                              <span
                                className={
                                  shippingQty > orderedQty
                                    ? "text-red-600 font-medium"
                                    : shippingQty === orderedQty
                                    ? "text-green-600 font-medium"
                                    : ""
                                }
                              >
                                {shippingQty}개
                              </span>
                            </div>
                          </div>
                          <Badge variant={skuList.length > 0 ? "secondary" : "outline"} className="ml-2">
                            {skuList.length}개 SKU
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {skuList.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            등록된 SKU가 없습니다.
                          </div>
                        ) : (
                          <div className="space-y-2 pt-2">
                            {skuList.map((product: any) => {
                              const addedItem = items.find((item) => item.sku === product.sku);
                              const inputQty = skuQuantities[product.sku] || 0;
                              const stockQty = getSkuStock(product.sku);
                              const totalAdded = addedItem?.quantity || 0;
                              const isStockLow = stockQty < (inputQty + totalAdded);
                              const isOutOfStock = stockQty === 0;

                              return (
                                <div
                                  key={product.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    addedItem
                                      ? "bg-green-50 border-green-200"
                                      : isOutOfStock
                                      ? "bg-red-50/50 border-red-200"
                                      : "bg-muted/30"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm">{product.sku}</span>
                                      {addedItem && (
                                        <Badge variant="default" className="text-xs">
                                          {addedItem.quantity}개 추가됨
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                                      <span>색상: {product.color_kr || "-"}</span>
                                      <span>사이즈: {product.sku_6_size || "-"}</span>
                                      <span className={`font-medium ${
                                        isOutOfStock
                                          ? "text-red-600"
                                          : stockQty < 10
                                          ? "text-orange-600"
                                          : "text-green-600"
                                      }`}>
                                        재고: {stockQty}개
                                      </span>
                                    </div>
                                    {isStockLow && inputQty > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                                        <AlertTriangleIcon className="w-3 h-3" />
                                        재고 부족 (요청: {inputQty + totalAdded}개)
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <Input
                                      type="number"
                                      min="1"
                                      max={stockQty}
                                      placeholder="수량"
                                      value={inputQty || ""}
                                      onChange={(e) =>
                                        updateSkuQuantity(product.sku, parseInt(e.target.value) || 0)
                                      }
                                      className={`w-20 h-9 ${isStockLow && inputQty > 0 ? "border-orange-400" : ""}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => addSkuItem(product, orderItem, inputQty || 1)}
                                      disabled={!inputQty && inputQty !== 0}
                                      variant={isOutOfStock ? "outline" : "default"}
                                    >
                                      <PlusIcon className="w-4 h-4 mr-1" />
                                      추가
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            <Separator />

            {/* 출고 품목 (SKU) 테이블 */}
            <div>
              <h3 className="font-medium mb-3">출고 품목 상세</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>색상</TableHead>
                    <TableHead>사이즈</TableHead>
                    <TableHead className="w-[80px]">수량</TableHead>
                    <TableHead className="w-[80px]">박스#</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        주문 품목에서 SKU를 선택하여 추가해주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{item.product_name}</TableCell>
                        <TableCell>{item.color || "-"}</TableCell>
                        <TableCell>{item.size || "-"}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.box_number || ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "box_number",
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-16"
                            placeholder="-"
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
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
