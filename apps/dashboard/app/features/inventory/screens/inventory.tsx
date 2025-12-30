/**
 * 재고 관리 - 재고 현황 (Airtable 스타일)
 * 
 * - 인라인 편집 (안전재고)
 * - 일괄 안전재고 설정
 * - CSV 내보내기
 */
import type { Route } from "./+types/inventory";

import { 
  PackageIcon, 
  SearchIcon, 
  RefreshCwIcon, 
  AlertTriangleIcon, 
  FilterIcon,
  DownloadIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  SettingsIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `재고 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const stockFilter = url.searchParams.get("stockFilter") || "all"; // all, low, zero
  const parentSku = url.searchParams.get("parentSku") || "";
  const color = url.searchParams.get("color") || "";
  const size = url.searchParams.get("size") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limitParam = url.searchParams.get("limit") || "50";
  const limit = parseInt(limitParam);
  const offset = (page - 1) * limit;

  // 필터 옵션 데이터 가져오기
  const [parentSkusResult, colorsResult, sizesResult] = await Promise.all([
    supabase
      .from("parent_products")
      .select("parent_sku, product_name")
      .order("product_name", { ascending: true }),
    supabase
      .from("products")
      .select("color_kr")
      .not("color_kr", "is", null)
      .not("color_kr", "eq", ""),
    supabase
      .from("products")
      .select("sku_6_size")
      .not("sku_6_size", "is", null)
      .not("sku_6_size", "eq", ""),
  ]);

  // 중복 제거
  const parentSkuOptions = parentSkusResult.data || [];
  const colorOptions = [...new Set(colorsResult.data?.map((c: any) => c.color_kr))].sort();
  const sizeOptions = [...new Set(sizesResult.data?.map((s: any) => s.sku_6_size))].sort();

  // 최신 재고 데이터 (SKU별 가장 최근 데이터)
  const { data: latestInventory } = await supabase
    .from("inventory")
    .select("sku, current_stock, alert_threshold")
    .order("synced_at", { ascending: false });

  // SKU별 최신 데이터만 추출
  const uniqueInventory = new Map();
  latestInventory?.forEach((item: any) => {
    if (!uniqueInventory.has(item.sku)) {
      uniqueInventory.set(item.sku, item);
    }
  });
  const uniqueItems = Array.from(uniqueInventory.values());

  const stats = {
    total: uniqueItems.length,
    totalStock: uniqueItems.reduce((sum, item) => sum + (item.current_stock || 0), 0),
    lowStock: uniqueItems.filter(item => item.current_stock <= item.alert_threshold && item.current_stock > 0).length,
    zeroStock: uniqueItems.filter(item => item.current_stock === 0).length,
  };

  // 재고 목록 쿼리 - products 테이블과 조인
  let query = supabase
    .from("inventory")
    .select(`
      id,
      sku,
      current_stock,
      previous_stock,
      stock_change,
      alert_threshold,
      synced_at,
      products!inner (
        product_name,
        parent_sku,
        color_kr,
        sku_6_size
      )
    `)
    .order("synced_at", { ascending: false });

  // 재고 상태 필터
  if (stockFilter === "low") {
    query = query.gt("current_stock", 0).lte("current_stock", 10);
  } else if (stockFilter === "zero") {
    query = query.eq("current_stock", 0);
  }

  // 검색 적용
  if (search) {
    query = query.ilike("sku", `%${search}%`);
  }

  // Parent SKU 필터
  if (parentSku) {
    query = query.eq("products.parent_sku", parentSku);
  }

  // 색상 필터
  if (color) {
    query = query.eq("products.color_kr", color);
  }

  // 사이즈 필터
  if (size) {
    query = query.eq("products.sku_6_size", size);
  }

  // 전체 개수 쿼리
  let countQuery = supabase
    .from("inventory")
    .select("*, products!inner(*)", { count: "exact", head: true });
  
  if (stockFilter === "low") {
    countQuery = countQuery.gt("current_stock", 0).lte("current_stock", 10);
  } else if (stockFilter === "zero") {
    countQuery = countQuery.eq("current_stock", 0);
  }
  if (search) {
    countQuery = countQuery.ilike("sku", `%${search}%`);
  }
  if (parentSku) {
    countQuery = countQuery.eq("products.parent_sku", parentSku);
  }
  if (color) {
    countQuery = countQuery.eq("products.color_kr", color);
  }
  if (size) {
    countQuery = countQuery.eq("products.sku_6_size", size);
  }
  
  const { count: totalCount } = await countQuery;

  // 페이지네이션 적용
  query = query.range(offset, offset + limit - 1);

  const { data: inventory } = await query;

  return {
    inventory: inventory || [],
    stats,
    totalCount: totalCount || 0,
    currentPage: page,
    totalPages: Math.ceil((totalCount || 0) / limit),
    limit,
    search,
    filters: { stockFilter, parentSku, color, size },
    filterOptions: {
      parentSkus: parentSkuOptions,
      colors: colorOptions,
      sizes: sizeOptions,
    },
  };
}

// 재고 동기화 및 안전재고 수정 Action
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 안전재고 단일 수정
  if (actionType === "updateThreshold") {
    const inventoryId = formData.get("inventoryId") as string;
    const alertThreshold = parseInt(formData.get("alertThreshold") as string);

    const { error } = await adminClient
      .from("inventory")
      .update({ alert_threshold: alertThreshold })
      .eq("id", inventoryId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: "안전재고가 업데이트되었습니다." };
  }

  // 안전재고 일괄 수정
  if (actionType === "bulkUpdateThreshold") {
    const inventoryIds = JSON.parse(formData.get("inventoryIds") as string) as string[];
    const alertThreshold = parseInt(formData.get("alertThreshold") as string);

    let successCount = 0;
    for (const id of inventoryIds) {
      const { error } = await adminClient
        .from("inventory")
        .update({ alert_threshold: alertThreshold })
        .eq("id", id);
      
      if (!error) successCount++;
    }

    return { success: true, message: `${successCount}개 항목의 안전재고가 ${alertThreshold}로 설정되었습니다.` };
  }

  // 재고 동기화
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/sync-inventory-simple`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ trigger: "manual" }),
      }
    );

    const result = await response.json();
    
    if (response.ok && result.success) {
      return { success: true, message: "재고 동기화가 완료되었습니다!", data: result.data };
    } else {
      return { success: false, error: result.error || "동기화 중 오류가 발생했습니다." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "동기화 중 오류가 발생했습니다." };
  }
}

export default function Inventory({ loaderData }: Route.ComponentProps) {
  const { inventory, stats, totalCount, currentPage, totalPages, limit, search, filters, filterOptions } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // 선택 관련
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // 인라인 편집
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState("");
  
  // 일괄 처리 다이얼로그
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkThreshold, setBulkThreshold] = useState("10");
  
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const syncing = fetcher.state === "submitting" || fetcher.state === "loading";
  const hasHandledRef = useRef(false);

  // 전체 선택 상태
  const isAllSelected = inventory.length > 0 && selectedItems.size === inventory.length;
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < inventory.length;

  // 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && !hasHandledRef.current) {
      hasHandledRef.current = true;
      if ((fetcher.data as any).success) {
        const data = (fetcher.data as any).data;
        const msg = data?.itemsSynced 
          ? `✅ ${(fetcher.data as any).message} (${data.itemsSynced}개 동기화)`
          : `✅ ${(fetcher.data as any).message}`;
        setSyncMessage(msg);
        setSelectedItems(new Set());
        setEditingId(null);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${(fetcher.data as any).error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (fetcher.state === "submitting") {
      hasHandledRef.current = false;
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  // URL 파라미터 생성
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newStockFilter = overrides.stockFilter !== undefined ? overrides.stockFilter : filters.stockFilter;
    const newParentSku = overrides.parentSku !== undefined ? overrides.parentSku : filters.parentSku;
    const newColor = overrides.color !== undefined ? overrides.color : filters.color;
    const newSize = overrides.size !== undefined ? overrides.size : filters.size;
    const newPage = overrides.page !== undefined ? overrides.page : "1";
    const newLimit = overrides.limit !== undefined ? overrides.limit : String(limit);

    if (newSearch) params.set("search", newSearch);
    if (newStockFilter && newStockFilter !== "all") params.set("stockFilter", newStockFilter);
    if (newParentSku) params.set("parentSku", newParentSku);
    if (newColor) params.set("color", newColor);
    if (newSize) params.set("size", newSize);
    if (newPage && newPage !== "1") params.set("page", newPage);
    if (newLimit && newLimit !== "50") params.set("limit", newLimit);
    
    const queryString = params.toString();
    return `/dashboard/inventory${queryString ? `?${queryString}` : ""}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newValue = value === "all" ? "" : value;
    window.location.href = buildUrl({ [filterType]: newValue || null });
  };

  const handleReset = () => {
    window.location.href = "/dashboard/inventory";
  };

  const handleSync = () => {
    fetcher.submit({ actionType: "sync" }, { method: "POST" });
  };

  // 선택 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(inventory.map((i: any) => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedItems);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedItems(newSet);
  };

  // 인라인 편집
  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditThreshold(String(item.alert_threshold || 10));
  };

  const saveThreshold = (item: any) => {
    fetcher.submit(
      {
        actionType: "updateThreshold",
        inventoryId: item.id,
        alertThreshold: editThreshold,
      },
      { method: "POST" }
    );
  };

  // 일괄 설정
  const handleBulkUpdate = () => {
    fetcher.submit(
      {
        actionType: "bulkUpdateThreshold",
        inventoryIds: JSON.stringify(Array.from(selectedItems)),
        alertThreshold: bulkThreshold,
      },
      { method: "POST" }
    );
    setShowBulkDialog(false);
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const headers = ["SKU", "제품명", "분류", "색상", "사이즈", "현재고", "안전재고", "변동", "동기화시간"];
    const rows = inventory.map((item: any) => [
      item.sku,
      item.products?.product_name || "",
      item.products?.parent_sku || "",
      item.products?.color_kr || "",
      item.products?.sku_6_size || "",
      item.current_stock,
      item.alert_threshold,
      item.stock_change || 0,
      item.synced_at || "",
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const hasActiveFilters = search || filters.stockFilter !== "all" || filters.parentSku || filters.color || filters.size;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 결과 메시지 */}
      {syncMessage && (
        <div className={`p-4 rounded-lg ${syncMessage.startsWith("✅") ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
          {syncMessage}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageIcon className="h-6 w-6" />
            재고 관리
          </h1>
          <p className="text-muted-foreground">PlayAuto 재고 현황</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "동기화 중..." : "재고 동기화"}
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("stockFilter", "all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 SKU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 재고</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("stockFilter", "low")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
              재고 부족
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.lowStock.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleFilterChange("stockFilter", "zero")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertTriangleIcon className="h-4 w-4 text-destructive" />
              품절
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.zeroStock.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="SKU로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>

          {/* 드롭다운 필터 */}
          <div className="flex flex-wrap gap-3 items-center">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />

            {/* 재고 상태 필터 */}
            <Select 
              value={filters.stockFilter || "all"} 
              onValueChange={(v) => handleFilterChange("stockFilter", v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="재고 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="low">재고 부족</SelectItem>
                <SelectItem value="zero">품절</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Parent SKU 필터 */}
            <Select 
              value={filters.parentSku || "all"} 
              onValueChange={(v) => handleFilterChange("parentSku", v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="제품 분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                {filterOptions.parentSkus.map((p: any) => (
                  <SelectItem key={p.parent_sku} value={p.parent_sku}>
                    {p.product_name || p.parent_sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 색상 필터 */}
            <Select 
              value={filters.color || "all"} 
              onValueChange={(v) => handleFilterChange("color", v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="색상" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 색상</SelectItem>
                {filterOptions.colors.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 사이즈 필터 */}
            <Select 
              value={filters.size || "all"} 
              onValueChange={(v) => handleFilterChange("size", v)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="사이즈" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 사이즈</SelectItem>
                {filterOptions.sizes.map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 페이지당 개수 */}
            <Select 
              value={String(limit)} 
              onValueChange={(v) => window.location.href = buildUrl({ limit: v })}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[50, 100, 200, 500].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}개씩</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 필터 초기화 */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                필터 초기화
              </Button>
            )}
          </div>

          {/* 활성 필터 표시 */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {search && (
                <Badge variant="secondary" className="gap-1">
                  검색: {search}
                </Badge>
              )}
              {filters.stockFilter && filters.stockFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  상태: {filters.stockFilter === "low" ? "재고 부족" : "품절"}
                </Badge>
              )}
              {filters.parentSku && (
                <Badge variant="secondary" className="gap-1">
                  분류: {filterOptions.parentSkus.find((p: any) => p.parent_sku === filters.parentSku)?.product_name || filters.parentSku}
                </Badge>
              )}
              {filters.color && (
                <Badge variant="secondary" className="gap-1">
                  색상: {filters.color}
                </Badge>
              )}
              {filters.size && (
                <Badge variant="secondary" className="gap-1">
                  사이즈: {filters.size}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 일괄 처리 버튼 */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedItems.size}개 선택됨
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowBulkDialog(true)}>
            <SettingsIcon className="h-4 w-4 mr-1" />
            안전재고 일괄 설정
          </Button>
        </div>
      )}

      {/* 재고 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>재고 목록</CardTitle>
          <CardDescription>
            {hasActiveFilters ? "필터링된 결과" : "전체 재고"} ({totalCount.toLocaleString()}개)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className={isSomeSelected ? "opacity-50" : ""}
                    />
                  </TableHead>
                  <TableHead className="w-[180px]">SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="w-[100px]">색상</TableHead>
                  <TableHead className="w-[70px]">사이즈</TableHead>
                  <TableHead className="text-right w-[80px]">현재고</TableHead>
                  <TableHead className="text-right w-[120px]">안전재고</TableHead>
                  <TableHead className="text-right w-[80px]">변동</TableHead>
                  <TableHead className="w-[140px]">동기화 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item: any) => (
                  <TableRow 
                    key={item.id}
                    className={selectedItems.has(item.id) ? "bg-blue-50" : "hover:bg-muted/50"}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {item.products?.product_name || "-"}
                    </TableCell>
                    <TableCell>
                      {item.products?.color_kr ? (
                        <Badge variant="outline" className="text-xs">{item.products.color_kr}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.products?.sku_6_size ? (
                        <Badge variant="secondary" className="text-xs">{item.products.sku_6_size}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={
                          item.current_stock === 0 ? "destructive" : 
                          item.current_stock <= item.alert_threshold ? "outline" : 
                          "secondary"
                        }
                        className={
                          item.current_stock === 0 ? "" : 
                          item.current_stock <= item.alert_threshold ? "border-yellow-500 text-yellow-700" : 
                          ""
                        }
                      >
                        {item.current_stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(e.target.value)}
                            className="w-16 h-7 text-xs text-right"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => saveThreshold(item)}
                            disabled={syncing}
                          >
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingId(null)}
                          >
                            <XIcon className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground">{item.alert_threshold}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => startEdit(item)}
                          >
                            <PencilIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.stock_change !== 0 && (
                        <span className={item.stock_change > 0 ? "text-green-500" : "text-red-500"}>
                          {item.stock_change > 0 ? "+" : ""}{item.stock_change}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {item.synced_at 
                        ? new Date(item.synced_at).toLocaleString("ko-KR")
                        : "-"
                      }
                    </TableCell>
                  </TableRow>
                ))}
                {inventory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters ? "검색 결과가 없습니다" : "재고 데이터가 없습니다"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                페이지 {currentPage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage - 1) })}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => window.location.href = buildUrl({ page: String(currentPage + 1) })}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 안전재고 일괄 설정 다이얼로그 */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>안전재고 일괄 설정</DialogTitle>
            <DialogDescription>
              선택한 {selectedItems.size}개 항목의 안전재고를 일괄 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">안전재고</label>
            <Input
              type="number"
              value={bulkThreshold}
              onChange={(e) => setBulkThreshold(e.target.value)}
              min="0"
              className="mt-2"
              placeholder="예: 10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>취소</Button>
            <Button onClick={handleBulkUpdate} disabled={syncing}>
              {syncing ? "처리 중..." : "설정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
