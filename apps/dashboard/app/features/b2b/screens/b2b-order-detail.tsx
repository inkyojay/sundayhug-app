/**
 * B2B 주문 상세
 * - 주문 정보 조회
 * - 상태 변경
 * - 문서 생성 (견적서, 인보이스, 패킹리스트)
 * - 출고 지시 생성
 */
import type { Route } from "./+types/b2b-order-detail";

import {
  ShoppingCartIcon,
  ArrowLeftIcon,
  PencilIcon,
  TruckIcon,
  FileTextIcon,
  ReceiptIcon,
  PackageIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  MapPinIcon,
  GlobeIcon,
  DownloadIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
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
import { Separator } from "~/core/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/core/components/ui/dropdown-menu";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `주문 ${data?.order?.order_number || ""} | Sundayhug Admin` }];
};

// 주문 상태 정의
const orderStatuses = [
  { value: "quote_draft", label: "견적 작성중", color: "secondary" },
  { value: "quote_sent", label: "견적 발송", color: "default" },
  { value: "confirmed", label: "주문 확정", color: "default" },
  { value: "invoice_created", label: "인보이스 발행", color: "outline" },
  { value: "shipping", label: "출고 준비", color: "outline" },
  { value: "shipped", label: "출고 완료", color: "default" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

const getStatusInfo = (status: string) => {
  return orderStatuses.find((s) => s.value === status) || orderStatuses[0];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const orderId = params.id;

  // 주문 조회
  const { data: order, error } = await supabase
    .from("b2b_orders")
    .select(`
      *,
      customer:b2b_customers(
        id, customer_code, company_name, company_name_en, business_type,
        contact_name, contact_phone, contact_email,
        address, address_en, shipping_address, shipping_address_en,
        payment_terms, currency
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Response("주문을 찾을 수 없습니다.", { status: 404 });
  }

  // 주문 품목 조회
  const { data: items } = await supabase
    .from("b2b_order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");

  // 출고 목록 조회
  const { data: shipments } = await supabase
    .from("b2b_shipments")
    .select(`
      *,
      items:b2b_shipment_items(*)
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  // 문서 목록 조회
  const { data: documents } = await supabase
    .from("b2b_documents")
    .select("*")
    .eq("order_id", orderId)
    .order("generated_at", { ascending: false });

  return {
    order,
    items: items || [],
    shipments: shipments || [],
    documents: documents || [],
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const orderId = params.id;

  if (intent === "update_status") {
    const status = formData.get("status") as string;

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // 상태별 추가 필드 업데이트
    if (status === "confirmed") {
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === "shipped") {
      updateData.shipped_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("b2b_orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "상태가 변경되었습니다." };
  }

  if (intent === "update_payment_status") {
    const payment_status = formData.get("payment_status") as string;

    const { error } = await supabase
      .from("b2b_orders")
      .update({
        payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "결제 상태가 변경되었습니다." };
  }

  // 출고 상태 변경 (재고 차감/복원 포함)
  if (intent === "update_shipment_status") {
    const shipmentId = formData.get("shipment_id") as string;
    const newStatus = formData.get("status") as string;
    const trackingNumber = formData.get("tracking_number") as string;

    // 현재 출고 정보 조회
    const { data: shipment, error: shipmentError } = await supabase
      .from("b2b_shipments")
      .select("*, items:b2b_shipment_items(*)")
      .eq("id", shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return { success: false, error: "출고 정보를 찾을 수 없습니다." };
    }

    const previousStatus = shipment.status;

    // 출고 완료로 변경 시 재고 차감
    if (newStatus === "shipped" && previousStatus !== "shipped") {
      // 창고 확인
      if (!shipment.warehouse_id) {
        return { success: false, error: "출고 창고가 지정되지 않았습니다." };
      }

      // 각 품목에 대해 재고 차감
      for (const item of shipment.items || []) {
        // 창고별 재고 차감 (RPC 함수 사용)
        const { error: decreaseError } = await supabase.rpc("decrease_inventory_location", {
          p_warehouse_id: shipment.warehouse_id,
          p_sku: item.sku,
          p_quantity: item.quantity,
          p_reason: `B2B 출고: ${shipment.shipment_number}`,
        });

        if (decreaseError) {
          console.error(`재고 차감 실패 (${item.sku}):`, decreaseError);
          // 경고만 하고 계속 진행 (재고 부족해도 출고는 가능)
        }

        // 전체 재고(inventory)도 차감
        const { error: decreaseMainError } = await supabase.rpc("decrease_inventory", {
          p_sku: item.sku,
          p_quantity: item.quantity,
          p_reason: `B2B 출고: ${shipment.shipment_number}`,
        });

        if (decreaseMainError) {
          console.error(`전체 재고 차감 실패 (${item.sku}):`, decreaseMainError);
        }
      }
    }

    // 출고 취소 시 재고 복원 (이미 출고 완료된 경우에만)
    if (newStatus === "cancelled" && previousStatus === "shipped") {
      for (const item of shipment.items || []) {
        // 창고별 재고 복원
        const { error: increaseError } = await supabase.rpc("increase_inventory_location", {
          p_warehouse_id: shipment.warehouse_id,
          p_sku: item.sku,
          p_quantity: item.quantity,
          p_reason: `B2B 출고 취소: ${shipment.shipment_number}`,
        });

        if (increaseError) {
          console.error(`재고 복원 실패 (${item.sku}):`, increaseError);
        }
      }
    }

    // 출고 상태 업데이트
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "shipped") {
      updateData.shipped_date = new Date().toISOString().slice(0, 10);
    }

    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }

    const { error: updateError } = await supabase
      .from("b2b_shipments")
      .update(updateData)
      .eq("id", shipmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 주문 상태도 업데이트
    if (newStatus === "shipped") {
      await supabase
        .from("b2b_orders")
        .update({ status: "shipped", shipped_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    const statusLabels: Record<string, string> = {
      pending: "대기",
      preparing: "준비중",
      shipped: "출고완료",
      delivered: "배송완료",
      cancelled: "취소",
    };

    return {
      success: true,
      message: `출고 상태가 '${statusLabels[newStatus] || newStatus}'(으)로 변경되었습니다.${
        newStatus === "shipped" ? " 재고가 차감되었습니다." : ""
      }${newStatus === "cancelled" && previousStatus === "shipped" ? " 재고가 복원되었습니다." : ""}`,
    };
  }

  return { success: false, error: "Unknown intent" };
}

export default function B2BOrderDetail({ loaderData }: Route.ComponentProps) {
  const { order, items, shipments, documents } = loaderData;
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setMessage(`✅ ${fetcher.data.message}`);
        revalidator.revalidate();
      } else {
        setMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetcher.data, fetcher.state]);

  const handleStatusChange = (newStatus: string) => {
    fetcher.submit(
      { intent: "update_status", status: newStatus },
      { method: "POST" }
    );
  };

  const handlePaymentStatusChange = (newStatus: string) => {
    fetcher.submit(
      { intent: "update_payment_status", payment_status: newStatus },
      { method: "POST" }
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ko-KR");
  };

  const formatCurrency = (amount: number, currency: string = "KRW") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    }
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
  };

  const statusInfo = getStatusInfo(order.status);
  const customer = order.customer;
  const isOverseas = customer?.business_type === "overseas";

  // 총 수량 계산
  const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  // PDF 다운로드 핸들러
  const handleDownloadDocument = async (documentType: string, shipmentId?: string) => {
    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("order_id", order.id);
      if (shipmentId) {
        formData.append("shipment_id", shipmentId);
      }

      const response = await fetch("/api/b2b/generate-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate document");
      }

      // PDF 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? decodeURIComponent(contentDisposition.split("filename=")[1]?.replace(/"/g, "") || `document.pdf`)
        : `${documentType}_${order.order_number}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`✅ ${filename} 다운로드 완료`);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage(`❌ 문서 생성 실패: ${error}`);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCartIcon className="w-6 h-6" />
                {order.order_number}
              </h1>
              <Badge variant={statusInfo.color as any}>{statusInfo.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              {customer?.company_name} | {formatDate(order.order_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/dashboard/b2b/orders/${order.id}/edit`}>
              <PencilIcon className="w-4 h-4 mr-2" />
              수정
            </Link>
          </Button>
          {(order.status === "confirmed" || order.status === "invoice_created") && (
            <Button asChild>
              <Link to={`/dashboard/b2b/orders/${order.id}/shipment`}>
                <TruckIcon className="w-4 h-4 mr-2" />
                출고 지시
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 주문 정보 & 상태 */}
        <div className="space-y-6">
          {/* 상태 관리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">상태 관리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">주문 상태</label>
                <Select value={order.status} onValueChange={handleStatusChange}>
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
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">결제 상태</label>
                <Select value={order.payment_status} onValueChange={handlePaymentStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">미결제</SelectItem>
                    <SelectItem value="partial">부분결제</SelectItem>
                    <SelectItem value="paid">결제완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 상태 타임라인 */}
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">주문일:</span>
                  <span>{formatDate(order.order_date)}</span>
                </div>
                {order.quote_valid_until && (
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">견적유효:</span>
                    <span>{formatDate(order.quote_valid_until)}</span>
                  </div>
                )}
                {order.confirmed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span className="text-muted-foreground">확정일:</span>
                    <span>{formatDateTime(order.confirmed_at)}</span>
                  </div>
                )}
                {order.shipped_at && (
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-muted-foreground">출고일:</span>
                    <span>{formatDateTime(order.shipped_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 업체 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BuildingIcon className="w-5 h-5" />
                업체 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{customer.company_name}</span>
                    <Badge variant={isOverseas ? "secondary" : "default"}>
                      {isOverseas ? (
                        <>
                          <GlobeIcon className="w-3 h-3 mr-1" />
                          해외
                        </>
                      ) : (
                        <>
                          <MapPinIcon className="w-3 h-3 mr-1" />
                          국내
                        </>
                      )}
                    </Badge>
                  </div>
                  {customer.company_name_en && (
                    <div className="text-sm text-muted-foreground">{customer.company_name_en}</div>
                  )}
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">담당자:</span>{" "}
                      {customer.contact_name || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">연락처:</span>{" "}
                      {customer.contact_phone || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">이메일:</span>{" "}
                      {customer.contact_email || "-"}
                    </div>
                  </div>
                  {(order.shipping_address || order.shipping_address_en) && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">배송지:</div>
                        <div>{order.shipping_address || order.shipping_address_en}</div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">업체 정보 없음</div>
              )}
            </CardContent>
          </Card>

          {/* 문서 다운로드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                문서
              </CardTitle>
              <CardDescription>견적서, 인보이스, 패킹리스트</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    문서 다운로드
                    <ChevronDownIcon className="w-4 h-4 ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => handleDownloadDocument(isOverseas ? "proforma_invoice" : "quote_kr")}
                  >
                    <FileTextIcon className="w-4 h-4 mr-2" />
                    {isOverseas ? "Proforma Invoice" : "견적서 (국문)"}
                  </DropdownMenuItem>

                  {order.status !== "quote_draft" && order.status !== "quote_sent" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDownloadDocument("commercial_invoice")}>
                        <ReceiptIcon className="w-4 h-4 mr-2" />
                        Commercial Invoice
                      </DropdownMenuItem>
                    </>
                  )}

                  {shipments.length > 0 && (
                    <DropdownMenuItem
                      onClick={() => handleDownloadDocument("packing_list", shipments[0].id)}
                    >
                      <PackageIcon className="w-4 h-4 mr-2" />
                      Packing List
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Packing List 미사용 안내 */}
              {order.status !== "quote_draft" && order.status !== "quote_sent" && shipments.length === 0 && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 p-2 bg-muted rounded">
                  <PackageIcon className="w-4 h-4" />
                  <span>Packing List는 출고 지시 생성 후 다운로드 가능</span>
                </div>
              )}

              {/* 생성된 문서 목록 */}
              {documents.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="text-sm text-muted-foreground mb-2">생성된 문서</div>
                  {documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span>{doc.document_type}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <DownloadIcon className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 주문 품목 & 금액 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주문 품목 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문 품목</CardTitle>
              <CardDescription>
                총 {items.length}개 품목, {totalQuantity.toLocaleString()}개
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead className="text-center">수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-center">할인</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.parent_sku}</TableCell>
                      <TableCell>
                        <div>{item.product_name}</div>
                        {item.product_name_en && (
                          <div className="text-xs text-muted-foreground">{item.product_name_en}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price, order.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.discount_rate > 0 ? `${item.discount_rate}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.line_total, order.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 금액 요약 */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">소계</span>
                  <span>{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">할인</span>
                    <span className="text-red-600">
                      -{formatCurrency(order.discount_amount, order.currency)}
                    </span>
                  </div>
                )}
                {order.shipping_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">배송비</span>
                    <span>{formatCurrency(order.shipping_cost, order.currency)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">세금</span>
                    <span>{formatCurrency(order.tax_amount, order.currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>총액</span>
                  <span>{formatCurrency(order.total_amount, order.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 출고 내역 */}
          {shipments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TruckIcon className="w-5 h-5" />
                  출고 내역
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {shipments.map((shipment: any) => (
                  <div key={shipment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-medium">
                          {shipment.shipment_number}
                        </span>
                        <Badge
                          variant={
                            shipment.status === "delivered" || shipment.status === "shipped"
                              ? "default"
                              : shipment.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                          className="ml-2"
                        >
                          {shipment.status === "pending"
                            ? "대기"
                            : shipment.status === "preparing"
                            ? "준비중"
                            : shipment.status === "shipped"
                            ? "출고완료"
                            : shipment.status === "delivered"
                            ? "배송완료"
                            : shipment.status === "cancelled"
                            ? "취소됨"
                            : shipment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {shipment.planned_date && `예정: ${formatDate(shipment.planned_date)}`}
                        {shipment.shipped_date && ` | 출고: ${formatDate(shipment.shipped_date)}`}
                      </div>
                    </div>

                    {/* 품목 수량 */}
                    <div className="text-sm text-muted-foreground">
                      {shipment.items?.length || 0}개 SKU,{" "}
                      {shipment.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0}개
                    </div>

                    {/* 상태 변경 UI */}
                    {shipment.status !== "cancelled" && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Select
                          value={shipment.status}
                          onValueChange={(newStatus) => {
                            if (newStatus === "shipped" && shipment.status !== "shipped") {
                              // 출고 완료 시 확인
                              if (confirm("출고완료로 변경하면 재고가 차감됩니다. 계속하시겠습니까?")) {
                                fetcher.submit(
                                  {
                                    intent: "update_shipment_status",
                                    shipment_id: shipment.id,
                                    status: newStatus,
                                  },
                                  { method: "POST" }
                                );
                              }
                            } else if (newStatus === "cancelled" && shipment.status === "shipped") {
                              // 출고 완료 후 취소 시 확인
                              if (confirm("출고 취소 시 재고가 복원됩니다. 계속하시겠습니까?")) {
                                fetcher.submit(
                                  {
                                    intent: "update_shipment_status",
                                    shipment_id: shipment.id,
                                    status: newStatus,
                                  },
                                  { method: "POST" }
                                );
                              }
                            } else {
                              fetcher.submit(
                                {
                                  intent: "update_shipment_status",
                                  shipment_id: shipment.id,
                                  status: newStatus,
                                },
                                { method: "POST" }
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">대기</SelectItem>
                            <SelectItem value="preparing">준비중</SelectItem>
                            <SelectItem value="shipped">출고완료</SelectItem>
                            <SelectItem value="delivered">배송완료</SelectItem>
                            <SelectItem value="cancelled">취소</SelectItem>
                          </SelectContent>
                        </Select>

                        {shipment.status === "shipped" && (
                          <span className="text-xs text-green-600">✓ 재고 차감됨</span>
                        )}

                        {/* 택배 정보 */}
                        <div className="flex-1 flex items-center gap-2 text-sm">
                          {shipment.carrier_name && (
                            <span className="text-muted-foreground">
                              {shipment.carrier_name}
                            </span>
                          )}
                          {shipment.tracking_number && (
                            <span className="font-mono">{shipment.tracking_number}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {shipment.status === "cancelled" && (
                      <div className="text-sm text-destructive pt-2 border-t">
                        출고가 취소되었습니다.
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 메모 */}
          {(order.internal_notes || order.customer_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">메모</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.internal_notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">내부 메모</div>
                    <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {order.internal_notes}
                    </div>
                  </div>
                )}
                {order.customer_notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">고객 요청사항</div>
                    <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {order.customer_notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
