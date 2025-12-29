/**
 * 카페24 제품 리스트 페이지
 * 
 * - 제품 동기화 (Cafe24 API → DB)
 * - 메인 제품 + Variants 아코디언 표시
 * - Variant별 재고 수정 → Cafe24 API PUT
 */
import type { Route } from "./+types/cafe24-products";

import { 
  BoxIcon, 
  RefreshCwIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  PackageIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EditIcon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Label } from "~/core/components/ui/label";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `카페24 제품 리스트 | Sundayhug Admin` }];
};

interface Cafe24Product {
  id: string;
  product_no: number;
  product_code: string;
  product_name: string;
  price: number;
  retail_price: number;
  supply_price: number;
  display: string;
  selling: string;
  detail_image: string | null;
  list_image: string | null;
  small_image: string | null;
  category: string | null;
  synced_at: string;
  variants?: Cafe24Variant[];
}

interface Cafe24Variant {
  id: string;
  product_no: number;
  variant_code: string;
  options: { name: string; value: string }[];
  sku: string | null;
  additional_price: number;
  stock_quantity: number;
  safety_stock: number;
  display: string;
  selling: string;
  synced_at: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  // 제품 목록 조회
  const { data: products, error: productsError } = await supabase
    .from("cafe24_products")
    .select("*")
    .order("updated_at", { ascending: false });

  // Variants 조회
  const { data: variants, error: variantsError } = await supabase
    .from("cafe24_product_variants")
    .select("*")
    .order("variant_code", { ascending: true });

  // 제품별로 Variants 그룹핑
  const productsWithVariants = (products || []).map((product: Cafe24Product) => ({
    ...product,
    variants: (variants || []).filter((v: Cafe24Variant) => v.product_no === product.product_no),
  }));

  // 통계 계산
  const stats = {
    total: products?.length || 0,
    selling: products?.filter((p: Cafe24Product) => p.selling === "T").length || 0,
    outOfStock: variants?.filter((v: Cafe24Variant) => v.stock_quantity <= 0).length || 0,
    lastSyncedAt: products?.[0]?.synced_at || null,
  };

  return {
    products: productsWithVariants,
    stats,
    error: productsError || variantsError,
  };
}

export default function Cafe24Products({ loaderData }: Route.ComponentProps) {
  const { products, stats, error } = loaderData;
  
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [inventoryModal, setInventoryModal] = useState<{
    open: boolean;
    productNo: number;
    variantCode: string;
    currentQuantity: number;
    productName: string;
    optionName: string;
  } | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>("");

  const syncFetcher = useFetcher();
  const inventoryFetcher = useFetcher();
  const revalidator = useRevalidator();
  
  const syncing = syncFetcher.state === "submitting" || syncFetcher.state === "loading";
  const updatingInventory = inventoryFetcher.state === "submitting" || inventoryFetcher.state === "loading";
  const hasHandledSyncRef = useRef(false);
  const hasHandledInventoryRef = useRef(false);

  // 동기화 결과 처리
  useEffect(() => {
    if (syncFetcher.data && syncFetcher.state === "idle" && !hasHandledSyncRef.current) {
      hasHandledSyncRef.current = true;
      if (syncFetcher.data.success) {
        setSyncMessage(`✅ ${syncFetcher.data.message}`);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${syncFetcher.data.error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (syncFetcher.state === "submitting") {
      hasHandledSyncRef.current = false;
    }
  }, [syncFetcher.data, syncFetcher.state, revalidator]);

  // 재고 업데이트 결과 처리
  useEffect(() => {
    if (inventoryFetcher.data && inventoryFetcher.state === "idle" && !hasHandledInventoryRef.current) {
      hasHandledInventoryRef.current = true;
      if (inventoryFetcher.data.success) {
        setSyncMessage(`✅ ${inventoryFetcher.data.message}`);
        setInventoryModal(null);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${inventoryFetcher.data.error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (inventoryFetcher.state === "submitting") {
      hasHandledInventoryRef.current = false;
    }
  }, [inventoryFetcher.data, inventoryFetcher.state, revalidator]);

  const toggleProduct = (productNo: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productNo)) {
      newExpanded.delete(productNo);
    } else {
      newExpanded.add(productNo);
    }
    setExpandedProducts(newExpanded);
  };

  const handleSync = () => {
    syncFetcher.submit({}, { 
      method: "POST", 
      action: "/api/integrations/cafe24/sync-products" 
    });
  };

  const openInventoryModal = (
    productNo: number, 
    variantCode: string, 
    currentQuantity: number,
    productName: string,
    optionName: string
  ) => {
    setInventoryModal({
      open: true,
      productNo,
      variantCode,
      currentQuantity,
      productName,
      optionName,
    });
    setNewQuantity(String(currentQuantity));
  };

  const handleInventoryUpdate = () => {
    if (!inventoryModal) return;
    
    inventoryFetcher.submit(
      {
        action: "update_inventory",
        productNo: String(inventoryModal.productNo),
        variantCode: inventoryModal.variantCode,
        quantity: newQuantity,
      },
      { 
        method: "POST", 
        action: "/api/integrations/cafe24/sync-products" 
      }
    );
  };

  const formatOptionName = (options: { name: string; value: string }[]) => {
    if (!options || options.length === 0) return "기본";
    return options.map(o => `${o.name}: ${o.value}`).join(", ");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            카페24 제품 리스트
          </h1>
          <p className="text-muted-foreground">
            Cafe24 쇼핑몰에서 동기화된 제품 목록
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "제품 동기화"}
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 제품</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">판매중</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.selling}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">품절 옵션</CardTitle>
            <XCircleIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마지막 동기화</CardTitle>
            <RefreshCwIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{formatDate(stats.lastSyncedAt)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 에러 표시 */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircleIcon className="h-5 w-5" />
              <span>데이터 로드 중 오류가 발생했습니다</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 제품 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>제품 목록</CardTitle>
          <CardDescription>
            행을 클릭하면 옵션(Variants)을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[80px]">이미지</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead className="w-[120px]">판매가</TableHead>
                <TableHead className="w-[80px]">상태</TableHead>
                <TableHead className="w-[80px]">옵션 수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: Cafe24Product) => (
                <>
                  {/* 메인 제품 행 */}
                  <TableRow 
                    key={product.product_no}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleProduct(product.product_no)}
                  >
                    <TableCell>
                      {expandedProducts.has(product.product_no) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      {product.list_image || product.small_image ? (
                        <img 
                          src={product.list_image || product.small_image || ""} 
                          alt={product.product_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <PackageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.product_code}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(product.price)}</TableCell>
                    <TableCell>
                      <Badge variant={product.selling === "T" ? "default" : "secondary"}>
                        {product.selling === "T" ? "판매중" : "판매중지"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.variants?.length || 0}개
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Variants 아코디언 */}
                  {expandedProducts.has(product.product_no) && product.variants && product.variants.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>옵션</TableHead>
                                <TableHead className="w-[150px]">SKU</TableHead>
                                <TableHead className="w-[100px]">추가금액</TableHead>
                                <TableHead className="w-[100px]">재고</TableHead>
                                <TableHead className="w-[100px]">안전재고</TableHead>
                                <TableHead className="w-[80px]">상태</TableHead>
                                <TableHead className="w-[80px]">수정</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {product.variants.map((variant: Cafe24Variant) => (
                                <TableRow key={variant.variant_code}>
                                  <TableCell className="font-medium">
                                    {formatOptionName(variant.options)}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {variant.sku || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {variant.additional_price > 0 
                                      ? `+${formatPrice(variant.additional_price)}` 
                                      : "-"}
                                  </TableCell>
                                  <TableCell>
                                    <span className={variant.stock_quantity <= 0 ? "text-red-500 font-bold" : ""}>
                                      {variant.stock_quantity}개
                                    </span>
                                  </TableCell>
                                  <TableCell>{variant.safety_stock}개</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={variant.selling === "T" ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {variant.selling === "T" ? "판매" : "중지"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openInventoryModal(
                                          product.product_no,
                                          variant.variant_code,
                                          variant.stock_quantity,
                                          product.product_name,
                                          formatOptionName(variant.options)
                                        );
                                      }}
                                    >
                                      <EditIcon className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    제품이 없습니다. "제품 동기화" 버튼을 클릭해 Cafe24에서 제품을 가져오세요.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 재고 수정 모달 */}
      <Dialog 
        open={inventoryModal?.open || false} 
        onOpenChange={(open) => !open && setInventoryModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재고 수량 수정</DialogTitle>
            <DialogDescription>
              Cafe24에 재고 수량을 업데이트합니다.
            </DialogDescription>
          </DialogHeader>
          {inventoryModal && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">제품</Label>
                <p className="font-medium">{inventoryModal.productName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">옵션</Label>
                <p className="font-medium">{inventoryModal.optionName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">현재 재고</Label>
                <p className="font-medium">{inventoryModal.currentQuantity}개</p>
              </div>
              <div>
                <Label htmlFor="newQuantity">새 재고 수량</Label>
                <Input
                  id="newQuantity"
                  type="number"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="재고 수량 입력"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setInventoryModal(null)}
              disabled={updatingInventory}
            >
              취소
            </Button>
            <Button 
              onClick={handleInventoryUpdate}
              disabled={updatingInventory || !newQuantity}
            >
              {updatingInventory ? "업데이트 중..." : "재고 업데이트"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

