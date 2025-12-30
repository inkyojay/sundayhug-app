/**
 * 발주 관리 - 발주서 목록
 */
import type { Route } from "./+types/purchase-order-list";

import { 
  ClipboardListIcon, 
  PlusIcon, 
  EyeIcon, 
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  SendIcon,
  FactoryIcon,
  CalendarIcon,
  PackageIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
  TrashIcon,
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
  return [{ title: `발주 관리 | Sundayhug Admin` }];
};

const orderStatuses = [
  { value: "draft", label: "작성중", color: "secondary", icon: ClipboardListIcon },
  { value: "sent", label: "발주완료", color: "default", icon: SendIcon },
  { value: "in_production", label: "제작중", color: "outline", icon: FactoryIcon },
  { value: "shipping", label: "배송중", color: "outline", icon: TruckIcon },
  { value: "received", label: "입고완료", color: "default", icon: CheckCircleIcon },
  { value: "cancelled", label: "취소", color: "destructive", icon: XCircleIcon },
];

const getStatusInfo = (status: string) => {
  return orderStatuses.find(s => s.value === status) || orderStatuses[0];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "";
  const factoryFilter = url.searchParams.get("factory") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // 공장 목록 조회
  const { data: factories } = await supabase
    .from("factories")
    .select("id, factory_name, factory_code")
    .eq("is_active", true)
    .order("factory_name");

  // 발주서 목록 조회 (삭제되지 않은 것만)
  let query = supabase
    .from("purchase_orders")
    .select(`
      *,
      factory:factories(id, factory_name, factory_code),
      items:purchase_order_items(id, sku, product_name, quantity, received_quantity)
    `, { count: "exact" })
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("order_number", `%${search}%`);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (factoryFilter && factoryFilter !== "__all__") {
    query = query.eq("factory_id", factoryFilter);
  }

  const { data: orders, count, error } = await query;

  if (error) {
    console.error("Failed to load purchase orders:", error);
  }

  // 상태별 통계
  const { data: statusCounts } = await supabase
    .from("purchase_orders")
    .select("status");
  
  const stats = orderStatuses.reduce((acc, status) => {
    acc[status.value] = statusCounts?.filter(o => o.status === status.value).length || 0;
    return acc;
  }, {} as Record<string, number>);

  return { 
    orders: orders || [], 
    factories: factories || [],
    search, 
    statusFilter, 
    factoryFilter,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    totalCount: count || 0,
    stats,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update_status") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    
    const { error } = await supabase
      .from("purchase_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    
    // 소프트 삭제 (is_deleted = true, deleted_at 설정)
    const { error } = await supabase
      .from("purchase_orders")
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true, message: "발주서가 삭제되었습니다." };
  }

  return { error: "Unknown action" };
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  factory_id: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  total_quantity: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  factory: {
    id: string;
    factory_name: string;
    factory_code: string;
  };
  items: Array<{
    id: string;
    sku: string;
    product_name: string;
    quantity: number;
    received_quantity: number;
  }>;
}

export default function PurchaseOrderList({ loaderData }: Route.ComponentProps) {
  const { orders, factories, search, statusFilter, factoryFilter, page, totalPages, totalCount, stats } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [selectedFactory, setSelectedFactory] = useState(factoryFilter);
  const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedStatus) params.set("status", selectedStatus);
    if (selectedFactory) params.set("factory", selectedFactory);
    navigate(`/dashboard/purchase-orders?${params.toString()}`);
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const form = new FormData();
    form.append("intent", "update_status");
    form.append("id", orderId);
    form.append("status", newStatus);
    fetcher.submit(form, { method: "post" });
  };

  const handleDelete = () => {
    if (!deleteOrder) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", deleteOrder.id);
    fetcher.submit(form, { method: "post" });
    setDeleteOrder(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardListIcon className="w-6 h-6" />
            발주 관리
          </h1>
          <p className="text-muted-foreground">
            공장 발주서를 작성하고 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/purchase-orders/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            발주서 작성
          </Link>
        </Button>
      </div>

      {/* 상태별 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {orderStatuses.map((status) => {
          const StatusIcon = status.icon;
          return (
            <Card 
              key={status.value} 
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${selectedStatus === status.value ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                setSelectedStatus(selectedStatus === status.value ? "" : status.value);
                setTimeout(handleSearch, 0);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{status.label}</p>
                    <p className="text-2xl font-bold">{stats[status.value] || 0}</p>
                  </div>
                  <StatusIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="발주번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); }}>
              <SelectTrigger className="w-[140px]">
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
            <Select value={selectedFactory} onValueChange={(v) => { setSelectedFactory(v); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="공장 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">공장 전체</SelectItem>
                {factories.map((factory: any) => (
                  <SelectItem key={factory.id} value={factory.id}>
                    {factory.factory_name}
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
                <TableHead>발주번호</TableHead>
                <TableHead>공장</TableHead>
                <TableHead>발주일</TableHead>
                <TableHead>예상입고일</TableHead>
                <TableHead className="text-center">품목수</TableHead>
                <TableHead className="text-right">총 수량</TableHead>
                <TableHead className="text-right">총 금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    발주서가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: PurchaseOrder) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FactoryIcon className="w-4 h-4 text-muted-foreground" />
                          {order.factory?.factory_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(order.order_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(order.expected_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {order.items?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.total_quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={order.status} 
                          onValueChange={(v) => handleStatusChange(order.id, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <Badge variant={statusInfo.color as any}>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/dashboard/purchase-orders/${order.id}`}>
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteOrder(order)}
                          >
                            <TrashIcon className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
                    navigate(`/dashboard/purchase-orders?${params.toString()}`);
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
                    navigate(`/dashboard/purchase-orders?${params.toString()}`);
                  }}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteOrder} onOpenChange={(open) => !open && setDeleteOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>발주서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              발주서 "{deleteOrder?.order_number}"를 삭제하시겠습니까?
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
    </div>
  );
}

