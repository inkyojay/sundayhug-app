/**
 * 제품 관리 - 제품 목록
 * 
 * SKU 기반 멀티채널(카페24/네이버) 매핑 및 판매현황 표시
 */
import type { Route } from "./+types/products";

import { 
  BoxIcon, 
  SearchIcon, 
  RefreshCwIcon, 
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StoreIcon,
  ShoppingCartIcon,
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

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `제품 관리 | Sundayhug Admin` }];
};

// 채널 매핑 타입
interface ChannelMapping {
  cafe24: {
    variant_code: string;
    stock_quantity: number;
    additional_price: number;
    product_name: string;
  } | null;
  naver: {
    option_combination_id: number;
    stock_quantity: number;
    price: number;
    product_name: string;
  } | null;
}

// 판매 집계 타입
interface SalesData {
  cafe24: { orderCount: number; totalSales: number };
  naver: { orderCount: number; totalSales: number };
}

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

  // 현재 페이지 SKU 목록
  const skuList = (products || []).map((p: any) => p.sku).filter(Boolean);

  // 채널 매핑 조회 (카페24 variants, 네이버 options)
  const [cafe24VariantsResult, naverOptionsResult] = await Promise.all([
    skuList.length > 0 
      ? supabase
          .from("cafe24_product_variants")
          .select("sku, variant_code, stock_quantity, additional_price, product_no")
          .in("sku", skuList)
      : Promise.resolve({ data: [] }),
    skuList.length > 0 
      ? supabase
          .from("naver_product_options")
          .select("seller_management_code, option_combination_id, stock_quantity, price, origin_product_no")
          .in("seller_management_code", skuList)
      : Promise.resolve({ data: [] }),
  ]);

  // 카페24 제품명 조회
  const cafe24ProductNos = [...new Set((cafe24VariantsResult.data || []).map((v: any) => v.product_no))];
  const { data: cafe24Products } = cafe24ProductNos.length > 0
    ? await supabase.from("cafe24_products").select("product_no, product_name").in("product_no", cafe24ProductNos)
    : { data: [] };

  // 네이버 제품명 조회
  const naverProductNos = [...new Set((naverOptionsResult.data || []).map((o: any) => o.origin_product_no))];
  const { data: naverProducts } = naverProductNos.length > 0
    ? await supabase.from("naver_products").select("origin_product_no, product_name").in("origin_product_no", naverProductNos)
    : { data: [] };

  // SKU별 채널 매핑 맵 생성
  const channelMappings: Record<string, ChannelMapping> = {};
  
  for (const variant of cafe24VariantsResult.data || []) {
    const productName = (cafe24Products || []).find((p: any) => p.product_no === variant.product_no)?.product_name || "";
    if (!channelMappings[variant.sku]) {
      channelMappings[variant.sku] = { cafe24: null, naver: null };
    }
    channelMappings[variant.sku].cafe24 = {
      variant_code: variant.variant_code,
      stock_quantity: variant.stock_quantity,
      additional_price: variant.additional_price,
      product_name: productName,
    };
  }

  for (const option of naverOptionsResult.data || []) {
    const productName = (naverProducts || []).find((p: any) => p.origin_product_no === option.origin_product_no)?.product_name || "";
    if (!channelMappings[option.seller_management_code]) {
      channelMappings[option.seller_management_code] = { cafe24: null, naver: null };
    }
    channelMappings[option.seller_management_code].naver = {
      option_combination_id: option.option_combination_id,
      stock_quantity: option.stock_quantity,
      price: option.price,
      product_name: productName,
    };
  }

  // 주문 집계 조회 (SKU별, 채널별)
  const salesDataMap: Record<string, SalesData> = {};
  
  if (skuList.length > 0) {
    const { data: orderStats } = await supabase
      .from("orders")
      .select("sku, shop_cd, pay_amt")
      .in("sku", skuList);

    // SKU별, 채널별 집계
    for (const order of orderStats || []) {
      if (!order.sku) continue;
      
      if (!salesDataMap[order.sku]) {
        salesDataMap[order.sku] = {
          cafe24: { orderCount: 0, totalSales: 0 },
          naver: { orderCount: 0, totalSales: 0 },
        };
      }
      
      if (order.shop_cd === "cafe24") {
        salesDataMap[order.sku].cafe24.orderCount++;
        salesDataMap[order.sku].cafe24.totalSales += order.pay_amt || 0;
      } else if (order.shop_cd === "naver") {
        salesDataMap[order.sku].naver.orderCount++;
        salesDataMap[order.sku].naver.totalSales += order.pay_amt || 0;
      }
    }
  }

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
    channelMappings,
    salesDataMap,
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
  const { 
    products, 
    totalCount, 
    currentPage, 
    totalPages, 
    search, 
    filters, 
    filterOptions,
    channelMappings,
    salesDataMap,
  } = loaderData;
  
  const [searchInput, setSearchInput] = useState(search);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
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
    if (newPage && newPage !== "1") params.set("page", newPage);
    
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

  const toggleRow = (sku: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedRows(newExpanded);
  };

  const hasActiveFilters = search || filters.parentSku || filters.color || filters.size;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  // 채널 배지 렌더링
  const renderChannelBadges = (sku: string) => {
    const mapping = channelMappings[sku];
    if (!mapping) return <span className="text-muted-foreground">-</span>;
    
    return (
      <div className="flex gap-1">
        {mapping.cafe24 && (
          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-300">
            C24
          </Badge>
        )}
        {mapping.naver && (
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-300">
            NV
          </Badge>
        )}
        {!mapping.cafe24 && !mapping.naver && (
          <span className="text-muted-foreground text-xs">미연결</span>
        )}
      </div>
    );
  };

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
          <p className="text-muted-foreground">등록된 제품 목록 ({totalCount.toLocaleString()}개) · 행을 클릭하면 채널별 상세 정보를 볼 수 있습니다</p>
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
            {hasActiveFilters ? "필터링된 결과" : "전체 제품 목록"} · 채널 컬럼에서 C24=카페24, NV=네이버
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[200px]">SKU</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead className="w-[100px]">채널</TableHead>
                <TableHead className="w-[100px]">색상</TableHead>
                <TableHead className="w-[80px]">사이즈</TableHead>
                <TableHead className="w-[80px]">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: any) => (
                <>
                  {/* 메인 행 */}
                  <TableRow 
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(product.sku)}
                  >
                    <TableCell>
                      {expandedRows.has(product.sku) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{product.product_name || "-"}</TableCell>
                    <TableCell>{renderChannelBadges(product.sku)}</TableCell>
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
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* 확장 행 - 채널별 상세 정보 */}
                  {expandedRows.has(product.sku) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 카페24 정보 */}
                          <div className="border rounded-lg p-4 bg-orange-50/50 dark:bg-orange-950/20">
                            <div className="flex items-center gap-2 mb-3">
                              <StoreIcon className="h-4 w-4 text-orange-600" />
                              <span className="font-semibold text-orange-700 dark:text-orange-400">카페24</span>
                            </div>
                            {channelMappings[product.sku]?.cafe24 ? (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">제품명:</span>
                                  <span className="font-medium truncate max-w-[200px]">
                                    {channelMappings[product.sku].cafe24?.product_name || "-"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Variant:</span>
                                  <span className="font-mono">{channelMappings[product.sku].cafe24?.variant_code}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">재고:</span>
                                  <span className={channelMappings[product.sku].cafe24?.stock_quantity === 0 ? "text-red-500 font-bold" : ""}>
                                    {channelMappings[product.sku].cafe24?.stock_quantity}개
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">추가금액:</span>
                                  <span>{formatPrice(channelMappings[product.sku].cafe24?.additional_price || 0)}</span>
                                </div>
                                {salesDataMap[product.sku]?.cafe24 && (
                                  <>
                                    <hr className="my-2" />
                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                      <ShoppingCartIcon className="h-3 w-3" />
                                      <span>판매현황</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">주문 수:</span>
                                      <span className="font-medium">{salesDataMap[product.sku].cafe24.orderCount}건</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">총 매출:</span>
                                      <span className="font-medium text-green-600">{formatPrice(salesDataMap[product.sku].cafe24.totalSales)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">미연결</p>
                            )}
                          </div>

                          {/* 네이버 정보 */}
                          <div className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                            <div className="flex items-center gap-2 mb-3">
                              <StoreIcon className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-700 dark:text-green-400">스마트스토어</span>
                            </div>
                            {channelMappings[product.sku]?.naver ? (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">제품명:</span>
                                  <span className="font-medium truncate max-w-[200px]">
                                    {channelMappings[product.sku].naver?.product_name || "-"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">옵션ID:</span>
                                  <span className="font-mono">{channelMappings[product.sku].naver?.option_combination_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">재고:</span>
                                  <span className={channelMappings[product.sku].naver?.stock_quantity === 0 ? "text-red-500 font-bold" : ""}>
                                    {channelMappings[product.sku].naver?.stock_quantity}개
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">가격:</span>
                                  <span>{formatPrice(channelMappings[product.sku].naver?.price || 0)}</span>
                                </div>
                                {salesDataMap[product.sku]?.naver && (
                                  <>
                                    <hr className="my-2" />
                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                      <ShoppingCartIcon className="h-3 w-3" />
                                      <span>판매현황</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">주문 수:</span>
                                      <span className="font-medium">{salesDataMap[product.sku].naver.orderCount}건</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">총 매출:</span>
                                      <span className="font-medium text-green-600">{formatPrice(salesDataMap[product.sku].naver.totalSales)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">미연결</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
