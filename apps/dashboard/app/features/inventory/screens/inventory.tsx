/**
 * 재고 관리 - 재고 현황
 */
import type { Route } from "./+types/inventory";

import { PackageIcon, SearchIcon, RefreshCwIcon, AlertTriangleIcon, FilterIcon } from "lucide-react";
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
  const limit = 50;
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
    search,
    filters: { stockFilter, parentSku, color, size },
    filterOptions: {
      parentSkus: parentSkuOptions,
      colors: colorOptions,
      sizes: sizeOptions,
    },
  };
}

// 재고 동기화 Action (서버에서 실행)
export async function action({ request }: Route.ActionArgs) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  // SERVICE_ROLE_KEY가 있으면 사용, 없으면 ANON_KEY 사용
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
  const { inventory, stats, totalCount, currentPage, totalPages, search, filters, filterOptions } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const syncing = fetcher.state === "submitting" || fetcher.state === "loading";
  const hasHandledRef = useRef(false);

  // 동기화 결과 처리
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && !hasHandledRef.current) {
      hasHandledRef.current = true;
      if (fetcher.data.success) {
        setSyncMessage(`✅ ${fetcher.data.message} (${fetcher.data.data?.itemsSynced}개 동기화)`);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${fetcher.data.error}`);
      }
      // 5초 후 메시지 제거
      setTimeout(() => setSyncMessage(null), 5000);
    }
    // fetcher 상태가 submitting으로 바뀌면 ref 리셋
    if (fetcher.state === "submitting") {
      hasHandledRef.current = false;
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  // URL 파라미터 생성 헬퍼
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newStockFilter = overrides.stockFilter !== undefined ? overrides.stockFilter : filters.stockFilter;
    const newParentSku = overrides.parentSku !== undefined ? overrides.parentSku : filters.parentSku;
    const newColor = overrides.color !== undefined ? overrides.color : filters.color;
    const newSize = overrides.size !== undefined ? overrides.size : filters.size;
    const newPage = overrides.page !== undefined ? overrides.page : "1";

    if (newSearch) params.set("search", newSearch);
    if (newStockFilter && newStockFilter !== "all") params.set("stockFilter", newStockFilter);
    if (newParentSku) params.set("parentSku", newParentSku);
    if (newColor) params.set("color", newColor);
    if (newSize) params.set("size", newSize);
    if (newPage && newPage !== "1") params.set("page", newPage);
    
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
    fetcher.submit({}, { method: "POST" });
  };

  const hasActiveFilters = search || filters.stockFilter !== "all" || filters.parentSku || filters.color || filters.size;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 동기화 결과 메시지 */}
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
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "재고 동기화"}
        </Button>
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

      {/* 재고 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>재고 목록</CardTitle>
          <CardDescription>
            {hasActiveFilters ? "필터링된 결과" : "전체 재고"} ({totalCount.toLocaleString()}개)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">SKU</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead className="w-[100px]">색상</TableHead>
                <TableHead className="w-[70px]">사이즈</TableHead>
                <TableHead className="text-right w-[80px]">현재고</TableHead>
                <TableHead className="text-right w-[80px]">안전재고</TableHead>
                <TableHead className="text-right w-[80px]">변동</TableHead>
                <TableHead className="w-[140px]">동기화 시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item: any) => (
                <TableRow key={item.id}>
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
                    >
                      {item.current_stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.alert_threshold}
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "검색 결과가 없습니다" : "재고 데이터가 없습니다"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
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
    </div>
  );
}
