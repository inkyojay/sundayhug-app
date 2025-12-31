/**
 * B2B 주문 목록
 */
import type { Route } from "./+types/b2b-order-list";

import {
  ShoppingCartIcon,
  PlusIcon,
  SearchIcon,
  EyeIcon,
  PencilIcon,
  BuildingIcon,
  CalendarIcon,
  FileTextIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  SendIcon,
  PackageIcon,
  ReceiptIcon,
  Trash2Icon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useFetcher, useNavigate, useRevalidator } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/core/components/ui/dropdown-menu";
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

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "B2B 주문 관리 | Sundayhug Admin" }];
};

// 주문 상태 정의
const orderStatuses = [
  { value: "quote_draft", label: "견적 작성중", color: "secondary", icon: FileTextIcon },
  { value: "quote_sent", label: "견적 발송", color: "default", icon: SendIcon },
  { value: "confirmed", label: "주문 확정", color: "default", icon: CheckCircleIcon },
  { value: "invoice_created", label: "인보이스 발행", color: "outline", icon: ReceiptIcon },
  { value: "shipping", label: "출고 준비", color: "outline", icon: PackageIcon },
  { value: "shipped", label: "출고 완료", color: "default", icon: TruckIcon },
  { value: "completed", label: "완료", color: "default", icon: CheckCircleIcon },
  { value: "cancelled", label: "취소", color: "destructive", icon: XCircleIcon },
];

const getStatusInfo = (status: string) => {
  return orderStatuses.find((s) => s.value === status) || orderStatuses[0];
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const info = getStatusInfo(status);
  return info.color as "default" | "secondary" | "destructive" | "outline";
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "";
  const customerFilter = url.searchParams.get("customer") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // 업체 목록 조회
  const { data: customers } = await supabase
    .from("b2b_customers")
    .select("id, customer_code, company_name")
    .eq("is_deleted", false)
    .eq("is_active", true)
    .order("company_name");

  // 주문 목록 조회
  let query = supabase
    .from("b2b_orders")
    .select(
      `
      *,
      customer:b2b_customers(id, customer_code, company_name, business_type),
      items:b2b_order_items(id, parent_sku, product_name, quantity, unit_price, line_total)
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%`
    );
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (customerFilter && customerFilter !== "__all__") {
    query = query.eq("customer_id", customerFilter);
  }

  const { data: orders, count, error } = await query;

  if (error) {
    console.error("Failed to load B2B orders:", error);
  }

  // 상태별 통계
  const { data: allOrders } = await supabase
    .from("b2b_orders")
    .select("status")
    .eq("is_deleted", false);

  const stats = orderStatuses.reduce(
    (acc, status) => {
      acc[status.value] = allOrders?.filter((o) => o.status === status.value).length || 0;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    orders: orders || [],
    customers: customers || [],
    search,
    statusFilter,
    customerFilter,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    totalCount: count || 0,
    stats,
    error: error?.message,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update_status") {
    const id = formData.get("id") as string;
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
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "상태가 변경되었습니다." };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;

    const { error } = await supabase
      .from("b2b_orders")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "주문이 삭제되었습니다." };
  }

  return { success: false, error: "Unknown intent" };
}

interface B2BOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  order_date: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  customer: {
    id: string;
    customer_code: string;
    company_name: string;
    business_type: string;
  } | null;
  items: Array<{
    id: string;
    parent_sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export default function B2BOrderList({ loaderData }: Route.ComponentProps) {
  const {
    orders,
    customers,
    search,
    statusFilter,
    customerFilter,
    page,
    totalPages,
    totalCount,
    stats,
    error,
  } = loaderData;

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [selectedCustomer, setSelectedCustomer] = useState(customerFilter);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<B2BOrder | null>(null);

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

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedStatus && selectedStatus !== "__all__") params.set("status", selectedStatus);
    if (selectedCustomer && selectedCustomer !== "__all__") params.set("customer", selectedCustomer);
    navigate(`/dashboard/b2b/orders?${params.toString()}`);
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    fetcher.submit(
      { intent: "update_status", id: orderId, status: newStatus },
      { method: "POST" }
    );
  };

  const handleDelete = () => {
    if (!deleteOrder) return;
    fetcher.submit({ intent: "delete", id: deleteOrder.id }, { method: "POST" });
    setDeleteOrder(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const formatCurrency = (amount: number, currency: string = "KRW") => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency,
    }).format(amount);
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

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteOrder} onOpenChange={() => setDeleteOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              주문번호 "{deleteOrder?.order_number}"를 삭제하시겠습니까?
              <br />
              삭제된 주문은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCartIcon className="h-6 w-6" />
            B2B 주문 관리
          </h1>
          <p className="text-gray-500">
            총 {totalCount}건의 주문
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/b2b/orders/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            주문 작성
          </Link>
        </Button>
      </div>

      {/* 상태별 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {orderStatuses.map((status) => {
          const StatusIcon = status.icon;
          const isSelected = selectedStatus === status.value;
          return (
            <Card
              key={status.value}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                const newStatus = isSelected ? "" : status.value;
                setSelectedStatus(newStatus);
                const params = new URLSearchParams();
                if (searchTerm) params.set("search", searchTerm);
                if (newStatus) params.set("status", newStatus);
                if (selectedCustomer && selectedCustomer !== "__all__")
                  params.set("customer", selectedCustomer);
                navigate(`/dashboard/b2b/orders?${params.toString()}`);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                    <p className="text-xl font-bold">{stats[status.value] || 0}</p>
                  </div>
                  <StatusIcon className="w-5 h-5 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="주문번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedStatus || "__all__"}
              onValueChange={(v) => setSelectedStatus(v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">상태 전체</SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedCustomer || "__all__"}
              onValueChange={(v) => setSelectedCustomer(v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="업체 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">업체 전체</SelectItem>
                {customers.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 주문 목록 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">주문번호</TableHead>
                <TableHead>업체</TableHead>
                <TableHead className="w-[100px]">주문일</TableHead>
                <TableHead className="w-[80px] text-center">품목수</TableHead>
                <TableHead className="w-[120px] text-right">총액</TableHead>
                <TableHead className="w-[100px]">결제</TableHead>
                <TableHead className="w-[130px]">상태</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                    주문이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: B2BOrder) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          to={`/dashboard/b2b/orders/${order.id}`}
                          className="font-mono text-sm font-medium text-blue-600 hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {order.customer ? (
                          <div className="flex items-center gap-2">
                            <BuildingIcon className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{order.customer.company_name}</div>
                              <div className="text-xs text-gray-500">
                                {order.customer.business_type === "domestic" ? "국내" : "해외"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(order.order_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{order.items?.length || 0}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total_amount, order.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.payment_status === "paid"
                              ? "default"
                              : order.payment_status === "partial"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {order.payment_status === "paid"
                            ? "결제완료"
                            : order.payment_status === "partial"
                            ? "부분결제"
                            : "미결제"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(v) => handleStatusChange(order.id, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {statusInfo.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {orderStatuses.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/b2b/orders/${order.id}`}>
                                <EyeIcon className="h-4 w-4 mr-2" />
                                상세보기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/b2b/orders/${order.id}/edit`}>
                                <PencilIcon className="h-4 w-4 mr-2" />
                                수정
                              </Link>
                            </DropdownMenuItem>
                            {order.status === "confirmed" || order.status === "invoice_created" ? (
                              <DropdownMenuItem asChild>
                                <Link to={`/dashboard/b2b/orders/${order.id}/shipment`}>
                                  <TruckIcon className="h-4 w-4 mr-2" />
                                  출고 지시
                                </Link>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteOrder(order)}
                            >
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                총 {totalCount}건 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, totalCount)}건
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(page - 1));
                    navigate(`/dashboard/b2b/orders?${params.toString()}`);
                  }}
                >
                  이전
                </Button>
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(page + 1));
                    navigate(`/dashboard/b2b/orders?${params.toString()}`);
                  }}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
