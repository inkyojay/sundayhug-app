/**
 * 재고 변동 이력 조회
 */
import type { Route } from "./+types/inventory-history";

import {
  HistoryIcon,
  SearchIcon,
  DownloadIcon,
  FilterIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PackageIcon,
  TruckIcon,
  RotateCcwIcon,
  ArrowLeftRightIcon,
  UploadIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

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

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `재고 이력 | Sundayhug Admin` }];
};

// 변동 유형 정의
const changeTypes = [
  { value: "adjustment", label: "수동 조정", icon: RefreshCwIcon, color: "secondary" },
  { value: "receipt", label: "입고", icon: ArrowDownIcon, color: "default" },
  { value: "shipment", label: "출고", icon: ArrowUpIcon, color: "destructive" },
  { value: "transfer_in", label: "이동 입고", icon: ArrowLeftRightIcon, color: "default" },
  { value: "transfer_out", label: "이동 출고", icon: ArrowLeftRightIcon, color: "outline" },
  { value: "return", label: "반품 입고", icon: RotateCcwIcon, color: "default" },
  { value: "csv_import", label: "CSV 수정", icon: UploadIcon, color: "secondary" },
  { value: "sync", label: "외부 동기화", icon: RefreshCwIcon, color: "outline" },
];

const getChangeTypeInfo = (type: string) => {
  return changeTypes.find(t => t.value === type) || changeTypes[0];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const changeType = url.searchParams.get("changeType") || "";
  const warehouseId = url.searchParams.get("warehouse") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  // 창고 목록 조회
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, warehouse_name, warehouse_code")
    .eq("is_active", true)
    .order("warehouse_name");

  // 재고 이력 조회
  let query = supabase
    .from("inventory_history")
    .select(`
      *,
      product:products(product_name, color_kr, sku_6_size),
      warehouse:warehouses(warehouse_name, warehouse_code)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("sku", `%${search}%`);
  }

  if (changeType && changeType !== "__all__") {
    query = query.eq("change_type", changeType);
  }

  if (warehouseId && warehouseId !== "__all__") {
    query = query.eq("warehouse_id", warehouseId);
  }

  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data: history, count, error } = await query;

  if (error) {
    console.error("Failed to load inventory history:", error);
  }

  // 통계 (오늘 기준)
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayStats } = await supabase
    .from("inventory_history")
    .select("change_type, stock_change")
    .gte("created_at", `${today}T00:00:00`);

  const stats = {
    todayChanges: todayStats?.length || 0,
    todayIn: todayStats?.filter(s => (s.stock_change || 0) > 0).reduce((sum, s) => sum + (s.stock_change || 0), 0) || 0,
    todayOut: Math.abs(todayStats?.filter(s => (s.stock_change || 0) < 0).reduce((sum, s) => sum + (s.stock_change || 0), 0) || 0),
  };

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    history: history || [],
    warehouses: warehouses || [],
    stats,
    filters: { search, changeType, warehouseId, dateFrom, dateTo },
    pagination: { page, totalPages, total: count || 0 },
  };
}

export default function InventoryHistory({ loaderData }: Route.ComponentProps) {
  const { history, warehouses, stats, filters, pagination } = loaderData;
  const navigate = useNavigate();

  const [search, setSearch] = useState(filters.search);
  const [changeType, setChangeType] = useState(filters.changeType);
  const [warehouseId, setWarehouseId] = useState(filters.warehouseId);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (changeType) params.set("changeType", changeType);
    if (warehouseId) params.set("warehouse", warehouseId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    navigate(`/dashboard/inventory-history?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (changeType) params.set("changeType", changeType);
    if (warehouseId) params.set("warehouse", warehouseId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(newPage));
    navigate(`/dashboard/inventory-history?${params.toString()}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExportCSV = () => {
    // CSV 다운로드 (현재 필터 적용)
    const headers = ["일시", "SKU", "제품명", "창고", "유형", "변동 전", "변동 후", "변동량", "사유"];
    const rows = history.map((item: any) => [
      formatDate(item.created_at),
      item.sku,
      item.product?.product_name || "",
      item.warehouse?.warehouse_name || "전체",
      getChangeTypeInfo(item.change_type).label,
      item.stock_before,
      item.stock_after,
      item.stock_change > 0 ? `+${item.stock_change}` : item.stock_change,
      item.change_reason || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HistoryIcon className="w-6 h-6" />
            재고 이력
          </h1>
          <p className="text-muted-foreground">
            재고 변동 내역을 조회합니다.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <DownloadIcon className="w-4 h-4 mr-2" />
          CSV 다운로드
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 변동 건수</p>
                <p className="text-2xl font-bold">{stats.todayChanges}</p>
              </div>
              <HistoryIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 입고</p>
                <p className="text-2xl font-bold text-green-600">+{stats.todayIn}</p>
              </div>
              <ArrowDownIcon className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 출고</p>
                <p className="text-2xl font-bold text-red-600">-{stats.todayOut}</p>
              </div>
              <ArrowUpIcon className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="SKU 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={changeType} onValueChange={setChangeType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="유형 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">유형 전체</SelectItem>
                {changeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="창고 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">창고 전체</SelectItem>
                {warehouses.map((wh: any) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
              placeholder="시작일"
            />
            <span className="text-muted-foreground">~</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
              placeholder="종료일"
            />
            <Button onClick={handleSearch}>
              <FilterIcon className="w-4 h-4 mr-2" />
              조회
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">일시</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead>창고</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">변동 전</TableHead>
                <TableHead className="text-right">변동 후</TableHead>
                <TableHead className="text-right">변동량</TableHead>
                <TableHead>사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    재고 이력이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item: any) => {
                  const typeInfo = getChangeTypeInfo(item.change_type);
                  const TypeIcon = typeInfo.icon;
                  const isPositive = item.stock_change > 0;
                  const isNegative = item.stock_change < 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {item.sku}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.product?.product_name || "-"}
                        </div>
                        {(item.product?.color_kr || item.product?.sku_6_size) && (
                          <div className="text-xs text-muted-foreground">
                            {[item.product?.color_kr, item.product?.sku_6_size].filter(Boolean).join(" / ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.warehouse?.warehouse_name || (
                          <span className="text-muted-foreground">전체</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeInfo.color as any} className="flex items-center gap-1 w-fit">
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.stock_before}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.stock_after}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-medium ${isPositive ? "text-green-600" : isNegative ? "text-red-600" : ""}`}>
                        {isPositive ? "+" : ""}{item.stock_change}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.change_reason || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                총 {pagination.total}건 중 {(pagination.page - 1) * 50 + 1}-{Math.min(pagination.page * 50, pagination.total)}건
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  이전
                </Button>
                <span className="text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
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
