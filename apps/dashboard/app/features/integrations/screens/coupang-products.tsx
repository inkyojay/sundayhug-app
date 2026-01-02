/**
 * 쿠팡 로켓그로스 상품 목록 페이지
 */

import type { Route } from "./+types/coupang-products";

import {
  PackageIcon,
  SearchIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilterIcon,
  LinkIcon,
  Link2OffIcon,
  RocketIcon,
  TruckIcon,
  BoxIcon,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useFetcher } from "react-router";

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
  return [{ title: "쿠팡 상품 목록 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";

  // 상품 목록 조회 (옵션 + 재고 포함)
  let query = supabase
    .from("coupang_products")
    .select(
      `
      *,
      coupang_product_options (
        id,
        vendor_item_id,
        item_name,
        external_vendor_sku,
        original_price,
        sale_price,
        fulfillment_type,
        sku_id
      )
    `,
      { count: "exact" }
    )
    .order("synced_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `seller_product_name.ilike.%${search}%,display_product_name.ilike.%${search}%`
    );
  }

  if (status && status !== "all") {
    query = query.eq("status_name", status);
  }

  const { data: products, count } = await query;

  // 옵션별 재고 조회
  const allVendorItemIds: number[] = [];
  products?.forEach((p: any) => {
    p.coupang_product_options?.forEach((opt: any) => {
      if (opt.vendor_item_id) {
        allVendorItemIds.push(opt.vendor_item_id);
      }
    });
  });

  const { data: inventoryData } = allVendorItemIds.length > 0
    ? await supabase
        .from("coupang_inventory")
        .select("vendor_item_id, total_orderable_quantity")
        .in("vendor_item_id", allVendorItemIds)
    : { data: [] };

  // 재고 맵 생성
  const inventoryMap: Record<number, number> = {};
  inventoryData?.forEach((inv: any) => {
    inventoryMap[inv.vendor_item_id] = inv.total_orderable_quantity || 0;
  });

  // 상태별 통계
  const { data: statusStats } = await supabase
    .from("coupang_products")
    .select("status_name")
    .not("status_name", "is", null);

  const statusCounts: Record<string, number> = {};
  statusStats?.forEach((item) => {
    const name = item.status_name || "미지정";
    statusCounts[name] = (statusCounts[name] || 0) + 1;
  });

  return {
    products: products || [],
    total: count || 0,
    page,
    limit,
    search,
    status,
    statusCounts,
    inventoryMap,
  };
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "승인완료":
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-800">승인완료</Badge>;
    case "심사중":
    case "IN_REVIEW":
      return <Badge className="bg-yellow-100 text-yellow-800">심사중</Badge>;
    case "승인반려":
    case "REJECTED":
      return <Badge className="bg-red-100 text-red-800">승인반려</Badge>;
    case "판매중지":
    case "STOPPED":
      return <Badge className="bg-gray-100 text-gray-800">판매중지</Badge>;
    default:
      return <Badge variant="outline">{status || "미지정"}</Badge>;
  }
}

function formatPrice(price: number | null) {
  if (!price) return "-";
  return new Intl.NumberFormat("ko-KR").format(price) + "원";
}

function getFulfillmentBadge(type: string | null) {
  switch (type) {
    case "ROCKET_GROWTH":
      return (
        <Badge className="bg-orange-100 text-orange-800 text-xs">
          <RocketIcon className="h-3 w-3 mr-1" />
          로켓그로스
        </Badge>
      );
    case "MARKETPLACE":
      return (
        <Badge className="bg-blue-100 text-blue-800 text-xs">
          <TruckIcon className="h-3 w-3 mr-1" />
          판매자배송
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{type || "미지정"}</Badge>;
  }
}

function getSkuMappingStatus(options: any[]) {
  if (!options || options.length === 0) return { mapped: 0, total: 0 };
  const mapped = options.filter((o) => o.sku_id).length;
  return { mapped, total: options.length };
}

export default function CoupangProductsPage({
  loaderData,
}: Route.ComponentProps) {
  const { products, total, page, limit, search, status, statusCounts, inventoryMap } =
    loaderData;
  const totalPages = Math.ceil(total / limit);
  const syncFetcher = useFetcher();

  const [searchInput, setSearchInput] = useState(search);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSync = () => {
    // 연동 정보가 있는지 확인 후 동기화
    syncFetcher.submit(
      { vendor_id: "auto", fetch_details: "true" },
      { method: "POST", action: "/api/integrations/coupang/sync-products" }
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageIcon className="h-6 w-6" />
            쿠팡 상품 목록
          </h1>
          <p className="text-muted-foreground">
            쿠팡 로켓그로스에 등록된 상품 목록입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/integrations/coupang">← 연동 관리</Link>
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncFetcher.state === "submitting"}
          >
            <RefreshCwIcon
              className={`h-4 w-4 mr-2 ${syncFetcher.state === "submitting" ? "animate-spin" : ""}`}
            />
            상품 동기화
          </Button>
        </div>
      </div>

      {/* 상태별 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              전체 상품
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}개</div>
          </CardContent>
        </Card>
        {Object.entries(statusCounts)
          .slice(0, 3)
          .map(([name, count]) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(count as number).toLocaleString()}개
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">상품 검색</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="상품명으로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">상태</label>
              <Select name="status" defaultValue={status || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="승인완료">승인완료</SelectItem>
                  <SelectItem value="심사중">심사중</SelectItem>
                  <SelectItem value="승인반려">승인반려</SelectItem>
                  <SelectItem value="판매중지">판매중지</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">
              <FilterIcon className="h-4 w-4 mr-2" />
              검색
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 상품 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>상품 목록</CardTitle>
          <CardDescription>
            총 {total.toLocaleString()}개 상품 (페이지 {page}/{totalPages || 1})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-28">상품ID</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead className="w-20">상태</TableHead>
                <TableHead className="w-20">옵션</TableHead>
                <TableHead className="w-36">동기화일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      동기화된 상품이 없습니다.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleSync}
                    >
                      상품 동기화하기
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product: any) => {
                  const options = product.coupang_product_options || [];
                  const isExpanded = expandedProducts.has(product.id);
                  const skuStatus = getSkuMappingStatus(options);

                  return (
                    <React.Fragment key={product.id}>
                      {/* 상품 행 */}
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(product.id)}
                      >
                        <TableCell className="w-10">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.seller_product_id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium line-clamp-1">
                              {product.seller_product_name ||
                                product.display_product_name}
                            </p>
                            {product.brand && (
                              <p className="text-sm text-muted-foreground">
                                {product.brand}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.status_name)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <BoxIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{options.length}개</span>
                            {skuStatus.total > 0 && (
                              <span className={`text-xs ml-1 ${skuStatus.mapped === skuStatus.total ? 'text-green-600' : skuStatus.mapped > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                                ({skuStatus.mapped}/{skuStatus.total})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.synced_at
                            ? new Date(product.synced_at).toLocaleString("ko-KR")
                            : "-"}
                        </TableCell>
                      </TableRow>

                      {/* 옵션 행 (확장 시) */}
                      {isExpanded && options.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0 bg-muted/30">
                            <div className="px-4 py-3">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs h-8">옵션명</TableHead>
                                    <TableHead className="text-xs w-28 h-8">판매방식</TableHead>
                                    <TableHead className="text-xs w-32 h-8">외부SKU</TableHead>
                                    <TableHead className="text-xs w-20 h-8">SKU 연결</TableHead>
                                    <TableHead className="text-xs w-24 text-right h-8">재고</TableHead>
                                    <TableHead className="text-xs w-28 text-right h-8">판매가</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {options.map((option: any) => {
                                    const stock = inventoryMap[option.vendor_item_id];
                                    return (
                                      <TableRow key={option.id} className="hover:bg-muted/50">
                                        <TableCell className="py-2">
                                          <span className="text-sm">{option.item_name || "-"}</span>
                                        </TableCell>
                                        <TableCell className="py-2">
                                          {getFulfillmentBadge(option.fulfillment_type)}
                                        </TableCell>
                                        <TableCell className="py-2 font-mono text-xs">
                                          {option.external_vendor_sku || "-"}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          {option.sku_id ? (
                                            <LinkIcon className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <Link2OffIcon className="h-4 w-4 text-gray-400" />
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                          {stock !== undefined ? (
                                            <span className={stock === 0 ? "text-red-600 font-medium" : stock < 10 ? "text-yellow-600" : ""}>
                                              {stock.toLocaleString()}개
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                          {option.sale_price ? (
                                            <span className="font-medium">
                                              {formatPrice(option.sale_price)}
                                            </span>
                                          ) : (
                                            "-"
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                asChild={page > 1}
              >
                {page > 1 ? (
                  <Link
                    to={`?page=${page - 1}&search=${search}&status=${status}`}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    이전
                  </Link>
                ) : (
                  <>
                    <ChevronLeftIcon className="h-4 w-4" />
                    이전
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                asChild={page < totalPages}
              >
                {page < totalPages ? (
                  <Link
                    to={`?page=${page + 1}&search=${search}&status=${status}`}
                  >
                    다음
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    다음
                    <ChevronRightIcon className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
