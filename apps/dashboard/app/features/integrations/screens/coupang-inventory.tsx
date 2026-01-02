/**
 * 쿠팡 로켓그로스 재고 목록 페이지
 */

import type { Route } from "./+types/coupang-inventory";

import {
  WarehouseIcon,
  SearchIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  PackageIcon,
  LinkIcon,
  Link2OffIcon,
  RocketIcon,
  TruckIcon,
} from "lucide-react";
import { useState } from "react";
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
  return [{ title: "쿠팡 재고 관리 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";
  const stockFilter = url.searchParams.get("stock") || "";

  // 재고 목록 조회 (상품 옵션 정보 포함)
  let query = supabase
    .from("coupang_inventory")
    .select("*", { count: "exact" })
    .order("synced_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (stockFilter === "low") {
    query = query.lt("total_orderable_quantity", 10);
  } else if (stockFilter === "out") {
    query = query.eq("total_orderable_quantity", 0);
  }

  const { data: inventories, count } = await query;

  // 옵션 정보 조회
  const vendorItemIds = inventories?.map((inv) => inv.vendor_item_id) || [];
  const { data: options } = await supabase
    .from("coupang_product_options")
    .select(
      `
      vendor_item_id,
      item_name,
      external_vendor_sku,
      fulfillment_type,
      sku_id,
      coupang_products (
        seller_product_name,
        brand
      )
    `
    )
    .in("vendor_item_id", vendorItemIds);

  const optionMap: Record<number, any> = {};
  options?.forEach((opt) => {
    optionMap[opt.vendor_item_id] = opt;
  });

  // 재고 통계
  const { data: allInventory } = await supabase
    .from("coupang_inventory")
    .select("total_orderable_quantity");

  // SKU 매핑 통계
  const { data: allOptions } = await supabase
    .from("coupang_product_options")
    .select("sku_id, fulfillment_type")
    .eq("fulfillment_type", "ROCKET_GROWTH");

  const mappedCount = allOptions?.filter((o) => o.sku_id).length || 0;
  const unmappedCount = (allOptions?.length || 0) - mappedCount;

  const stats = {
    total: allInventory?.length || 0,
    outOfStock:
      allInventory?.filter((i) => i.total_orderable_quantity === 0).length || 0,
    lowStock:
      allInventory?.filter(
        (i) =>
          i.total_orderable_quantity > 0 && i.total_orderable_quantity < 10
      ).length || 0,
    totalQty:
      allInventory?.reduce(
        (sum, i) => sum + (i.total_orderable_quantity || 0),
        0
      ) || 0,
    mapped: mappedCount,
    unmapped: unmappedCount,
  };

  return {
    inventories: inventories || [],
    optionMap,
    total: count || 0,
    page,
    limit,
    search,
    stockFilter,
    stats,
  };
}

function getStockBadge(qty: number) {
  if (qty === 0) {
    return <Badge className="bg-red-100 text-red-800">품절</Badge>;
  } else if (qty < 10) {
    return <Badge className="bg-yellow-100 text-yellow-800">부족</Badge>;
  } else if (qty < 50) {
    return <Badge className="bg-blue-100 text-blue-800">보통</Badge>;
  } else {
    return <Badge className="bg-green-100 text-green-800">충분</Badge>;
  }
}

function getFulfillmentBadge(type: string | null) {
  if (type === "ROCKET_GROWTH") {
    return (
      <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
        <RocketIcon className="h-3 w-3" />
        로켓그로스
      </Badge>
    );
  } else if (type === "MARKETPLACE") {
    return (
      <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 w-fit">
        <TruckIcon className="h-3 w-3" />
        판매자배송
      </Badge>
    );
  }
  return <Badge variant="outline">미지정</Badge>;
}

export default function CoupangInventoryPage({
  loaderData,
}: Route.ComponentProps) {
  const {
    inventories,
    optionMap,
    total,
    page,
    limit,
    search,
    stockFilter,
    stats,
  } = loaderData;
  const totalPages = Math.ceil(total / limit);
  const syncFetcher = useFetcher();

  const [searchInput, setSearchInput] = useState(search);

  const handleSync = () => {
    syncFetcher.submit(
      { vendor_id: "auto" },
      { method: "POST", action: "/api/integrations/coupang/sync-inventory" }
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WarehouseIcon className="h-6 w-6" />
            쿠팡 재고 관리
          </h1>
          <p className="text-muted-foreground">
            쿠팡 로켓그로스 재고 현황입니다.
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
            재고 동기화
          </Button>
        </div>
      </div>

      {/* 재고 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PackageIcon className="h-4 w-4" />
              전체 SKU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total.toLocaleString()}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4" />
              총 재고수량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalQty.toLocaleString()}개
            </div>
          </CardContent>
        </Card>
        <Card className={stats.outOfStock > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4" />
              품절
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.outOfStock.toLocaleString()}개
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? "border-yellow-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4" />
              재고부족 (10개 미만)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.lowStock.toLocaleString()}개
            </div>
          </CardContent>
        </Card>
        <Card className={stats.unmapped > 0 ? "border-orange-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              SKU 매핑
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">
                {stats.mapped}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">
                {stats.mapped + stats.unmapped}
              </span>
              {stats.unmapped > 0 && (
                <Badge variant="outline" className="text-orange-600 ml-2">
                  {stats.unmapped}개 미연결
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">검색</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="vendorItemId로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">재고 상태</label>
              <Select name="stock" defaultValue={stockFilter || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="out">품절만</SelectItem>
                  <SelectItem value="low">재고부족 (10개 미만)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">검색</Button>
          </form>
        </CardContent>
      </Card>

      {/* 재고 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>재고 목록</CardTitle>
          <CardDescription>
            총 {total.toLocaleString()}개 SKU (페이지 {page}/{totalPages || 1})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">VendorItemId</TableHead>
                <TableHead>상품명 / 옵션</TableHead>
                <TableHead className="w-24">외부SKU</TableHead>
                <TableHead className="w-28">판매방식</TableHead>
                <TableHead className="w-20">SKU</TableHead>
                <TableHead className="w-24 text-right">재고수량</TableHead>
                <TableHead className="w-24">상태</TableHead>
                <TableHead className="w-28 text-right">30일 판매량</TableHead>
                <TableHead className="w-36">동기화일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">
                      동기화된 재고가 없습니다.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleSync}
                    >
                      재고 동기화하기
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                inventories.map((inv: any) => {
                  const option = optionMap[inv.vendor_item_id];
                  const product = option?.coupang_products;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">
                        {inv.vendor_item_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">
                            {product?.seller_product_name || "-"}
                          </p>
                          {option?.item_name && (
                            <p className="text-sm text-muted-foreground">
                              옵션: {option.item_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {option?.external_vendor_sku || "-"}
                      </TableCell>
                      <TableCell>
                        {getFulfillmentBadge(option?.fulfillment_type)}
                      </TableCell>
                      <TableCell>
                        {option?.sku_id ? (
                          <LinkIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <Link2OffIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {inv.total_orderable_quantity?.toLocaleString() || 0}개
                      </TableCell>
                      <TableCell>
                        {getStockBadge(inv.total_orderable_quantity || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.sales_count_last_30_days?.toLocaleString() || 0}개
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.synced_at
                          ? new Date(inv.synced_at).toLocaleString("ko-KR")
                          : "-"}
                      </TableCell>
                    </TableRow>
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
                    to={`?page=${page - 1}&search=${search}&stock=${stockFilter}`}
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
                    to={`?page=${page + 1}&search=${search}&stock=${stockFilter}`}
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
