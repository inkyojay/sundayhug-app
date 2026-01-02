/**
 * 교환/반품/AS 관리
 */
import type { Route } from "./+types/returns-list";

import {
  RotateCcwIcon,
  PlusIcon,
  SearchIcon,
  PackageIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  WrenchIcon,
  ArrowLeftRightIcon,
  WarehouseIcon,
  UserIcon,
  PhoneIcon,
  SaveIcon,
  TrashIcon,
  EyeIcon,
  ReceiptIcon,
  LoaderIcon,
} from "lucide-react";
import { useState } from "react";
import { useFetcher, useNavigate, Link } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { Checkbox } from "~/core/components/ui/checkbox";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `교환/반품/AS 관리 | Sundayhug Admin` }];
};

const returnTypes = [
  { value: "exchange", label: "교환", icon: ArrowLeftRightIcon, color: "default" },
  { value: "return", label: "반품", icon: RotateCcwIcon, color: "secondary" },
  { value: "repair", label: "수리(AS)", icon: WrenchIcon, color: "outline" },
];

const returnStatuses = [
  { value: "received", label: "접수", color: "secondary" },
  { value: "pickup_scheduled", label: "수거예정", color: "outline" },
  { value: "pickup_completed", label: "수거완료", color: "outline" },
  { value: "inspecting", label: "검수중", color: "outline" },
  { value: "processing", label: "처리중", color: "default" },
  { value: "shipped", label: "발송완료", color: "default" },
  { value: "refunded", label: "환불완료", color: "default" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

const channels = [
  { value: "cafe24", label: "카페24" },
  { value: "naver", label: "네이버" },
  { value: "coupang", label: "쿠팡" },
  { value: "11st", label: "11번가" },
  { value: "gmarket", label: "G마켓" },
  { value: "auction", label: "옥션" },
  { value: "other", label: "기타" },
];

const getTypeInfo = (type: string) => {
  return returnTypes.find(t => t.value === type) || returnTypes[0];
};

const getStatusInfo = (status: string) => {
  return returnStatuses.find(s => s.value === status) || returnStatuses[0];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const typeFilter = url.searchParams.get("type") || "";
  const statusFilter = url.searchParams.get("status") || "";
  const channelFilter = url.searchParams.get("channel") || "";

  // 창고 목록 조회
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, warehouse_name, warehouse_code")
    .eq("is_active", true)
    .order("warehouse_name");

  // 교환/반품/AS 목록 조회
  let query = supabase
    .from("returns_exchanges")
    .select(`
      *,
      restock_warehouse:warehouses(id, warehouse_name),
      items:return_exchange_items(id, sku, product_name, option_name, quantity, condition, restock_quantity)
    `)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`return_number.ilike.%${search}%,order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  if (typeFilter && typeFilter !== "__all__") {
    query = query.eq("return_type", typeFilter);
  }

  if (statusFilter && statusFilter !== "__all__") {
    query = query.eq("status", statusFilter);
  }

  if (channelFilter && channelFilter !== "__all__") {
    query = query.eq("channel", channelFilter);
  }

  const { data: returns, error } = await query;

  if (error) {
    console.error("Failed to load returns:", error);
  }

  // 제품 목록 (품목 추가용)
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, product_name, color_kr, sku_6_size")
    .eq("is_active", true)
    .order("sku");

  // 새 번호 생성
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("returns_exchanges")
    .select("*", { count: "exact", head: true })
    .ilike("return_number", `RE-${today}%`);
  
  const newReturnNumber = `RE-${today}-${String((count || 0) + 1).padStart(4, "0")}`;

  // 통계
  const activeStatuses = ["received", "pickup_scheduled", "pickup_completed", "inspecting", "processing", "shipped", "refunded"];
  const stats = {
    received: returns?.filter(r => r.status === "received").length || 0,
    processing: returns?.filter(r => activeStatuses.includes(r.status) && r.status !== "received").length || 0,
    exchange: returns?.filter(r => r.return_type === "exchange" && activeStatuses.includes(r.status)).length || 0,
    return: returns?.filter(r => r.return_type === "return" && activeStatuses.includes(r.status)).length || 0,
    repair: returns?.filter(r => r.return_type === "repair" && activeStatuses.includes(r.status)).length || 0,
  };

  return { 
    returns: returns || [], 
    warehouses: warehouses || [],
    products: products || [],
    search, 
    typeFilter,
    statusFilter, 
    channelFilter,
    newReturnNumber,
    stats,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const returnData = {
      return_number: formData.get("return_number") as string,
      order_number: formData.get("order_number") as string || null,
      channel: formData.get("channel") as string || null,
      return_type: formData.get("return_type") as string,
      status: "received",
      reason: formData.get("reason") as string || null,
      customer_name: formData.get("customer_name") as string || null,
      customer_phone: formData.get("customer_phone") as string || null,
      customer_address: formData.get("customer_address") as string || null,
      return_date: formData.get("return_date") as string,
      restock_warehouse_id: formData.get("restock_warehouse_id") as string || null,
      notes: formData.get("notes") as string || null,
    };

    const items = JSON.parse(formData.get("items") as string || "[]");

    // 헤더 생성
    const { data: newReturn, error } = await supabase
      .from("returns_exchanges")
      .insert(returnData)
      .select()
      .single();

    if (error) return { error: error.message };

    // 품목 생성
    if (items.length > 0 && newReturn) {
      const itemsToInsert = items.map((item: any) => ({
        return_exchange_id: newReturn.id,
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        option_name: item.option_name || null,
        quantity: item.quantity,
        return_reason: item.return_reason || null,
        condition: item.condition || "good",
      }));

      await supabase.from("return_exchange_items").insert(itemsToInsert);
    }

    return { success: true, message: "등록되었습니다." };
  }

  if (intent === "update_status") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as string;
    const restocked = formData.get("restocked") === "true";
    const restockWarehouseId = formData.get("restock_warehouse_id") as string || null;

    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };

    if (status === "completed") {
      updateData.completed_date = new Date().toISOString().slice(0, 10);
    }

    if (restocked && restockWarehouseId) {
      updateData.restocked = true;
      updateData.restock_warehouse_id = restockWarehouseId;

      // 재입고 처리
      const { data: returnData } = await supabase
        .from("returns_exchanges")
        .select("items:return_exchange_items(*)")
        .eq("id", id)
        .single();

      if (returnData?.items) {
        for (const item of returnData.items) {
          if (item.condition === "good") {
            const { data: existing } = await supabase
              .from("inventory_locations")
              .select("id, quantity")
              .eq("warehouse_id", restockWarehouseId)
              .eq("sku", item.sku)
              .single();

            if (existing) {
              await supabase
                .from("inventory_locations")
                .update({ 
                  quantity: existing.quantity + item.quantity,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("inventory_locations")
                .insert({
                  warehouse_id: restockWarehouseId,
                  product_id: item.product_id || null,
                  sku: item.sku,
                  quantity: item.quantity,
                });
            }

            // 재입고 수량 업데이트
            await supabase
              .from("return_exchange_items")
              .update({ restock_quantity: item.quantity })
              .eq("id", item.id);
          }
        }
      }
    }

    const { error } = await supabase
      .from("returns_exchanges")
      .update(updateData)
      .eq("id", id);
    
    if (error) return { error: error.message };
    return { success: true };
  }

  // 주문 검색 - orders 테이블에서 검색
  if (intent === "search_order") {
    const searchQuery = formData.get("search_query") as string;

    if (!searchQuery) {
      return { orders: [] };
    }

    // orders 테이블에서 검색 (Cafe24, 네이버 통합)
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id, shop_ord_no, ord_time, to_name, to_tel, to_htel,
        shop_cd, shop_sale_name, shop_opt_name, shop_sku_cd, sale_cnt
      `)
      .in("shop_cd", ["cafe24", "naver"])
      .or(`shop_ord_no.ilike.%${searchQuery}%,to_name.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,to_htel.ilike.%${searchQuery}%`)
      .order("ord_time", { ascending: false })
      .limit(50);

    // 주문번호별로 그룹핑
    const ordersMap = new Map<string, {
      channel: string;
      order_number: string;
      order_date: string;
      customer_name: string;
      customer_phone: string;
      items: Array<{
        sku: string;
        product_name: string;
        option_name: string;
        quantity: number;
      }>;
    }>();

    for (const row of ordersData || []) {
      const key = `${row.shop_cd}_${row.shop_ord_no}`;

      if (!ordersMap.has(key)) {
        ordersMap.set(key, {
          channel: row.shop_cd || "direct",
          order_number: row.shop_ord_no || "",
          order_date: row.ord_time || "",
          customer_name: row.to_name || "",
          customer_phone: row.to_tel || row.to_htel || "",
          items: [],
        });
      }

      const order = ordersMap.get(key)!;
      order.items.push({
        sku: row.shop_sku_cd || "",
        product_name: row.shop_sale_name || "",
        option_name: row.shop_opt_name || "",
        quantity: row.sale_cnt || 1,
      });
    }

    const orders = Array.from(ordersMap.values())
      .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
      .slice(0, 20);

    return { orders };
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

export default function ReturnsList({ loaderData, actionData }: Route.ComponentProps) {
  const { returns, warehouses, products, search, typeFilter, statusFilter, channelFilter, newReturnNumber, stats } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedType, setSelectedType] = useState(typeFilter);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [selectedChannel, setSelectedChannel] = useState(channelFilter);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    return_number: newReturnNumber,
    order_number: "",
    channel: "",
    return_type: "exchange",
    reason: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    return_date: new Date().toISOString().slice(0, 10),
    restock_warehouse_id: "",
    notes: "",
  });
  const [items, setItems] = useState<ReturnItem[]>([]);

  // 상태 변경 다이얼로그
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [statusFormData, setStatusFormData] = useState({
    status: "",
    restocked: false,
    restock_warehouse_id: "",
  });

  // 제품 추가용 다이얼로그
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // 주문 검색
  const orderSearchFetcher = useFetcher();
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [showOrderSearch, setShowOrderSearch] = useState(true);
  const searchingOrders = orderSearchFetcher.state === "submitting" || orderSearchFetcher.state === "loading";
  const orderSearchResults = (orderSearchFetcher.data as any)?.orders || [];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedType) params.set("type", selectedType);
    if (selectedStatus) params.set("status", selectedStatus);
    if (selectedChannel) params.set("channel", selectedChannel);
    navigate(`/dashboard/returns?${params.toString()}`);
  };

  const openCreateDialog = () => {
    setFormData({
      return_number: newReturnNumber,
      order_number: "",
      channel: "",
      return_type: "exchange",
      reason: "",
      customer_name: "",
      customer_phone: "",
      customer_address: "",
      return_date: new Date().toISOString().slice(0, 10),
      restock_warehouse_id: "",
      notes: "",
    });
    setItems([]);
    setShowOrderSearch(true);
    setOrderSearchQuery("");
    orderSearchFetcher.data = null;
    setIsDialogOpen(true);
  };

  // 주문 검색 실행
  const handleOrderSearch = () => {
    if (!orderSearchQuery.trim()) return;
    orderSearchFetcher.submit(
      { intent: "search_order", search_query: orderSearchQuery },
      { method: "post" }
    );
  };

  // 주문 선택 시 폼 데이터 자동 입력
  const selectOrder = (order: any) => {
    setFormData({
      ...formData,
      order_number: order.order_number,
      channel: order.channel,
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
    });

    // 주문 품목 추가
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

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const form = new FormData();
    form.append("intent", "create");
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });
    form.append("items", JSON.stringify(items));
    
    fetcher.submit(form, { method: "post" });
    setIsDialogOpen(false);
  };

  const openStatusDialog = (returnItem: any) => {
    setSelectedReturn(returnItem);
    setStatusFormData({
      status: returnItem.status,
      restocked: returnItem.restocked || false,
      restock_warehouse_id: returnItem.restock_warehouse_id || "",
    });
    setIsStatusDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    const form = new FormData();
    form.append("intent", "update_status");
    form.append("id", selectedReturn.id);
    form.append("status", statusFormData.status);
    form.append("restocked", String(statusFormData.restocked));
    form.append("restock_warehouse_id", statusFormData.restock_warehouse_id);
    
    fetcher.submit(form, { method: "post" });
    setIsStatusDialogOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const filteredProducts = products.filter((p: any) => 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcwIcon className="w-6 h-6" />
            교환/반품/AS 관리
          </h1>
          <p className="text-muted-foreground">
            쇼핑몰 교환, 반품, AS를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/returns/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            등록
          </Link>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">접수 대기</p>
                <p className="text-2xl font-bold">{stats.received}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">처리중</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
              <WrenchIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">교환</p>
                <p className="text-2xl font-bold">{stats.exchange}</p>
              </div>
              <ArrowLeftRightIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">반품</p>
                <p className="text-2xl font-bold">{stats.return}</p>
              </div>
              <RotateCcwIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">수리(AS)</p>
                <p className="text-2xl font-bold">{stats.repair}</p>
              </div>
              <WrenchIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="번호, 주문번호, 고객명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="유형 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">유형 전체</SelectItem>
                {returnTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="상태 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">상태 전체</SelectItem>
                {returnStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="채널 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">채널 전체</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
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
                <TableHead>번호</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>채널/주문번호</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>접수일</TableHead>
                <TableHead className="text-center">품목</TableHead>
                <TableHead>재입고</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((returnItem: any) => {
                  const typeInfo = getTypeInfo(returnItem.return_type);
                  const statusInfo = getStatusInfo(returnItem.status);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {returnItem.return_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeInfo.color as any} className="flex items-center gap-1 w-fit">
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {returnItem.channel && (
                            <span className="text-muted-foreground">
                              {channels.find(c => c.value === returnItem.channel)?.label}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          {returnItem.order_number || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {returnItem.customer_name && (
                          <div className="flex items-center gap-1 text-sm">
                            <UserIcon className="w-3 h-3" />
                            {returnItem.customer_name}
                          </div>
                        )}
                        {returnItem.customer_phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <PhoneIcon className="w-3 h-3" />
                            {returnItem.customer_phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(returnItem.return_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {returnItem.items?.length || 0}
                      </TableCell>
                      <TableCell>
                        {returnItem.restocked ? (
                          <Badge variant="default">완료</Badge>
                        ) : (
                          <Badge variant="secondary">대기</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusInfo.color as any}
                          className={
                            returnItem.status === "received" ? "bg-gray-500 text-white" :
                            returnItem.status === "pickup_scheduled" ? "bg-yellow-500 text-white" :
                            returnItem.status === "pickup_completed" ? "bg-blue-500 text-white" :
                            returnItem.status === "inspecting" ? "bg-purple-500 text-white" :
                            returnItem.status === "processing" ? "bg-orange-500 text-white" :
                            returnItem.status === "shipped" ? "bg-cyan-500 text-white" :
                            returnItem.status === "refunded" ? "bg-green-500 text-white" :
                            returnItem.status === "completed" ? "bg-green-600 text-white" :
                            returnItem.status === "cancelled" ? "bg-red-500 text-white" : ""
                          }
                        >
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link to={`/dashboard/returns/${returnItem.id}/edit`}>
                            <EyeIcon className="w-4 h-4" />
                          </Link>
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

      {/* 등록 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>교환/반품/AS 등록</DialogTitle>
            <DialogDescription>
              주문을 검색하여 정보를 불러오거나 직접 입력할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 주문 검색 섹션 */}
            {showOrderSearch && (
              <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ReceiptIcon className="w-4 h-4" />
                  주문 검색 (선택사항)
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="주문번호, 고객명, 연락처로 검색..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleOrderSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleOrderSearch} disabled={searchingOrders}>
                    {searchingOrders ? (
                      <>
                        <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                        검색 중...
                      </>
                    ) : (
                      "검색"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowOrderSearch(false)}>
                    직접 입력
                  </Button>
                </div>

                {/* 검색 결과 */}
                {orderSearchResults.length > 0 && (
                  <div className="border rounded-lg max-h-[250px] overflow-auto">
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
                          <TableRow key={idx} className="hover:bg-muted/50">
                            <TableCell>
                              <Badge variant={order.channel === "cafe24" ? "default" : "secondary"}>
                                {channels.find(c => c.value === order.channel)?.label || order.channel}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                            <TableCell>{formatDate(order.order_date)}</TableCell>
                            <TableCell>
                              <div className="text-sm">{order.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {order.items.slice(0, 2).map((i: any, iIdx: number) => (
                                  <div key={iIdx} className="truncate max-w-[200px]">
                                    {i.product_name} {i.option_name && `(${i.option_name})`}
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <div className="text-muted-foreground">외 {order.items.length - 2}건</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => selectOrder(order)}>
                                선택
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {orderSearchFetcher.data && orderSearchResults.length === 0 && !searchingOrders && (
                  <div className="text-center py-4 text-muted-foreground">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            )}

            {/* 주문 선택 완료 시 안내 */}
            {!showOrderSearch && formData.order_number && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircleIcon className="w-4 h-4" />
                  주문 정보가 입력되었습니다: {formData.order_number}
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowOrderSearch(true)}>
                  다른 주문 검색
                </Button>
              </div>
            )}

            {/* 유형 선택 */}
            <div className="flex gap-4">
              {returnTypes.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={formData.return_type === type.value ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, return_type: type.value })}
                  >
                    <TypeIcon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                );
              })}
            </div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>번호</Label>
                <Input value={formData.return_number} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>채널</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="채널 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>주문번호</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  placeholder="쇼핑몰 주문번호"
                />
              </div>
              <div className="space-y-2">
                <Label>접수일</Label>
                <Input
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                />
              </div>
            </div>

            {/* 고객 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>고객명</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>연락처</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                />
              </div>
            </div>

            {/* 사유 */}
            <div className="space-y-2">
              <Label>사유</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                placeholder="교환/반품/AS 사유를 입력하세요"
              />
            </div>

            {/* 품목 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>품목</Label>
                <Button size="sm" onClick={() => setIsProductDialogOpen(true)}>
                  <PlusIcon className="w-4 h-4 mr-1" />
                  제품 추가
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead className="w-[80px]">수량</TableHead>
                    <TableHead className="w-[100px]">상태</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        제품을 추가해주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
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
                          <Select 
                            value={item.condition} 
                            onValueChange={(v) => updateItem(index, "condition", v)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">양호</SelectItem>
                              <SelectItem value="damaged">파손</SelectItem>
                              <SelectItem value="defective">불량</SelectItem>
                            </SelectContent>
                          </Select>
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

            {/* 재입고 창고 */}
            <div className="space-y-2">
              <Label>재입고 창고</Label>
              <Select 
                value={formData.restock_warehouse_id} 
                onValueChange={(v) => setFormData({ ...formData, restock_warehouse_id: v })}
              >
                <SelectTrigger className="w-[200px]">
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

            {/* 비고 */}
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={items.length === 0}>
              <SaveIcon className="w-4 h-4 mr-2" />
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상태 변경 다이얼로그 */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상태 변경</DialogTitle>
            <DialogDescription>
              {selectedReturn?.return_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>상태</Label>
              <Select 
                value={statusFormData.status} 
                onValueChange={(v) => setStatusFormData({ ...statusFormData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {returnStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {statusFormData.status === "completed" && !selectedReturn?.restocked && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="restocked"
                    checked={statusFormData.restocked}
                    onCheckedChange={(checked) => setStatusFormData({ ...statusFormData, restocked: !!checked })}
                  />
                  <Label htmlFor="restocked">양호 상품 재입고 처리</Label>
                </div>

                {statusFormData.restocked && (
                  <div className="space-y-2">
                    <Label>재입고 창고</Label>
                    <Select 
                      value={statusFormData.restock_warehouse_id} 
                      onValueChange={(v) => setStatusFormData({ ...statusFormData, restock_warehouse_id: v })}
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
                )}
              </>
            )}

            {/* 품목 정보 */}
            {selectedReturn?.items && selectedReturn.items.length > 0 && (
              <div className="space-y-2">
                <Label>품목</Label>
                <div className="text-sm space-y-1">
                  {selectedReturn.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 bg-muted rounded">
                      <span>{item.sku} - {item.product_name}</span>
                      <span>
                        {item.quantity}개 
                        <Badge variant="outline" className="ml-2">
                          {item.condition === "good" ? "양호" : item.condition === "damaged" ? "파손" : "불량"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleStatusUpdate}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 제품 선택 다이얼로그 */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>제품 선택</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="SKU 또는 제품명 검색..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto">
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
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{product.product_name || "-"}</TableCell>
                    <TableCell>{product.color_kr || "-"}</TableCell>
                    <TableCell>{product.sku_6_size || "-"}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => addProduct(product)}>
                        추가
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

