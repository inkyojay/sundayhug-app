/**
 * 제품 분류 관리 - Parent SKU + 하위 제품 Nested View
 */
import type { Route } from "./+types/parent-products";

import { FolderTreeIcon, ChevronDownIcon, ChevronRightIcon, BoxIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/core/components/ui/collapsible";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `제품 분류 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";

  // Parent Products 가져오기
  let parentQuery = supabase
    .from("parent_products")
    .select("*")
    .order("product_name", { ascending: true });

  if (search) {
    parentQuery = parentQuery.or(`parent_sku.ilike.%${search}%,product_name.ilike.%${search}%`);
  }

  const { data: parentProducts } = await parentQuery;

  // Products (Solo SKU) 가져오기 - parent_sku로 그룹화
  const { data: products } = await supabase
    .from("products")
    .select(`
      id,
      sku,
      product_name,
      parent_sku,
      is_active,
      updated_at
    `)
    .order("sku", { ascending: true });

  // parent_sku 없는 제품들 (미분류)
  const unassignedProducts = products?.filter(p => !p.parent_sku) || [];

  // Parent SKU별 제품 그룹화
  const productsByParent: Record<string, typeof products> = {};
  products?.forEach(product => {
    if (product.parent_sku) {
      if (!productsByParent[product.parent_sku]) {
        productsByParent[product.parent_sku] = [];
      }
      productsByParent[product.parent_sku]!.push(product);
    }
  });

  // 재고 정보 가져오기
  const { data: inventoryData } = await supabase
    .from("inventory")
    .select("sku, current_stock");

  const inventoryMap: Record<string, number> = {};
  inventoryData?.forEach(inv => {
    inventoryMap[inv.sku] = inv.current_stock;
  });

  // 통계
  const stats = {
    totalParentProducts: parentProducts?.length || 0,
    totalProducts: products?.length || 0,
    unassignedCount: unassignedProducts.length,
    activeProducts: products?.filter(p => p.is_active).length || 0,
  };

  return {
    parentProducts: parentProducts || [],
    productsByParent,
    unassignedProducts,
    inventoryMap,
    stats,
    search,
  };
}

// Parent Product Card 컴포넌트
function ParentProductCard({ 
  parent, 
  childProducts, 
  inventoryMap 
}: { 
  parent: any; 
  childProducts: any[]; 
  inventoryMap: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const totalStock = childProducts.reduce((sum, p) => sum + (inventoryMap[p.sku] || 0), 0);
  const activeCount = childProducts.filter(p => p.is_active).length;
  const lowStockCount = childProducts.filter(p => (inventoryMap[p.sku] || 0) <= 5).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-3">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <FolderTreeIcon className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{parent.product_name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {parent.parent_sku}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">하위 제품</div>
                  <div className="font-semibold">{childProducts.length}개</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-xs">총 재고</div>
                  <div className="font-semibold">{totalStock.toLocaleString()}</div>
                </div>
                {lowStockCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    재고부족 {lowStockCount}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="ml-8 border-l-2 border-muted pl-4 space-y-2">
              {childProducts.length > 0 ? (
                childProducts.map((product) => {
                  const stock = inventoryMap[product.sku] || 0;
                  const isLowStock = stock <= 5;
                  const isOutOfStock = stock === 0;
                  
                  return (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BoxIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{product.product_name || "-"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{product.sku}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={isOutOfStock ? "destructive" : isLowStock ? "outline" : "secondary"}
                          className="min-w-[60px] justify-center"
                        >
                          {stock}
                        </Badge>
                        <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                          {product.is_active ? "활성" : "비활성"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  하위 제품이 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function ParentProducts({ loaderData }: Route.ComponentProps) {
  const { parentProducts, productsByParent, unassignedProducts, inventoryMap, stats, search } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/dashboard/parent-products?search=${encodeURIComponent(searchInput)}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTreeIcon className="h-6 w-6" />
            제품 분류
          </h1>
          <p className="text-muted-foreground">Parent SKU별 제품 계층 구조</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">제품 분류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParentProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 제품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">활성 제품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.activeProducts}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50" 
          onClick={() => setShowUnassigned(!showUnassigned)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">미분류 제품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.unassignedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Parent SKU 또는 제품명으로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
            {search && (
              <Button 
                type="button" 
                variant="outline"
                onClick={() => window.location.href = '/dashboard/parent-products'}
              >
                초기화
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 미분류 제품 (토글) */}
      {showUnassigned && unassignedProducts.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BoxIcon className="h-5 w-5 text-yellow-500" />
              미분류 제품
            </CardTitle>
            <CardDescription>
              Parent SKU가 지정되지 않은 제품 ({unassignedProducts.length}개)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedProducts.map((product: any) => {
                const stock = inventoryMap[product.sku] || 0;
                return (
                  <div 
                    key={product.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <BoxIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{product.product_name || "-"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{product.sku}</div>
                      </div>
                    </div>
                    <Badge variant={stock === 0 ? "destructive" : "secondary"}>
                      재고: {stock}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent Products 목록 (Nested View) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          제품 분류 목록 ({parentProducts.length}개)
        </h2>
        
        {parentProducts.length > 0 ? (
          <div>
            {parentProducts.map((parent: any) => (
              <ParentProductCard
                key={parent.id}
                parent={parent}
                childProducts={productsByParent[parent.parent_sku] || []}
                inventoryMap={inventoryMap}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {search ? "검색 결과가 없습니다" : "등록된 제품 분류가 없습니다"}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

