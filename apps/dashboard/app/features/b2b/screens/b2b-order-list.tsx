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
  TruckIcon,
  Trash2Icon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useFetcher, useNavigate, useRevalidator } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent } from "~/core/components/ui/card";
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

import {
  getOrders,
  getOrderStats,
  getActiveCustomers,
  updateOrderStatus,
  softDeleteOrder,
  parseOrderQueryParams,
} from "../lib/b2b.server";
import {
  ORDER_STATUS_OPTIONS,
  formatDate,
  formatCurrency,
  getOrderStatusInfo,
  getOrderStatusBadgeVariant,
  type B2BOrder,
} from "../lib/b2b.shared";
import { OrderStatusBadge, PaymentStatusBadge, StatusCards } from "../components";

export const meta: Route.MetaFunction = () => {
  return [{ title: "B2B 주문 관리 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const params = parseOrderQueryParams(url);

  const customers = await getActiveCustomers(supabase);
  const { orders, totalCount, totalPages } = await getOrders(supabase, params);
  const stats = await getOrderStats(supabase);

  return {
    orders,
    customers,
    search: params.search,
    statusFilter: params.statusFilter,
    customerFilter: params.customerFilter,
    page: params.page,
    totalPages,
    totalCount,
    stats,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update_status") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    return updateOrderStatus(supabase, id, status);
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    return softDeleteOrder(supabase, id);
  }

  return { success: false, error: "Unknown intent" };
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
  } = loaderData;

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [selectedCustomer, setSelectedCustomer] = useState(customerFilter);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<any | null>(null);

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

  const handleStatusCardClick = (statusValue: string) => {
    const newStatus = selectedStatus === statusValue ? "" : statusValue;
    setSelectedStatus(newStatus);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (newStatus) params.set("status", newStatus);
    if (selectedCustomer && selectedCustomer !== "__all__")
      params.set("customer", selectedCustomer);
    navigate(`/dashboard/b2b/orders?${params.toString()}`);
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
      <StatusCards
        stats={stats}
        selectedStatus={selectedStatus}
        onStatusClick={handleStatusCardClick}
      />

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
                {ORDER_STATUS_OPTIONS.map((status) => (
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
                orders.map((order: any) => {
                  const statusInfo = getOrderStatusInfo(order.status);
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
                        <PaymentStatusBadge status={order.payment_status} />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(v) => handleStatusChange(order.id, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <OrderStatusBadge status={order.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUS_OPTIONS.map((status) => (
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
