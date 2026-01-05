/**
 * 발주 관리 - 발주서 작성/상세/수정
 */
import type { Route } from "./+types/purchase-order-form";

import {
  ClipboardListIcon,
  SaveIcon,
  PlusIcon,
  TrashIcon,
  DownloadIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";

import makeServerClient from "~/core/lib/supa-client.server";

// lib imports
import {
  type OrderItem,
  type Product,
  type PurchaseOrderFormData,
  ORDER_STATUS_OPTIONS,
  getTodayDateString,
  buildFullProductName,
  generateOrderText,
  downloadTextFile,
} from "../lib/purchase-orders.shared";
import {
  getFactories,
  getProducts,
  getPurchaseOrder,
  generateOrderNumber,
  savePurchaseOrder,
  deletePurchaseOrder,
  parseOrderFormData,
} from "../lib/purchase-orders.server";

// component imports
import { OrderSummary, OrderItemsTable, ProductSelector } from "../components";

export const meta: Route.MetaFunction = ({ data }) => {
  const title = data?.order ? `발주서 ${data.order.order_number}` : "발주서 작성";
  return [{ title: `${title} | Sundayhug Admin` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const orderId = params.id;

  const [factories, products] = await Promise.all([
    getFactories(supabase),
    getProducts(supabase),
  ]);

  // 기존 발주서 조회 (수정 모드)
  let order = null;
  let orderItems: OrderItem[] = [];

  if (orderId && orderId !== "new") {
    const result = await getPurchaseOrder(supabase, orderId);
    order = result.order;
    orderItems = result.items;
  }

  // 새 발주번호 생성
  let newOrderNumber = "";
  if (!order) {
    newOrderNumber = await generateOrderNumber(supabase);
  }

  return {
    order,
    orderItems,
    factories,
    products,
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
    const { orderData, items } = parseOrderFormData(formData);
    return savePurchaseOrder(supabase, orderId ?? null, orderData, items);
  }

  if (intent === "delete") {
    const orderId = params.id;
    if (orderId && orderId !== "new") {
      return deletePurchaseOrder(supabase, orderId);
    }
  }

  return { error: "Unknown action" };
}

export default function PurchaseOrderForm({ loaderData }: Route.ComponentProps) {
  const { order, orderItems, factories, products, newOrderNumber, isNew } = loaderData;
  const fetcher = useFetcher();

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    order_number: order?.order_number || newOrderNumber,
    factory_id: order?.factory_id || "",
    status: order?.status || "draft",
    order_date: order?.order_date || getTodayDateString(),
    expected_date: order?.expected_date || "",
    notes: order?.notes || "",
  });

  const [items, setItems] = useState<OrderItem[]>(
    orderItems.length > 0
      ? orderItems.map((item) => ({
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

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleAddProducts = (selectedProducts: Product[]) => {
    const newItems = [...items];

    selectedProducts.forEach((product) => {
      const existingIndex = newItems.findIndex((item) => item.sku === product.sku);
      if (existingIndex >= 0) {
        newItems[existingIndex].quantity += 1;
      } else {
        newItems.push({
          product_id: product.id,
          sku: product.sku,
          product_name: buildFullProductName(product),
          quantity: 1,
          unit_price: product.cost_price || 0,
        });
      }
    });

    setItems(newItems);
  };

  const handleAddSingleProduct = (product: Product) => {
    const existingIndex = items.findIndex((item) => item.sku === product.sku);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          sku: product.sku,
          product_name: buildFullProductName(product),
          quantity: 1,
          unit_price: product.cost_price || 0,
        },
      ]);
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

  const handleDownload = () => {
    const factory = factories.find((f) => f.id === formData.factory_id);
    const content = generateOrderText(formData, items, factory?.factory_name || null);
    downloadTextFile(content, `${formData.order_number}.txt`);
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
              <Button variant="outline" onClick={handleDownload}>
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
                  {factories.map((factory) => (
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
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
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

            <OrderSummary
              itemCount={items.length}
              totalQuantity={totalQuantity}
              totalAmount={totalAmount}
            />
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
            <OrderItemsTable
              items={items}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </CardContent>
        </Card>
      </div>

      {/* 제품 선택 Sheet */}
      <ProductSelector
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        products={products}
        onSelectProducts={handleAddProducts}
        onAddSingleProduct={handleAddSingleProduct}
      />
    </div>
  );
}
