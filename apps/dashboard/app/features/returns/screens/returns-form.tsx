/**
 * 교환/반품/AS 등록/수정 페이지
 *
 * 프로세스:
 * [접수] → [수거중] → [수거완료] → [검수중] → [처리중] → [발송/환불완료] → [완료]
 */
import type { Route } from "./+types/returns-form";

import {
  RotateCcwIcon,
  SearchIcon,
  PackageIcon,
  CheckCircleIcon,
  WrenchIcon,
  ArrowLeftRightIcon,
  WarehouseIcon,
  UserIcon,
  SaveIcon,
  TrashIcon,
  ReceiptIcon,
  LoaderIcon,
  ArrowLeftIcon,
  PlusIcon,
  TruckIcon,
  ClipboardCheckIcon,
  CreditCardIcon,
  ArrowRightIcon,
  PackageCheckIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useFetcher, useNavigate, Link } from "react-router";

// lib imports
import {
  getWarehouses,
  getProducts,
  generateReturnNumber,
  searchOrders,
} from "../lib/returns.server";

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
import { Label } from "~/core/components/ui/label";
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
import { Textarea } from "~/core/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";
import { Separator } from "~/core/components/ui/separator";

export const meta = () => {
  return [{ title: "교환/반품/AS 등록 | Sundayhug Admin" }];
};

// 상태 정의
const statuses = [
  { value: "received", label: "접수", icon: ReceiptIcon, color: "bg-gray-500" },
  { value: "pickup_scheduled", label: "수거예정", icon: TruckIcon, color: "bg-yellow-500" },
  { value: "pickup_completed", label: "수거완료", icon: PackageIcon, color: "bg-blue-500" },
  { value: "inspecting", label: "검수중", icon: ClipboardCheckIcon, color: "bg-purple-500" },
  { value: "processing", label: "처리중", icon: LoaderIcon, color: "bg-orange-500" },
  { value: "shipped", label: "발송완료", icon: TruckIcon, color: "bg-cyan-500" },
  { value: "refunded", label: "환불완료", icon: CreditCardIcon, color: "bg-green-500" },
  { value: "completed", label: "완료", icon: CheckCircleIcon, color: "bg-green-600" },
  { value: "cancelled", label: "취소", icon: RotateCcwIcon, color: "bg-red-500" },
];

const returnTypes = [
  { value: "exchange", label: "교환", icon: ArrowLeftRightIcon, description: "다른 제품으로 교환" },
  { value: "return", label: "반품", icon: RotateCcwIcon, description: "환불 처리" },
  { value: "repair", label: "수리(AS)", icon: WrenchIcon, description: "수리 후 반송" },
];

const channels = [
  { value: "cafe24", label: "카페24" },
  { value: "naver", label: "스마트스토어" },
  { value: "direct", label: "직접판매" },
  { value: "b2b", label: "B2B" },
];

const carriers = [
  { value: "cj", label: "CJ대한통운" },
  { value: "hanjin", label: "한진택배" },
  { value: "lotte", label: "롯데택배" },
  { value: "logen", label: "로젠택배" },
  { value: "post", label: "우체국택배" },
  { value: "other", label: "기타" },
];

const conditions = [
  { value: "good", label: "양호" },
  { value: "damaged", label: "파손" },
  { value: "defective", label: "불량" },
];

const refundMethods = [
  { value: "card_cancel", label: "카드 취소" },
  { value: "bank_transfer", label: "계좌 이체" },
  { value: "point", label: "포인트 환불" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const makeServerClient = (await import("~/core/lib/supa-client.server")).default;
  const [supabase] = makeServerClient(request);

  // 병렬로 기본 데이터 조회
  const [warehouses, products, newReturnNumber] = await Promise.all([
    getWarehouses(supabase),
    getProducts(supabase),
    generateReturnNumber(supabase),
  ]);

  // 수정 모드일 경우 기존 데이터 로드
  const id = params.id;
  let existingData = null;
  let existingItems: any[] = [];
  let exchangeProducts: any[] = [];

  if (id && id !== "new") {
    const [returnData, itemsData, exchProductsData] = await Promise.all([
      supabase.from("returns_exchanges").select("*").eq("id", id).single(),
      supabase.from("return_exchange_items").select("*").eq("return_id", id),
      supabase.from("return_exchange_products").select("*").eq("return_id", id),
    ]);
    existingData = returnData.data;
    existingItems = itemsData.data || [];
    exchangeProducts = exchProductsData.data || [];
  }

  return {
    warehouses,
    products,
    newReturnNumber,
    existingData,
    existingItems,
    exchangeProducts,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const makeServerClient = (await import("~/core/lib/supa-client.server")).default;
  const [supabase, response] = makeServerClient(request);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // 상태 변경 (빠른 처리)
  if (intent === "change_status") {
    const id = formData.get("id") as string;
    const newStatus = formData.get("new_status") as string;
    const oldStatus = formData.get("old_status") as string;

    if (!id || !newStatus) {
      return { error: "필수 값이 없습니다." };
    }

    // 상태 업데이트
    const updateData: any = { status: newStatus };

    // 상태별 자동 처리
    if (newStatus === "pickup_completed") {
      updateData.pickup_date = new Date().toISOString().slice(0, 10);
    } else if (newStatus === "inspecting") {
      updateData.inspection_date = new Date().toISOString().slice(0, 10);
    } else if (newStatus === "completed") {
      updateData.completed_date = new Date().toISOString().slice(0, 10);
    } else if (newStatus === "shipped") {
      updateData.exchange_shipped_date = new Date().toISOString().slice(0, 10);
    } else if (newStatus === "refunded") {
      updateData.refund_date = new Date().toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from("returns_exchanges")
      .update(updateData)
      .eq("id", id);

    if (error) return { error: error.message };

    // 상태 변경 이력 저장
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("return_status_history").insert({
      return_id: id,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: userData?.user?.id || null,
    });

    return { success: true, statusChanged: true };
  }

  // 주문 검색
  if (intent === "search_order") {
    const searchQuery = formData.get("search_query") as string;
    const orders = await searchOrders(supabase, searchQuery);
    return { orders };
  }

  // 저장
  if (intent === "save") {
    const id = formData.get("id") as string | null;
    const returnType = formData.get("return_type") as string;

    const data: any = {
      return_number: formData.get("return_number") as string,
      return_type: returnType,
      status: formData.get("status") as string,
      channel: formData.get("channel") as string,
      order_number: formData.get("order_number") as string,
      customer_name: formData.get("customer_name") as string,
      customer_phone: formData.get("customer_phone") as string,
      customer_address: formData.get("customer_address") as string,
      return_date: formData.get("return_date") as string,
      reason: formData.get("reason") as string,
      notes: formData.get("notes") as string,

      // 수거 정보
      pickup_date: formData.get("pickup_date") || null,
      pickup_carrier: formData.get("pickup_carrier") || null,
      pickup_invoice: formData.get("pickup_invoice") || null,

      // 검수 정보
      inspection_date: formData.get("inspection_date") || null,
      inspection_result: formData.get("inspection_result") || null,
      inspection_notes: formData.get("inspection_notes") || null,

      // 재입고
      restocked: formData.get("restocked") === "true",
      restock_warehouse_id: formData.get("restock_warehouse_id") || null,
    };

    // 교환인 경우 발송 정보
    if (returnType === "exchange") {
      data.exchange_carrier = formData.get("exchange_carrier") || null;
      data.exchange_invoice = formData.get("exchange_invoice") || null;
      data.exchange_shipped_date = formData.get("exchange_shipped_date") || null;
    }

    // 반품인 경우 환불 정보
    if (returnType === "return") {
      data.refund_method = formData.get("refund_method") || null;
      data.refund_amount = formData.get("refund_amount") ? parseFloat(formData.get("refund_amount") as string) : null;
      data.refund_date = formData.get("refund_date") || null;
    }

    // AS인 경우 수리 정보
    if (returnType === "repair") {
      data.repair_details = formData.get("repair_details") || null;
      data.repair_cost = formData.get("repair_cost") ? parseFloat(formData.get("repair_cost") as string) : null;
      data.is_warranty_repair = formData.get("is_warranty_repair") === "true";
      data.exchange_carrier = formData.get("exchange_carrier") || null;
      data.exchange_invoice = formData.get("exchange_invoice") || null;
      data.exchange_shipped_date = formData.get("exchange_shipped_date") || null;
    }

    const items = JSON.parse(formData.get("items") as string || "[]");
    const exchangeProducts = JSON.parse(formData.get("exchange_products") as string || "[]");

    let returnId = id;
    let oldStatus: string | null = null;

    if (id) {
      // 기존 상태 조회 (상태 변경 이력용)
      const { data: existingRecord } = await supabase
        .from("returns_exchanges")
        .select("status")
        .eq("id", id)
        .single();
      oldStatus = existingRecord?.status || null;

      // 업데이트
      const { error } = await supabase
        .from("returns_exchanges")
        .update(data)
        .eq("id", id);
      if (error) return { error: error.message };

      // 상태가 변경된 경우 이력 저장
      if (oldStatus && oldStatus !== data.status) {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from("return_status_history").insert({
          return_id: id,
          from_status: oldStatus,
          to_status: data.status,
          changed_by: userData?.user?.id || null,
        });
      }
    } else {
      // 새로 생성
      const { data: inserted, error } = await supabase
        .from("returns_exchanges")
        .insert(data)
        .select("id")
        .single();
      if (error) return { error: error.message };
      returnId = inserted.id;
    }

    // 기존 품목 삭제 후 재등록
    if (returnId) {
      await supabase.from("return_exchange_items").delete().eq("return_id", returnId);

      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          return_id: returnId,
          product_id: item.product_id || null,
          sku: item.sku,
          product_name: item.product_name,
          option_name: item.option_name || "",
          quantity: item.quantity,
          condition: item.condition || "good",
        }));
        await supabase.from("return_exchange_items").insert(itemsToInsert);
      }

      // 교환 대상 제품
      await supabase.from("return_exchange_products").delete().eq("return_id", returnId);

      if (exchangeProducts.length > 0) {
        const productsToInsert = exchangeProducts.map((p: any) => ({
          return_id: returnId,
          product_id: p.product_id || null,
          sku: p.sku,
          product_name: p.product_name,
          option_name: p.option_name || "",
          quantity: p.quantity,
          unit_price: p.unit_price || 0,
        }));
        await supabase.from("return_exchange_products").insert(productsToInsert);
      }
    }

    return { success: true, redirect: "/dashboard/returns" };
  }

  return { error: "Unknown action" };
}

interface ReturnItem {
  product_id: string | null;
  sku: string;
  product_name: string;
  option_name: string;
  quantity: number;
  return_reason: string;
  condition: string;
}

interface ExchangeProduct {
  product_id: string | null;
  sku: string;
  product_name: string;
  option_name: string;
  quantity: number;
  unit_price: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// 다음 상태 계산
function getNextStatus(currentStatus: string, returnType: string): { value: string; label: string } | null {
  const statusFlow: Record<string, string> = {
    received: "pickup_scheduled",
    pickup_scheduled: "pickup_completed",
    pickup_completed: "inspecting",
    inspecting: "processing",
    processing: returnType === "return" ? "refunded" : "shipped",
    shipped: "completed",
    refunded: "completed",
  };

  const nextValue = statusFlow[currentStatus];
  if (!nextValue) return null;

  const nextStatus = statuses.find(s => s.value === nextValue);
  return nextStatus ? { value: nextStatus.value, label: nextStatus.label } : null;
}

export default function ReturnsForm({ loaderData, actionData }: Route.ComponentProps) {
  const { warehouses, products, newReturnNumber, existingData, existingItems, exchangeProducts: existingExchangeProducts } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const orderSearchFetcher = useFetcher();
  const statusFetcher = useFetcher();

  const isEditMode = !!existingData;

  const [formData, setFormData] = useState({
    return_number: existingData?.return_number || newReturnNumber,
    return_type: existingData?.return_type || "exchange",
    status: existingData?.status || "received",
    channel: existingData?.channel || "cafe24",
    order_number: existingData?.order_number || "",
    customer_name: existingData?.customer_name || "",
    customer_phone: existingData?.customer_phone || "",
    customer_address: existingData?.customer_address || "",
    return_date: existingData?.return_date || new Date().toISOString().slice(0, 10),
    reason: existingData?.reason || "",
    notes: existingData?.notes || "",

    // 수거 정보
    pickup_date: existingData?.pickup_date || "",
    pickup_carrier: existingData?.pickup_carrier || "",
    pickup_invoice: existingData?.pickup_invoice || "",

    // 검수 정보
    inspection_date: existingData?.inspection_date || "",
    inspection_result: existingData?.inspection_result || "",
    inspection_notes: existingData?.inspection_notes || "",

    // 재입고
    restocked: existingData?.restocked || false,
    restock_warehouse_id: existingData?.restock_warehouse_id || "",

    // 교환 발송
    exchange_carrier: existingData?.exchange_carrier || "",
    exchange_invoice: existingData?.exchange_invoice || "",
    exchange_shipped_date: existingData?.exchange_shipped_date || "",

    // 환불 (반품)
    refund_method: existingData?.refund_method || "",
    refund_amount: existingData?.refund_amount || "",
    refund_date: existingData?.refund_date || "",

    // AS
    repair_details: existingData?.repair_details || "",
    repair_cost: existingData?.repair_cost || "",
    is_warranty_repair: existingData?.is_warranty_repair ?? true,
  });

  const [items, setItems] = useState<ReturnItem[]>(
    existingItems.map((item: any) => ({
      product_id: item.product_id,
      sku: item.sku,
      product_name: item.product_name,
      option_name: item.option_name || "",
      quantity: item.quantity,
      return_reason: "",
      condition: item.condition || "good",
    })) || []
  );

  const [exchangeProducts, setExchangeProducts] = useState<ExchangeProduct[]>(
    existingExchangeProducts.map((p: any) => ({
      product_id: p.product_id,
      sku: p.sku,
      product_name: p.product_name,
      option_name: p.option_name || "",
      quantity: p.quantity,
      unit_price: p.unit_price || 0,
    })) || []
  );

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isExchangeProductDialogOpen, setIsExchangeProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [showOrderSearch, setShowOrderSearch] = useState(!existingData);

  const searchingOrders = orderSearchFetcher.state === "submitting" || orderSearchFetcher.state === "loading";
  const orderSearchResults = (orderSearchFetcher.data as any)?.orders || [];

  useEffect(() => {
    if (actionData?.success && actionData?.redirect) {
      navigate(actionData.redirect);
    }
  }, [actionData, navigate]);

  const handleOrderSearch = () => {
    if (!orderSearchQuery.trim()) return;
    orderSearchFetcher.submit(
      { intent: "search_order", search_query: orderSearchQuery },
      { method: "post" }
    );
  };

  const selectOrder = (order: any) => {
    setFormData({
      ...formData,
      order_number: order.order_number,
      channel: order.channel,
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
    });

    const newItems: ReturnItem[] = order.items.map((item: any) => ({
      product_id: null,
      sku: item.sku,
      product_name: item.product_name || "",
      option_name: item.option_name || "",
      quantity: item.quantity || 1,
      return_reason: "",
      condition: "good",
    }));
    setItems(newItems);
    setShowOrderSearch(false);
  };

  const addProduct = (product: any) => {
    setItems([...items, {
      product_id: product.id,
      sku: product.sku,
      product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
      option_name: "",
      quantity: 1,
      return_reason: "",
      condition: "good",
    }]);
    setIsProductDialogOpen(false);
    setProductSearch("");
  };

  const addExchangeProduct = (product: any) => {
    setExchangeProducts([...exchangeProducts, {
      product_id: product.id,
      sku: product.sku,
      product_name: `${product.product_name || ""} ${product.color_kr || ""} ${product.sku_6_size || ""}`.trim(),
      option_name: "",
      quantity: 1,
      unit_price: 0,
    }]);
    setIsExchangeProductDialogOpen(false);
    setProductSearch("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const removeExchangeProduct = (index: number) => {
    setExchangeProducts(exchangeProducts.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const updateExchangeProduct = (index: number, field: keyof ExchangeProduct, value: any) => {
    setExchangeProducts(exchangeProducts.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSave = () => {
    fetcher.submit(
      {
        intent: "save",
        id: existingData?.id || "",
        ...formData,
        items: JSON.stringify(items),
        exchange_products: JSON.stringify(exchangeProducts),
      },
      { method: "post" }
    );
  };

  const filteredProducts = products.filter((p: any) =>
    !productSearch ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const currentStatus = statuses.find(s => s.value === formData.status);
  const nextStatus = getNextStatus(formData.status, formData.return_type);

  // 빠른 상태 변경
  const handleQuickStatusChange = (newStatus: string) => {
    if (!existingData?.id) return;
    statusFetcher.submit(
      {
        intent: "change_status",
        id: existingData.id,
        old_status: formData.status,
        new_status: newStatus,
      },
      { method: "post" }
    );
    setFormData({ ...formData, status: newStatus });
  };

  // 상태 변경 완료 후 리로드
  useEffect(() => {
    if (statusFetcher.data?.statusChanged) {
      // 상태 변경 완료 - 폼 데이터가 이미 업데이트됨
    }
  }, [statusFetcher.data]);

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/returns">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "교환/반품/AS 수정" : "교환/반품/AS 등록"}
            </h1>
            <p className="text-muted-foreground">
              {formData.return_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/returns">취소</Link>
          </Button>
          <Button onClick={handleSave} disabled={fetcher.state === "submitting"}>
            {fetcher.state === "submitting" ? (
              <><LoaderIcon className="w-4 h-4 mr-2 animate-spin" />저장 중...</>
            ) : (
              <><SaveIcon className="w-4 h-4 mr-2" />저장</>
            )}
          </Button>
        </div>
      </div>

      {/* 상태 진행 바 */}
      {isEditMode && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              {statuses.slice(0, -1).map((status, index) => {
                const currentIdx = statuses.findIndex(s => s.value === formData.status);
                const isActive = currentIdx >= index;
                const isCurrent = formData.status === status.value;
                const StatusIcon = status.icon;
                return (
                  <div key={status.value} className="flex items-center">
                    <div className={`flex flex-col items-center ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? status.color : "bg-gray-200"} ${isCurrent ? "ring-2 ring-offset-2 ring-primary" : ""}`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? "font-bold" : ""}`}>{status.label}</span>
                    </div>
                    {index < statuses.length - 2 && (
                      <ArrowRightIcon className={`w-4 h-4 mx-2 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* 빠른 상태 변경 버튼 */}
            {nextStatus && formData.status !== "completed" && formData.status !== "cancelled" && (
              <div className="flex items-center justify-center gap-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  다음 단계:
                </span>
                <Button
                  onClick={() => handleQuickStatusChange(nextStatus.value)}
                  disabled={statusFetcher.state === "submitting"}
                  className="gap-2"
                >
                  {statusFetcher.state === "submitting" ? (
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="w-4 h-4" />
                  )}
                  {nextStatus.label}(으)로 변경
                </Button>
                {formData.status !== "received" && (
                  <Button
                    variant="outline"
                    onClick={() => handleQuickStatusChange("cancelled")}
                    disabled={statusFetcher.state === "submitting"}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <RotateCcwIcon className="w-4 h-4" />
                    취소
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {actionData?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {actionData.error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* 왼쪽: 메인 콘텐츠 */}
        <div className="col-span-2 space-y-6">
          {/* 주문 검색 */}
          {showOrderSearch && !isEditMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptIcon className="w-5 h-5" />
                  주문 검색
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="주문번호, 고객명, 연락처로 검색..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleOrderSearch()}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>
                  <Button onClick={handleOrderSearch} disabled={searchingOrders} size="lg">
                    {searchingOrders ? <><LoaderIcon className="w-4 h-4 mr-2 animate-spin" />검색 중...</> : "검색"}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setShowOrderSearch(false)}>
                    직접 입력
                  </Button>
                </div>

                {orderSearchResults.length > 0 && (
                  <div className="border rounded-lg max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>채널</TableHead>
                          <TableHead>주문번호</TableHead>
                          <TableHead>주문일</TableHead>
                          <TableHead>고객</TableHead>
                          <TableHead>품목</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderSearchResults.map((order: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-muted/50 cursor-pointer" onClick={() => selectOrder(order)}>
                            <TableCell>
                              <Badge variant={order.channel === "cafe24" ? "default" : "secondary"}>
                                {channels.find(c => c.value === order.channel)?.label || order.channel}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{order.order_number}</TableCell>
                            <TableCell>{formatDate(order.order_date)}</TableCell>
                            <TableCell>
                              <div className="font-medium">{order.customer_name}</div>
                              <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {order.items.slice(0, 2).map((i: any, iIdx: number) => (
                                  <div key={iIdx} className="truncate max-w-[250px]">
                                    {i.product_name} {i.option_name && `(${i.option_name})`}
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <div className="text-muted-foreground">외 {order.items.length - 2}건</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => selectOrder(order)}>선택</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {orderSearchFetcher.data && orderSearchResults.length === 0 && !searchingOrders && (
                  <div className="text-center py-8 text-muted-foreground">검색 결과가 없습니다.</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 주문 선택 완료 */}
          {(!showOrderSearch || isEditMode) && formData.order_number && (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">주문번호:</span>
                <span className="font-mono">{formData.order_number}</span>
              </div>
              {!isEditMode && (
                <Button size="sm" variant="outline" onClick={() => setShowOrderSearch(true)}>
                  다른 주문 검색
                </Button>
              )}
            </div>
          )}

          {/* 탭: 품목/진행상황 */}
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="items">반품 품목 ({items.length})</TabsTrigger>
              {formData.return_type === "exchange" && (
                <TabsTrigger value="exchange">교환 제품 ({exchangeProducts.length})</TabsTrigger>
              )}
              <TabsTrigger value="process">처리 정보</TabsTrigger>
            </TabsList>

            {/* 반품 품목 */}
            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <PackageIcon className="w-5 h-5" />
                        반품 품목
                      </CardTitle>
                      <CardDescription>고객이 반품하는 제품</CardDescription>
                    </div>
                    <Button onClick={() => setIsProductDialogOpen(true)}>
                      <PlusIcon className="w-4 h-4 mr-2" />품목 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      <PackageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>등록된 품목이 없습니다.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>제품명</TableHead>
                          <TableHead className="w-[80px]">수량</TableHead>
                          <TableHead className="w-[100px]">상태</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell>
                              <div>{item.product_name}</div>
                              {item.option_name && <div className="text-sm text-muted-foreground">{item.option_name}</div>}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                                className="w-16"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={item.condition} onValueChange={(v) => updateItem(index, "condition", v)}>
                                <SelectTrigger className="w-[90px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {conditions.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                <TrashIcon className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 교환 제품 */}
            {formData.return_type === "exchange" && (
              <TabsContent value="exchange">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ArrowLeftRightIcon className="w-5 h-5" />
                          교환 제품
                        </CardTitle>
                        <CardDescription>고객에게 발송할 새 제품</CardDescription>
                      </div>
                      <Button onClick={() => setIsExchangeProductDialogOpen(true)}>
                        <PlusIcon className="w-4 h-4 mr-2" />제품 추가
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exchangeProducts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <PackageCheckIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>교환할 제품을 추가해주세요.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>제품명</TableHead>
                            <TableHead className="w-[80px]">수량</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exchangeProducts.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                              <TableCell>
                                <div>{product.product_name}</div>
                                {product.option_name && <div className="text-sm text-muted-foreground">{product.option_name}</div>}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={product.quantity}
                                  onChange={(e) => updateExchangeProduct(index, "quantity", parseInt(e.target.value) || 1)}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeExchangeProduct(index)}>
                                  <TrashIcon className="w-4 h-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* 처리 정보 */}
            <TabsContent value="process">
              <Card>
                <CardHeader>
                  <CardTitle>처리 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 수거 정보 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TruckIcon className="w-4 h-4" /> 수거 정보
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>수거일</Label>
                        <Input type="date" value={formData.pickup_date} onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>택배사</Label>
                        <Select value={formData.pickup_carrier} onValueChange={(v) => setFormData({ ...formData, pickup_carrier: v })}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>
                            {carriers.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>송장번호</Label>
                        <Input value={formData.pickup_invoice} onChange={(e) => setFormData({ ...formData, pickup_invoice: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 검수 정보 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ClipboardCheckIcon className="w-4 h-4" /> 검수 정보
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>검수일</Label>
                        <Input type="date" value={formData.inspection_date} onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>검수 결과</Label>
                        <Select value={formData.inspection_result} onValueChange={(v) => setFormData({ ...formData, inspection_result: v })}>
                          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">승인</SelectItem>
                            <SelectItem value="rejected">반려</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label>검수 메모</Label>
                      <Textarea value={formData.inspection_notes} onChange={(e) => setFormData({ ...formData, inspection_notes: e.target.value })} rows={2} />
                    </div>
                  </div>

                  <Separator />

                  {/* 유형별 추가 정보 */}
                  {formData.return_type === "exchange" && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <TruckIcon className="w-4 h-4" /> 교환품 발송
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>발송일</Label>
                          <Input type="date" value={formData.exchange_shipped_date} onChange={(e) => setFormData({ ...formData, exchange_shipped_date: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>택배사</Label>
                          <Select value={formData.exchange_carrier} onValueChange={(v) => setFormData({ ...formData, exchange_carrier: v })}>
                            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>
                              {carriers.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>송장번호</Label>
                          <Input value={formData.exchange_invoice} onChange={(e) => setFormData({ ...formData, exchange_invoice: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.return_type === "return" && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CreditCardIcon className="w-4 h-4" /> 환불 정보
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>환불 방법</Label>
                          <Select value={formData.refund_method} onValueChange={(v) => setFormData({ ...formData, refund_method: v })}>
                            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>
                              {refundMethods.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>환불 금액</Label>
                          <Input type="number" value={formData.refund_amount} onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>환불일</Label>
                          <Input type="date" value={formData.refund_date} onChange={(e) => setFormData({ ...formData, refund_date: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.return_type === "repair" && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <WrenchIcon className="w-4 h-4" /> 수리 정보
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>수리 비용</Label>
                          <Input type="number" value={formData.repair_cost} onChange={(e) => setFormData({ ...formData, repair_cost: e.target.value })} />
                        </div>
                        <div className="space-y-2 flex items-end gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="is_warranty_repair"
                              checked={formData.is_warranty_repair}
                              onChange={(e) => setFormData({ ...formData, is_warranty_repair: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="is_warranty_repair">무상 수리</Label>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label>수리 내역</Label>
                        <Textarea value={formData.repair_details} onChange={(e) => setFormData({ ...formData, repair_details: e.target.value })} rows={3} />
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* 재입고 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <WarehouseIcon className="w-4 h-4" /> 재입고
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="restocked"
                          checked={formData.restocked}
                          onChange={(e) => setFormData({ ...formData, restocked: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="restocked">재입고 처리</Label>
                      </div>
                      {formData.restocked && (
                        <Select value={formData.restock_warehouse_id} onValueChange={(v) => setFormData({ ...formData, restock_warehouse_id: v })}>
                          <SelectTrigger className="w-[200px]"><SelectValue placeholder="창고 선택" /></SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w: any) => (<SelectItem key={w.id} value={w.id}>{w.warehouse_name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 사유 및 메모 */}
          <Card>
            <CardHeader>
              <CardTitle>사유 및 메모</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>사유</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="교환/반품/AS 사유"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>내부 메모</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="내부 메모"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 정보 패널 */}
        <div className="space-y-6">
          {/* 유형 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>유형</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {returnTypes.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={formData.return_type === type.value ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, return_type: type.value })}
                    className="w-full justify-start h-auto py-3"
                  >
                    <TypeIcon className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div>{type.label}</div>
                      <div className="text-xs opacity-70">{type.description}</div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          {/* 상태 */}
          <Card>
            <CardHeader>
              <CardTitle>상태</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>접수번호</Label>
                <Input value={formData.return_number} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>채널</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>주문번호</Label>
                <Input value={formData.order_number} onChange={(e) => setFormData({ ...formData, order_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>접수일</Label>
                <Input type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* 고객 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" /> 고객 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>고객명</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>연락처</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>주소</Label>
                <Textarea value={formData.customer_address} onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })} rows={2} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 반품 품목 선택 다이얼로그 */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>반품 품목 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="SKU 또는 제품명 검색..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>색상</TableHead>
                    <TableHead>사이즈</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.slice(0, 50).map((product: any) => (
                    <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => addProduct(product)}>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell>{product.color_kr}</TableCell>
                      <TableCell>{product.sku_6_size}</TableCell>
                      <TableCell><Button size="sm" onClick={() => addProduct(product)}>선택</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 교환 제품 선택 다이얼로그 */}
      <Dialog open={isExchangeProductDialogOpen} onOpenChange={setIsExchangeProductDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>교환 제품 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="SKU 또는 제품명 검색..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>색상</TableHead>
                    <TableHead>사이즈</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.slice(0, 50).map((product: any) => (
                    <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => addExchangeProduct(product)}>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>{product.product_name}</TableCell>
                      <TableCell>{product.color_kr}</TableCell>
                      <TableCell>{product.sku_6_size}</TableCell>
                      <TableCell><Button size="sm" onClick={() => addExchangeProduct(product)}>선택</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
