/**
 * Sundayhug 내부 관리 시스템 - 메인 대시보드
 * 
 * 제품 현황 + 재고 현황 표시
 */
import type { Route } from "./+types/dashboard";

import { BoxIcon, PackageIcon, AlertTriangleIcon, TrendingUpIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Badge } from "~/core/components/ui/badge";

// Supabase client
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const meta: Route.MetaFunction = () => {
  return [{ title: `대시보드 | Sundayhug Admin` }];
};

/**
 * 서버에서 데이터 로드
 */
export async function loader({ request }: Route.LoaderArgs) {
  // 제품 수
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  // 재고 통계
  const { data: inventoryStats } = await supabase
    .from("inventory")
    .select("current_stock, alert_threshold");

  const totalStock = inventoryStats?.reduce((sum, item) => sum + (item.current_stock || 0), 0) || 0;
  const lowStockCount = inventoryStats?.filter(
    item => item.current_stock <= item.alert_threshold
  ).length || 0;

  // 최근 재고 현황 (상위 20개)
  const { data: recentInventory } = await supabase
    .from("inventory")
    .select(`
      id,
      sku,
      current_stock,
      previous_stock,
      stock_change,
      alert_threshold,
      synced_at,
      products (
        product_name
      )
    `)
    .order("synced_at", { ascending: false })
    .limit(20);

  // 재고 부족 상품
  const { data: lowStockItems } = await supabase
    .from("inventory")
    .select(`
      id,
      sku,
      current_stock,
      alert_threshold,
      products (
        product_name
      )
    `)
    .lte("current_stock", supabase.rpc ? 10 : 10) // 10개 이하
    .order("current_stock", { ascending: true })
    .limit(10);

  return {
    stats: {
      productCount: productCount || 0,
      totalStock,
      lowStockCount,
      inventoryCount: inventoryStats?.length || 0,
    },
    recentInventory: recentInventory || [],
    lowStockItems: lowStockItems || [],
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { stats, recentInventory, lowStockItems } = loaderData;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 제품 수</CardTitle>
            <BoxIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">등록된 SKU 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 재고</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">전체 재고 수량</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재고 부족</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">안전재고 미달 상품</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재고 기록</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inventoryCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">동기화된 재고 수</p>
          </CardContent>
        </Card>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 최근 재고 현황 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>최근 재고 현황</CardTitle>
            <CardDescription>최근 동기화된 재고 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="text-right">재고</TableHead>
                  <TableHead className="text-right">변동</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInventory.slice(0, 8).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.products?.product_name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.current_stock <= item.alert_threshold ? "destructive" : "secondary"}>
                        {item.current_stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.stock_change !== 0 && (
                        <span className={item.stock_change > 0 ? "text-green-500" : "text-red-500"}>
                          {item.stock_change > 0 ? "+" : ""}{item.stock_change}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 재고 부족 상품 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              재고 부족 상품
            </CardTitle>
            <CardDescription>안전재고 미달 상품 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="text-right">현재고</TableHead>
                  <TableHead className="text-right">안전재고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.slice(0, 8).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.products?.product_name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{item.current_stock}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.alert_threshold}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
