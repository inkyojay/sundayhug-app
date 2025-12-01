/**
 * 제품 관리 - 제품 목록
 */
import type { Route } from "./+types/products";

import { BoxIcon, SearchIcon, RefreshCwIcon, FilterIcon } from "lucide-react";
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
  return [{ title: `제품 관리 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  // URL에서 검색어 및 필터 가져오기
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
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

  // 제품 수 및 목록 쿼리 빌드
  let countQuery = supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  
  let query = supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  // 필터 적용
  if (search) {
    countQuery = countQuery.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
    query = query.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
  }
  if (parentSku) {
    countQuery = countQuery.eq("parent_sku", parentSku);
    query = query.eq("parent_sku", parentSku);
  }
  if (color) {
    countQuery = countQuery.eq("color_kr", color);
    query = query.eq("color_kr", color);
  }
  if (size) {
    countQuery = countQuery.eq("sku_6_size", size);
    query = query.eq("sku_6_size", size);
  }
  
  const { count: totalCount } = await countQuery;

  // 페이지네이션 적용
  query = query.range(offset, offset + limit - 1);
  const { data: products } = await query;

  return {
    products: products || [],
    totalCount: totalCount || 0,
    currentPage: page,
    totalPages: Math.ceil((totalCount || 0) / limit),
    search,
    filters: { parentSku, color, size },
    filterOptions: {
      parentSkus: parentSkuOptions,
      colors: colorOptions,
      sizes: sizeOptions,
    },
  };
}

// 제품 동기화 Action (서버에서 실행) - 재고 동기화 시 제품도 함께 동기화됨
export async function action({ request }: Route.ActionArgs) {
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
      return { success: true, message: "제품 동기화가 완료되었습니다!", data: result.data };
    } else {
      return { success: false, error: result.error || "동기화 중 오류가 발생했습니다." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "동기화 중 오류가 발생했습니다." };
  }
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { products, totalCount, currentPage, totalPages, search, filters, filterOptions } = loaderData;
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
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (fetcher.state === "submitting") {
      hasHandledRef.current = false;
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  // URL 파라미터 생성 헬퍼
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newParentSku = overrides.parentSku !== undefined ? overrides.parentSku : filters.parentSku;
    const newColor = overrides.color !== undefined ? overrides.color : filters.color;
    const newSize = overrides.size !== undefined ? overrides.size : filters.size;
    const newPage = overrides.page !== undefined ? overrides.page : "1";

    if (newSearch) params.set("search", newSearch);
    if (newParentSku) params.set("parentSku", newParentSku);
    if (newColor) params.set("color", newColor);
    if (newSize) params.set("size", newSize);
    if (newPage !== "1") params.set("page", newPage);
    
    const queryString = params.toString();
    return `/dashboard/products${queryString ? `?${queryString}` : ""}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newValue = value === "all" ? null : value;
    window.location.href = buildUrl({ [filterType]: newValue });
  };

  const handleReset = () => {
    window.location.href = "/dashboard/products";
  };

  const handleSync = () => {
    fetcher.submit({}, { method: "POST" });
  };

  const hasActiveFilters = search || filters.parentSku || filters.color || filters.size;

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
            <BoxIcon className="h-6 w-6" />
            제품 관리
          </h1>
          <p className="text-muted-foreground">등록된 제품 목록 ({totalCount.toLocaleString()}개)</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "제품 동기화"}
        </Button>
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="SKU 또는 제품명으로 검색..."
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

      {/* 제품 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>제품 목록</CardTitle>
          <CardDescription>
            {hasActiveFilters ? "필터링된 결과" : "전체 제품 목록"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">SKU</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead className="w-[120px]">색상</TableHead>
                <TableHead className="w-[80px]">사이즈</TableHead>
                <TableHead className="w-[150px]">분류</TableHead>
                <TableHead className="w-[80px]">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{product.product_name || "-"}</TableCell>
                  <TableCell>
                    {product.color_kr ? (
                      <Badge variant="outline">{product.color_kr}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.sku_6_size ? (
                      <Badge variant="secondary">{product.sku_6_size}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                    {product.parent_sku || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "검색 결과가 없습니다" : "등록된 제품이 없습니다"}
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
