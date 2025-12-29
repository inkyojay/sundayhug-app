/**
 * 네이버 스마트스토어 제품 리스트 페이지
 * 
 * - 제품 동기화 (네이버 API → DB)
 * - 메인 제품 + 옵션 아코디언 표시
 * - 옵션별 재고 수정 → 네이버 API PUT
 */
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { 
  StoreIcon, 
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
import { useFetcher, useRevalidator, useLoaderData } from "react-router";

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

export const meta: MetaFunction = () => {
  return [{ title: `스마트스토어 제품 리스트 | Sundayhug Admin` }];
};

interface NaverProduct {
  id: string;
  origin_product_no: number;
  channel_product_no: number | null;
  product_name: string;
  seller_management_code: string | null;  // 판매자 상품코드 (SKU)
  sale_price: number;
  stock_quantity: number;
  product_status: string | null;
  channel_product_display_status: string | null;
  represent_image: string | null;
  synced_at: string;
  options?: NaverProductOption[];
}

interface NaverProductOption {
  id: string;
  origin_product_no: number;
  option_combination_id: number;
  option_name1: string | null;
  option_value1: string | null;
  option_name2: string | null;
  option_value2: string | null;
  stock_quantity: number;
  price: number;
  seller_management_code: string | null;
  use_yn: string;
  synced_at: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const [supabase] = makeServerClient(request);
  
  // 제품 목록 조회
  const { data: products, error: productsError } = await supabase
    .from("naver_products")
    .select("*")
    .order("updated_at", { ascending: false });

  // 옵션 조회
  const { data: options, error: optionsError } = await supabase
    .from("naver_product_options")
    .select("*")
    .order("option_combination_id", { ascending: true });

  // 제품별로 옵션 그룹핑
  const productsWithOptions = (products || []).map((product: NaverProduct) => ({
    ...product,
    options: (options || []).filter((o: NaverProductOption) => o.origin_product_no === product.origin_product_no),
  }));

  // 통계 계산
  const stats = {
    total: products?.length || 0,
    onSale: products?.filter((p: NaverProduct) => p.product_status === "SALE").length || 0,
    outOfStock: options?.filter((o: NaverProductOption) => o.stock_quantity <= 0).length || 0,
    lastSyncedAt: products?.[0]?.synced_at || null,
  };

  return {
    products: productsWithOptions,
    stats,
    error: productsError || optionsError,
  };
}

export default function NaverProducts() {
  const { products, stats, error } = useLoaderData<typeof loader>();
  
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);  // 상태 필터
  const [inventoryModal, setInventoryModal] = useState<{
    open: boolean;
    originProductNo: number;
    optionCombinationId: number;
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

  const toggleProduct = (originProductNo: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(originProductNo)) {
      newExpanded.delete(originProductNo);
    } else {
      newExpanded.add(originProductNo);
    }
    setExpandedProducts(newExpanded);
  };

  const handleSync = () => {
    syncFetcher.submit({}, { 
      method: "POST", 
      action: "/api/integrations/naver/sync-products" 
    });
  };

  const openInventoryModal = (
    originProductNo: number, 
    optionCombinationId: number, 
    currentQuantity: number,
    productName: string,
    optionName: string
  ) => {
    setInventoryModal({
      open: true,
      originProductNo,
      optionCombinationId,
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
        originProductNo: String(inventoryModal.originProductNo),
        optionCombinationId: String(inventoryModal.optionCombinationId),
        quantity: newQuantity,
      },
      { 
        method: "POST", 
        action: "/api/integrations/naver/sync-products" 
      }
    );
  };

  const formatOptionName = (option: NaverProductOption) => {
    const parts: string[] = [];
    if (option.option_name1 && option.option_value1) {
      parts.push(`${option.option_name1}: ${option.option_value1}`);
    }
    if (option.option_name2 && option.option_value2) {
      parts.push(`${option.option_name2}: ${option.option_value2}`);
    }
    return parts.length > 0 ? parts.join(", ") : "기본";
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "SALE":
        return <Badge variant="default">판매중</Badge>;
      case "SUSPENSION":
        return <Badge variant="secondary">판매중지</Badge>;
      case "WAIT":
        return <Badge variant="outline">대기</Badge>;
      case "CLOSE":
        return <Badge variant="destructive">종료</Badge>;
      default:
        return <Badge variant="outline">{status || "알 수 없음"}</Badge>;
    }
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
            <StoreIcon className="h-6 w-6 text-green-500" />
            스마트스토어 제품 리스트
          </h1>
          <p className="text-muted-foreground">
            네이버 스마트스토어에서 동기화된 제품 목록
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "제품 동기화"}
        </Button>
      </div>

      {/* 통계 카드 (클릭하여 필터링) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${statusFilter === null ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(null)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 제품</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:border-green-500 ${statusFilter === "SALE" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "SALE" ? null : "SALE")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">판매중</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onSale}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:border-red-500 ${statusFilter === "OUT_OF_STOCK" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "OUT_OF_STOCK" ? null : "OUT_OF_STOCK")}
        >
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
          <CardTitle className="flex items-center gap-2">
            제품 목록
            {statusFilter && (
              <Badge variant="secondary" className="ml-2">
                {statusFilter === "SALE" ? "판매중만" : "품절 옵션 있음"}
                <button 
                  className="ml-1 hover:text-destructive" 
                  onClick={() => setStatusFilter(null)}
                >
                  ×
                </button>
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            행을 클릭하면 옵션을 확인할 수 있습니다. 카드를 클릭하여 필터링할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[80px]">이미지</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead className="w-[150px]">판매자 상품코드</TableHead>
                <TableHead className="w-[120px]">판매가</TableHead>
                <TableHead className="w-[80px]">재고</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[80px]">옵션 수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products
                .filter((product: NaverProduct) => {
                  if (!statusFilter) return true;
                  if (statusFilter === "SALE") return product.product_status === "SALE";
                  if (statusFilter === "OUT_OF_STOCK") {
                    // 품절 옵션이 있는 제품만
                    return product.options?.some((o: NaverProductOption) => o.stock_quantity <= 0);
                  }
                  return true;
                })
                .map((product: NaverProduct) => (
                <>
                  {/* 메인 제품 행 */}
                  <TableRow 
                    key={product.origin_product_no}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleProduct(product.origin_product_no)}
                  >
                    <TableCell>
                      {expandedProducts.has(product.origin_product_no) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      {product.represent_image ? (
                        <img 
                          src={product.represent_image} 
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
                        #{product.origin_product_no}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {product.seller_management_code || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{formatPrice(product.sale_price)}</TableCell>
                    <TableCell>
                      <span className={product.stock_quantity <= 0 ? "text-red-500 font-bold" : ""}>
                        {product.stock_quantity}개
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.product_status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.options?.length || 0}개
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* 옵션 아코디언 */}
                  {expandedProducts.has(product.origin_product_no) && product.options && product.options.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>옵션</TableHead>
                                <TableHead className="w-[150px]">관리코드</TableHead>
                                <TableHead className="w-[100px]">가격</TableHead>
                                <TableHead className="w-[100px]">재고</TableHead>
                                <TableHead className="w-[80px]">사용</TableHead>
                                <TableHead className="w-[80px]">수정</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {product.options.map((option: NaverProductOption) => (
                                <TableRow key={option.option_combination_id}>
                                  <TableCell className="font-medium">
                                    {formatOptionName(option)}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {option.seller_management_code || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {formatPrice(option.price)}
                                  </TableCell>
                                  <TableCell>
                                    <span className={option.stock_quantity <= 0 ? "text-red-500 font-bold" : ""}>
                                      {option.stock_quantity}개
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={option.use_yn === "Y" ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {option.use_yn === "Y" ? "사용" : "미사용"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openInventoryModal(
                                          product.origin_product_no,
                                          option.option_combination_id,
                                          option.stock_quantity,
                                          product.product_name,
                                          formatOptionName(option)
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
              {products.filter((product: NaverProduct) => {
                if (!statusFilter) return true;
                if (statusFilter === "SALE") return product.product_status === "SALE";
                if (statusFilter === "OUT_OF_STOCK") return product.options?.some((o: NaverProductOption) => o.stock_quantity <= 0);
                return true;
              }).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {statusFilter 
                      ? "해당 조건의 제품이 없습니다." 
                      : "제품이 없습니다. \"제품 동기화\" 버튼을 클릭해 스마트스토어에서 제품을 가져오세요."}
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
              네이버 스마트스토어에 재고 수량을 업데이트합니다.
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

