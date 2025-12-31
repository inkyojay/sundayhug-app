/**
 * B2B 주문 작성/수정
 * - Parent SKU 기준으로 품목 관리
 * - 업체별 가격 자동 적용
 */
import type { Route } from "./+types/b2b-order-form";

import {
  ShoppingCartIcon,
  SaveIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useFetcher, useNavigate, redirect } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
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
  const title = data?.order ? `주문 ${data.order.order_number}` : "B2B 주문 작성";
  return [{ title: `${title} | Sundayhug Admin` }];
};

// 주문 상태 정의
const orderStatuses = [
  { value: "quote_draft", label: "견적 작성중" },
  { value: "quote_sent", label: "견적 발송" },
  { value: "confirmed", label: "주문 확정" },
  { value: "invoice_created", label: "인보이스 발행" },
  { value: "shipping", label: "출고 준비" },
  { value: "shipped", label: "출고 완료" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const orderId = params.id;

  // 업체 목록 조회
  const { data: customers } = await supabase
    .from("b2b_customers")
    .select("id, customer_code, company_name, business_type, currency, payment_terms")
    .eq("is_deleted", false)
    .eq("is_active", true)
    .order("company_name");

  // Parent Products 목록 조회 (견적용)
  const { data: parentProducts, error: parentProductsError } = await supabase
    .from("parent_products")
    .select("parent_sku, product_name, category, subcategory")
    .order("product_name");

  if (parentProductsError) {
    console.error("Parent Products 조회 에러:", parentProductsError);
  }

  // 기존 주문 조회 (수정 모드)
  let order = null;
  let orderItems: any[] = [];
  let customerPrices: Record<string, number> = {};

  if (orderId && orderId !== "new") {
    const { data: orderData } = await supabase
      .from("b2b_orders")
      .select(`
        *,
        customer:b2b_customers(id, customer_code, company_name, business_type, currency, payment_terms)
      `)
      .eq("id", orderId)
      .single();

    if (orderData) {
      order = orderData;

      const { data: itemsData } = await supabase
        .from("b2b_order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");

      orderItems = itemsData || [];

      // 업체별 가격표 조회
      if (orderData.customer_id) {
        const { data: pricesData } = await supabase
          .from("b2b_customer_prices")
          .select("parent_sku, unit_price")
          .eq("customer_id", orderData.customer_id);

        if (pricesData) {
          pricesData.forEach((p) => {
            customerPrices[p.parent_sku] = p.unit_price;
          });
        }
      }
    }
  }

  // 새 주문번호 생성
  let newOrderNumber = "";
  if (!order) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("b2b_orders")
      .select("*", { count: "exact", head: true })
      .ilike("order_number", `B2B-${today}%`);

    newOrderNumber = `B2B-${today}-${String((count || 0) + 1).padStart(4, "0")}`;
  }

  return {
    order,
    orderItems,
    customers: customers || [],
    parentProducts: parentProducts || [],
    customerPrices,
    newOrderNumber,
    isNew: !order,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "get_customer_prices") {
    const customerId = formData.get("customer_id") as string;

    const { data: pricesData } = await supabase
      .from("b2b_customer_prices")
      .select("parent_sku, unit_price")
      .eq("customer_id", customerId);

    const prices: Record<string, number> = {};
    if (pricesData) {
      pricesData.forEach((p) => {
        prices[p.parent_sku] = p.unit_price;
      });
    }

    return { success: true, prices };
  }

  if (intent === "save") {
    const orderId = params.id !== "new" ? params.id : null;
    const orderData = {
      order_number: formData.get("order_number") as string,
      customer_id: formData.get("customer_id") as string,
      status: (formData.get("status") as string) || "quote_draft",
      order_date: formData.get("order_date") as string,
      quote_valid_until: (formData.get("quote_valid_until") as string) || null,
      currency: (formData.get("currency") as string) || "KRW",
      subtotal: parseFloat(formData.get("subtotal") as string) || 0,
      discount_amount: parseFloat(formData.get("discount_amount") as string) || 0,
      shipping_cost: parseFloat(formData.get("shipping_cost") as string) || 0,
      tax_amount: parseFloat(formData.get("tax_amount") as string) || 0,
      total_amount: parseFloat(formData.get("total_amount") as string) || 0,
      payment_terms: (formData.get("payment_terms") as string) || null,
      shipping_address: (formData.get("shipping_address") as string) || null,
      shipping_address_en: (formData.get("shipping_address_en") as string) || null,
      internal_notes: (formData.get("internal_notes") as string) || null,
      customer_notes: (formData.get("customer_notes") as string) || null,
    };

    const items = JSON.parse((formData.get("items") as string) || "[]");

    if (orderId) {
      // 수정
      const { error } = await supabase
        .from("b2b_orders")
        .update({ ...orderData, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) return { success: false, error: error.message };

      // 기존 품목 삭제 후 재삽입
      await supabase.from("b2b_order_items").delete().eq("order_id", orderId);

      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          order_id: orderId,
          parent_sku: item.parent_sku,
          product_name: item.product_name,
          product_name_en: item.product_name_en || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_rate: item.discount_rate || 0,
          line_total: item.line_total,
          notes: item.notes || null,
        }));

        await supabase.from("b2b_order_items").insert(itemsToInsert);
      }

      return { success: true, message: "주문이 수정되었습니다." };
    } else {
      // 새로 생성
      const { data: newOrder, error } = await supabase
        .from("b2b_orders")
        .insert(orderData)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      if (items.length > 0 && newOrder) {
        const itemsToInsert = items.map((item: any) => ({
          order_id: newOrder.id,
          parent_sku: item.parent_sku,
          product_name: item.product_name,
          product_name_en: item.product_name_en || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_rate: item.discount_rate || 0,
          line_total: item.line_total,
          notes: item.notes || null,
        }));

        await supabase.from("b2b_order_items").insert(itemsToInsert);
      }

      return redirect(`/dashboard/b2b/orders/${newOrder?.id}`);
    }
  }

  if (intent === "delete") {
    const orderId = params.id;
    if (orderId && orderId !== "new") {
      await supabase.from("b2b_order_items").delete().eq("order_id", orderId);
      await supabase.from("b2b_orders").delete().eq("id", orderId);
      return redirect("/dashboard/b2b/orders");
    }
  }

  return { success: false, error: "Unknown action" };
}

interface OrderItem {
  id?: string;
  parent_sku: string;
  product_name: string;
  product_name_en: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  line_total: number;
  notes: string;
}

export default function B2BOrderForm({ loaderData }: Route.ComponentProps) {
  const { order, orderItems, customers, parentProducts, customerPrices: initialPrices, newOrderNumber, isNew } =
    loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [customerPrices, setCustomerPrices] = useState<Record<string, number>>(initialPrices);

  const [formData, setFormData] = useState({
    order_number: order?.order_number || newOrderNumber,
    customer_id: order?.customer_id || "",
    status: order?.status || "quote_draft",
    order_date: order?.order_date || new Date().toISOString().slice(0, 10),
    quote_valid_until: order?.quote_valid_until || "",
    currency: order?.currency || "KRW",
    discount_amount: order?.discount_amount || 0,
    shipping_cost: order?.shipping_cost || 0,
    tax_amount: order?.tax_amount || 0,
    payment_terms: order?.payment_terms || "",
    shipping_address: order?.shipping_address || "",
    shipping_address_en: order?.shipping_address_en || "",
    internal_notes: order?.internal_notes || "",
    customer_notes: order?.customer_notes || "",
  });

  const [items, setItems] = useState<OrderItem[]>(
    orderItems.length > 0
      ? orderItems.map((item: any) => ({
          id: item.id,
          parent_sku: item.parent_sku,
          product_name: item.product_name,
          product_name_en: item.product_name_en || "",
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_rate: item.discount_rate || 0,
          line_total: item.line_total,
          notes: item.notes || "",
        }))
      : []
  );

  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // 금액 계산
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const totalAmount =
    subtotal - formData.discount_amount + formData.shipping_cost + formData.tax_amount;

  // 업체 변경 시 가격표 로드
  useEffect(() => {
    if (formData.customer_id && formData.customer_id !== order?.customer_id) {
      const form = new FormData();
      form.append("intent", "get_customer_prices");
      form.append("customer_id", formData.customer_id);
      fetcher.submit(form, { method: "POST" });
    }
  }, [formData.customer_id]);

  // 가격표 로드 결과 처리
  useEffect(() => {
    if (fetcher.data?.prices) {
      setCustomerPrices(fetcher.data.prices);
      // 기존 품목들의 가격 업데이트
      if (items.length > 0) {
        setItems(
          items.map((item) => {
            const newPrice = fetcher.data.prices[item.parent_sku] || item.unit_price;
            return {
              ...item,
              unit_price: newPrice,
              line_total: item.quantity * newPrice * (1 - item.discount_rate / 100),
            };
          })
        );
      }
    }
    if (fetcher.data?.success === true && fetcher.data?.message) {
      setMessage(`✅ ${fetcher.data.message}`);
      setTimeout(() => setMessage(null), 3000);
    }
    if (fetcher.data?.success === false && fetcher.data?.error) {
      setMessage(`❌ ${fetcher.data.error}`);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetcher.data]);

  // 업체 선택 시 결제조건, 통화 자동 설정
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        currency: customer.currency || "KRW",
        payment_terms: customer.payment_terms || "",
      });
    }
  };

  // 필터링된 제품 목록
  const filteredProducts = parentProducts.filter((p: any) => {
    const matchesSearch =
      p.parent_sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory =
      !categoryFilter || categoryFilter === "__all__" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // 사용 가능한 카테고리 목록
  const availableCategories = Array.from(
    new Set(parentProducts.map((p: any) => p.category).filter(Boolean))
  ).sort();

  const toggleProductSelection = (parentSku: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(parentSku)) {
      newSelected.delete(parentSku);
    } else {
      newSelected.add(parentSku);
    }
    setSelectedProducts(newSelected);
  };

  const addSelectedProducts = () => {
    const productsToAdd = filteredProducts.filter((p: any) => selectedProducts.has(p.parent_sku));
    const newItems = [...items];

    productsToAdd.forEach((product: any) => {
      const existingIndex = newItems.findIndex((item) => item.parent_sku === product.parent_sku);
      if (existingIndex >= 0) {
        newItems[existingIndex].quantity += 1;
        newItems[existingIndex].line_total =
          newItems[existingIndex].quantity *
          newItems[existingIndex].unit_price *
          (1 - newItems[existingIndex].discount_rate / 100);
      } else {
        const unitPrice = customerPrices[product.parent_sku] || 0;
        newItems.push({
          parent_sku: product.parent_sku,
          product_name: product.product_name || "",
          product_name_en: "",
          quantity: 1,
          unit_price: unitPrice,
          discount_rate: 0,
          line_total: unitPrice,
          notes: "",
        });
      }
    });

    setItems(newItems);
    setSelectedProducts(new Set());
    setIsProductSheetOpen(false);
    setProductSearch("");
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    // line_total 재계산
    if (field === "quantity" || field === "unit_price" || field === "discount_rate") {
      const item = newItems[index];
      item.line_total = item.quantity * item.unit_price * (1 - item.discount_rate / 100);
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formData.customer_id) {
      setMessage("❌ 업체를 선택해주세요.");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const form = new FormData();
    form.append("intent", "save");
    form.append("order_number", formData.order_number);
    form.append("customer_id", formData.customer_id);
    form.append("status", formData.status);
    form.append("order_date", formData.order_date);
    form.append("quote_valid_until", formData.quote_valid_until);
    form.append("currency", formData.currency);
    form.append("subtotal", String(subtotal));
    form.append("discount_amount", String(formData.discount_amount));
    form.append("shipping_cost", String(formData.shipping_cost));
    form.append("tax_amount", String(formData.tax_amount));
    form.append("total_amount", String(totalAmount));
    form.append("payment_terms", formData.payment_terms);
    form.append("shipping_address", formData.shipping_address);
    form.append("shipping_address_en", formData.shipping_address_en);
    form.append("internal_notes", formData.internal_notes);
    form.append("customer_notes", formData.customer_notes);
    form.append("items", JSON.stringify(items));

    fetcher.submit(form, { method: "POST" });
  };

  const handleDelete = () => {
    if (confirm("주문을 삭제하시겠습니까?")) {
      const form = new FormData();
      form.append("intent", "delete");
      fetcher.submit(form, { method: "POST" });
    }
  };

  const formatCurrency = (amount: number, currency: string = "KRW") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    }
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
  };

  const selectedCustomer = customers.find((c: any) => c.id === formData.customer_id);

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
            <Link to="/dashboard/b2b/orders">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCartIcon className="w-6 h-6" />
              {isNew ? "B2B 주문 작성" : `주문 ${order?.order_number}`}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "새 B2B 주문(견적)을 작성합니다." : "주문 정보를 수정합니다."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="destructive" onClick={handleDelete}>
              <TrashIcon className="w-4 h-4 mr-2" />
              삭제
            </Button>
          )}
          <Button onClick={handleSave} disabled={fetcher.state !== "idle"}>
            <SaveIcon className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 주문 정보 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>주문 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>주문번호</Label>
              <Input value={formData.order_number} disabled className="font-mono" />
            </div>

            <div className="space-y-2">
              <Label>업체 *</Label>
              <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="업체 선택" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <BuildingIcon className="w-4 h-4" />
                        {customer.company_name}
                        <Badge variant="outline" className="ml-2">
                          {customer.business_type === "domestic" ? "국내" : "해외"}
                        </Badge>
                      </div>
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
                  {orderStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>주문일</Label>
                <Input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>견적 유효기간</Label>
                <Input
                  type="date"
                  value={formData.quote_valid_until}
                  onChange={(e) => setFormData({ ...formData, quote_valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>통화</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KRW">KRW (원)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>결제조건</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="예: 30일 후불"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>배송지 주소</Label>
              <Textarea
                value={formData.shipping_address}
                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                rows={2}
                placeholder="국문 주소"
              />
            </div>

            {selectedCustomer?.business_type === "overseas" && (
              <div className="space-y-2">
                <Label>배송지 주소 (영문)</Label>
                <Textarea
                  value={formData.shipping_address_en}
                  onChange={(e) => setFormData({ ...formData, shipping_address_en: e.target.value })}
                  rows={2}
                  placeholder="English address"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>내부 메모</Label>
              <Textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={2}
                placeholder="내부 참고용 메모"
              />
            </div>

            <div className="space-y-2">
              <Label>고객 요청사항</Label>
              <Textarea
                value={formData.customer_notes}
                onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                rows={2}
                placeholder="고객 요청사항"
              />
            </div>

            {/* 금액 요약 */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">소계</span>
                <span>{formatCurrency(subtotal, formData.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">할인</span>
                <div className="flex items-center gap-2">
                  <span>-</span>
                  <Input
                    type="number"
                    min="0"
                    value={formData.discount_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-28 h-8 text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">배송비</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.shipping_cost}
                  onChange={(e) =>
                    setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })
                  }
                  className="w-28 h-8 text-right"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">세금</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.tax_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-28 h-8 text-right"
                />
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>총액</span>
                <span>{formatCurrency(totalAmount, formData.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 품목 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>주문 품목 (Parent SKU 기준)</CardTitle>
              <Button onClick={() => setIsProductSheetOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                제품 추가
              </Button>
            </div>
            {Object.keys(customerPrices).length > 0 && (
              <p className="text-sm text-green-600">
                ✓ 업체별 가격이 적용됩니다 ({Object.keys(customerPrices).length}개 제품)
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="w-[80px]">수량</TableHead>
                  <TableHead className="w-[120px]">단가</TableHead>
                  <TableHead className="w-[80px]">할인(%)</TableHead>
                  <TableHead className="text-right w-[120px]">금액</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      제품을 추가해주세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{item.parent_sku}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate">{item.product_name}</div>
                        {item.product_name_en && (
                          <div className="text-xs text-gray-500 truncate">{item.product_name_en}</div>
                        )}
                      </TableCell>
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
                          min="0"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                          }
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_rate}
                          onChange={(e) =>
                            updateItem(index, "discount_rate", parseFloat(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.line_total, formData.currency)}
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
          </CardContent>
        </Card>
      </div>

      {/* 제품 선택 Sheet */}
      <Sheet
        open={isProductSheetOpen}
        onOpenChange={(open) => {
          setIsProductSheetOpen(open);
          if (!open) {
            setSelectedProducts(new Set());
            setProductSearch("");
            setCategoryFilter("");
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
          <SheetHeader className="pb-4">
            <SheetTitle>제품 선택</SheetTitle>
            <SheetDescription>
              견적에 추가할 제품을 선택해주세요.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
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

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">카테고리 전체</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat as string} value={cat as string}>
                      {cat as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
              <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] py-3">
                        <Checkbox
                          checked={
                            filteredProducts.length > 0 &&
                            filteredProducts.every((p: any) => selectedProducts.has(p.parent_sku))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts(
                                new Set(filteredProducts.map((p: any) => p.parent_sku))
                              );
                            } else {
                              setSelectedProducts(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="py-3">제품명</TableHead>
                      <TableHead className="py-3">카테고리</TableHead>
                      <TableHead className="text-right py-3">업체가격</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 100).map((product: any) => {
                      const hasCustomPrice = !!customerPrices[product.parent_sku];
                      const price = customerPrices[product.parent_sku] || 0;
                      return (
                        <TableRow
                          key={product.parent_sku}
                          className={`cursor-pointer hover:bg-muted/50 ${selectedProducts.has(product.parent_sku) ? "bg-accent" : ""}`}
                          onClick={() => toggleProductSelection(product.parent_sku)}
                        >
                          <TableCell className="py-4">
                            <Checkbox
                              checked={selectedProducts.has(product.parent_sku)}
                              onCheckedChange={() => toggleProductSelection(product.parent_sku)}
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium">{product.product_name || "-"}</div>
                            <div className="text-xs text-muted-foreground font-mono">{product.parent_sku}</div>
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            {product.category}
                            {product.subcategory && ` > ${product.subcategory}`}
                          </TableCell>
                          <TableCell className="text-right py-4">
                            {hasCustomPrice ? (
                              <Badge variant="default">
                                {formatCurrency(price, formData.currency)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                {price > 0 ? formatCurrency(price, formData.currency) : "미설정"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsProductSheetOpen(false)}>
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
