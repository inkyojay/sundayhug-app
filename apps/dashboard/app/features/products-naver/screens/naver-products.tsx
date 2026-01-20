/**
 * 네이버 스마트스토어 제품 리스트 페이지 (Airtable 스타일)
 * 
 * - 제품 동기화 (네이버 API → DB)
 * - 메인 제품 + 옵션 아코디언 표시
 * - 옵션별 재고 수정 → 네이버 API PUT
 * - 내부 제품 SKU 매핑
 * - CSV 내보내기
 */
import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "react-router";

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
  DownloadIcon,
  LinkIcon,
  SearchIcon,
  FilterIcon,
  Link2OffIcon,
  LayersIcon,
  ExternalLinkIcon,
  PackageOpenIcon,
  MessageSquareIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Label } from "~/core/components/ui/label";
import { ColorBadge, SizeBadge } from "~/core/components/ui/color-badge";
import { ScrollArea } from "~/core/components/ui/scroll-area";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: MetaFunction = () => {
  return [{ title: `스마트스토어 제품 리스트 | Sundayhug Admin` }];
};

interface NaverProduct {
  id: string;
  origin_product_no: number;
  channel_product_no: number | null;
  product_name: string;
  seller_management_code: string | null;
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
  internal_sku: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";
  const stockFilter = url.searchParams.get("stock") || "all";
  const optionFilter = url.searchParams.get("option") || "all";
  const mappingFilter = url.searchParams.get("mapping") || "all";
  const colorFilter = url.searchParams.get("color") || "all";
  const sizeFilter = url.searchParams.get("size") || "all";
  const sortBy = url.searchParams.get("sortBy") || "updated_at";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  // 상품 문의에서 연결된 productId 필터
  const productIdFilter = url.searchParams.get("productId") || "";

  // 제품 목록 조회
  let query = supabase
    .from("naver_products")
    .select("*")
    .order("updated_at", { ascending: false });

  if (statusFilter === "SALE") {
    query = query.eq("product_status", "SALE");
  } else if (statusFilter === "SUSPENSION") {
    query = query.eq("product_status", "SUSPENSION");
  }

  if (search) {
    query = query.or(`product_name.ilike.%${search}%,seller_management_code.ilike.%${search}%`);
  }

  // productId 필터 (상품 문의에서 연결)
  if (productIdFilter) {
    query = query.eq("origin_product_no", Number(productIdFilter));
  }

  const { data: products, error: productsError } = await query;

  // 옵션 조회
  const { data: options, error: optionsError } = await supabase
    .from("naver_product_options")
    .select("*")
    .order("option_combination_id", { ascending: true });

  // 내부 제품 목록 (SKU 매핑용)
  const { data: internalProducts } = await supabase
    .from("products")
    .select("sku, product_name, color_kr, sku_6_size")
    .order("sku", { ascending: true });

  // 제품별로 옵션 그룹핑
  let productsWithOptions = (products || []).map((product: NaverProduct) => ({
    ...product,
    options: (options || []).filter((o: NaverProductOption) => o.origin_product_no === product.origin_product_no),
  }));

  // 옵션 유무 필터
  if (optionFilter === "hasOptions") {
    productsWithOptions = productsWithOptions.filter((p: any) => p.options && p.options.length > 1);
  } else if (optionFilter === "noOptions") {
    productsWithOptions = productsWithOptions.filter((p: any) => !p.options || p.options.length <= 1);
  }

  // 재고 필터
  if (stockFilter === "outOfStock") {
    productsWithOptions = productsWithOptions.filter((p: any) => 
      p.options?.some((o: NaverProductOption) => o.stock_quantity <= 0)
    );
  } else if (stockFilter === "lowStock") {
    productsWithOptions = productsWithOptions.filter((p: any) => 
      p.options?.some((o: NaverProductOption) => o.stock_quantity > 0 && o.stock_quantity <= 10)
    );
  }

  // 내부 제품 SKU 맵 생성 (색상/사이즈 필터용)
  const internalSkuSet = new Set<string>();
  const internalProductsMapForFilter = new Map<string, { color_kr: string | null; sku_6_size: string | null }>();
  (internalProducts || []).forEach((p: any) => {
    internalSkuSet.add(p.sku);
    internalProductsMapForFilter.set(p.sku, { color_kr: p.color_kr, sku_6_size: p.sku_6_size });
  });

  // SKU 매핑 필터
  if (mappingFilter === "unmapped") {
    productsWithOptions = productsWithOptions.filter((p: any) => {
      // internal_sku가 없거나 products 테이블에 매핑 안 된 옵션이 있는 제품
      return p.options?.some((o: NaverProductOption) => {
        const sku = o.internal_sku || o.seller_management_code;
        return !sku || !internalSkuSet.has(sku);
      });
    });
  } else if (mappingFilter === "mapped") {
    productsWithOptions = productsWithOptions.filter((p: any) => {
      // 모든 옵션이 매핑된 제품
      return p.options?.length > 0 && p.options.every((o: NaverProductOption) => {
        const sku = o.internal_sku || o.seller_management_code;
        return sku && internalSkuSet.has(sku);
      });
    });
  }

  // 색상 필터
  if (colorFilter !== "all") {
    productsWithOptions = productsWithOptions.filter((p: any) => {
      return p.options?.some((o: NaverProductOption) => {
        const sku = o.internal_sku || o.seller_management_code;
        const mapped = sku ? internalProductsMapForFilter.get(sku) : null;
        return mapped?.color_kr === colorFilter;
      });
    });
  }

  // 사이즈 필터
  if (sizeFilter !== "all") {
    productsWithOptions = productsWithOptions.filter((p: any) => {
      return p.options?.some((o: NaverProductOption) => {
        const sku = o.internal_sku || o.seller_management_code;
        const mapped = sku ? internalProductsMapForFilter.get(sku) : null;
        return mapped?.sku_6_size === sizeFilter;
      });
    });
  }

  // 정렬
  if (sortBy === "color" || sortBy === "size") {
    productsWithOptions.sort((a: any, b: any) => {
      const getFirstMappedValue = (product: any, field: "color_kr" | "sku_6_size") => {
        const firstOption = product.options?.[0];
        const sku = firstOption?.internal_sku || firstOption?.seller_management_code;
        const mapped = sku ? internalProductsMapForFilter.get(sku) : null;
        return mapped?.[field] || "";
      };
      const aVal = getFirstMappedValue(a, sortBy === "color" ? "color_kr" : "sku_6_size");
      const bVal = getFirstMappedValue(b, sortBy === "color" ? "color_kr" : "sku_6_size");
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  } else if (sortBy === "product_name") {
    productsWithOptions.sort((a: any, b: any) => {
      return sortOrder === "asc" 
        ? a.product_name.localeCompare(b.product_name)
        : b.product_name.localeCompare(a.product_name);
    });
  } else if (sortBy === "sale_price") {
    productsWithOptions.sort((a: any, b: any) => {
      return sortOrder === "asc" ? a.sale_price - b.sale_price : b.sale_price - a.sale_price;
    });
  } else if (sortBy === "stock_quantity") {
    productsWithOptions.sort((a: any, b: any) => {
      return sortOrder === "asc" ? a.stock_quantity - b.stock_quantity : b.stock_quantity - a.stock_quantity;
    });
  }

  // 통계 계산 (필터 전 전체 데이터 기준)
  const allProductsWithOptions = (products || []).map((product: NaverProduct) => ({
    ...product,
    options: (options || []).filter((o: NaverProductOption) => o.origin_product_no === product.origin_product_no),
  }));
  
  const allOptions = options || [];
  
  // 색상/사이즈 목록 추출
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();
  allOptions.forEach((o: NaverProductOption) => {
    const sku = o.internal_sku || o.seller_management_code;
    const mapped = sku ? internalProductsMapForFilter.get(sku) : null;
    if (mapped?.color_kr) colorSet.add(mapped.color_kr);
    if (mapped?.sku_6_size) sizeSet.add(mapped.sku_6_size);
  });
  
  // 미매핑 옵션 수 계산
  const unmappedOptions = allOptions.filter((o: NaverProductOption) => {
    const sku = o.internal_sku || o.seller_management_code;
    return !sku || !internalSkuSet.has(sku);
  }).length;
  const unmappedProducts = allProductsWithOptions.filter((p: any) => 
    p.options?.some((o: NaverProductOption) => {
      const sku = o.internal_sku || o.seller_management_code;
      return !sku || !internalSkuSet.has(sku);
    })
  ).length;

  const stats = {
    total: (products || []).length,
    onSale: (products || []).filter((p: NaverProduct) => p.product_status === "SALE").length,
    outOfStock: allOptions.filter((o: NaverProductOption) => o.stock_quantity <= 0).length,
    lowStock: allOptions.filter((o: NaverProductOption) => o.stock_quantity > 0 && o.stock_quantity <= 10).length,
    lastSyncedAt: (products || [])[0]?.synced_at || null,
    totalOptions: allOptions.length,
    hasOptions: allProductsWithOptions.filter((p: any) => p.options && p.options.length > 1).length,
    noOptions: allProductsWithOptions.filter((p: any) => !p.options || p.options.length <= 1).length,
    unmappedOptions,
    unmappedProducts,
  };

  return {
    products: productsWithOptions,
    stats,
    internalProducts: internalProducts || [],
    availableColors: Array.from(colorSet).sort(),
    availableSizes: Array.from(sizeSet).sort(),
    error: productsError || optionsError,
    filters: { search, status: statusFilter, stock: stockFilter, option: optionFilter, mapping: mappingFilter, color: colorFilter, size: sizeFilter, sortBy, sortOrder, productId: productIdFilter },
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // SKU 매핑 업데이트
  if (actionType === "mapSku") {
    const optionId = formData.get("optionId") as string;
    const internalSku = formData.get("internalSku") as string;

    const { error } = await adminClient
      .from("naver_product_options")
      .update({ internal_sku: internalSku || null })
      .eq("id", optionId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: "SKU가 매핑되었습니다." };
  }

  // 일괄 SKU 매핑
  if (actionType === "bulkMapSku") {
    const mappingsJson = formData.get("mappings") as string;
    
    try {
      const mappings = JSON.parse(mappingsJson) as { optionId: string; sku: string | null }[];
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const mapping of mappings) {
        const { error } = await adminClient
          .from("naver_product_options")
          .update({ internal_sku: mapping.sku || null })
          .eq("id", mapping.optionId);
        
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      if (errorCount > 0) {
        return { 
          success: true, 
          message: `${successCount}개 매핑 완료, ${errorCount}개 실패` 
        };
      }
      return { success: true, message: `${successCount}개 옵션이 매핑되었습니다.` };
    } catch (e) {
      return { success: false, error: "매핑 데이터 파싱 오류" };
    }
  }

  return { success: false, error: "알 수 없는 액션입니다." };
}

export default function NaverProducts() {
  const { products, stats, internalProducts, availableColors, availableSizes, error, filters } = useLoaderData<typeof loader>();
  
  // 내부 제품을 SKU 기준 Map으로 변환 (O(1) 조회)
  const internalProductsMap = useMemo(() => {
    const map = new Map<string, { color_kr: string | null; sku_6_size: string | null; product_name: string }>();
    internalProducts.forEach((p: any) => {
      map.set(p.sku, { color_kr: p.color_kr, sku_6_size: p.sku_6_size, product_name: p.product_name });
    });
    return map;
  }, [internalProducts]);
  
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [inventoryModal, setInventoryModal] = useState<{
    open: boolean;
    originProductNo: number;
    optionCombinationId: number;
    currentQuantity: number;
    productName: string;
    optionName: string;
  } | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [mappingModal, setMappingModal] = useState<{
    open: boolean;
    optionId: string;
    currentSku: string | null;
    productName: string;
    optionName: string;
  } | null>(null);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [bulkMappingModal, setBulkMappingModal] = useState<{
    open: boolean;
    product: NaverProduct;
  } | null>(null);
  const [bulkMappings, setBulkMappings] = useState<Record<string, string>>({});
  const [bulkSkuSearch, setBulkSkuSearch] = useState<string>("");

  const syncFetcher = useFetcher();
  const inventoryFetcher = useFetcher();
  const mappingFetcher = useFetcher();
  const bulkMappingFetcher = useFetcher();
  const revalidator = useRevalidator();
  
  const syncing = syncFetcher.state === "submitting" || syncFetcher.state === "loading";
  const updatingInventory = inventoryFetcher.state === "submitting" || inventoryFetcher.state === "loading";
  const updatingMapping = mappingFetcher.state === "submitting" || mappingFetcher.state === "loading";
  const updatingBulkMapping = bulkMappingFetcher.state === "submitting" || bulkMappingFetcher.state === "loading";
  const hasHandledSyncRef = useRef(false);
  const hasHandledInventoryRef = useRef(false);
  const hasHandledMappingRef = useRef(false);
  const hasHandledBulkMappingRef = useRef(false);

  // 동기화 결과 처리
  useEffect(() => {
    if (syncFetcher.data && syncFetcher.state === "idle" && !hasHandledSyncRef.current) {
      hasHandledSyncRef.current = true;
      if ((syncFetcher.data as any).success) {
        setSyncMessage(`✅ ${(syncFetcher.data as any).message}`);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${(syncFetcher.data as any).error}`);
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
      if ((inventoryFetcher.data as any).success) {
        setSyncMessage(`✅ ${(inventoryFetcher.data as any).message}`);
        setInventoryModal(null);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${(inventoryFetcher.data as any).error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (inventoryFetcher.state === "submitting") {
      hasHandledInventoryRef.current = false;
    }
  }, [inventoryFetcher.data, inventoryFetcher.state, revalidator]);

  // 매핑 결과 처리
  useEffect(() => {
    if (mappingFetcher.data && mappingFetcher.state === "idle" && !hasHandledMappingRef.current) {
      hasHandledMappingRef.current = true;
      if ((mappingFetcher.data as any).success) {
        setSyncMessage(`✅ ${(mappingFetcher.data as any).message}`);
        setMappingModal(null);
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${(mappingFetcher.data as any).error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (mappingFetcher.state === "submitting") {
      hasHandledMappingRef.current = false;
    }
  }, [mappingFetcher.data, mappingFetcher.state, revalidator]);

  // 일괄 매핑 결과 처리
  useEffect(() => {
    if (bulkMappingFetcher.data && bulkMappingFetcher.state === "idle" && !hasHandledBulkMappingRef.current) {
      hasHandledBulkMappingRef.current = true;
      if ((bulkMappingFetcher.data as any).success) {
        setSyncMessage(`✅ ${(bulkMappingFetcher.data as any).message}`);
        setBulkMappingModal(null);
        setBulkMappings({});
        revalidator.revalidate();
      } else {
        setSyncMessage(`❌ ${(bulkMappingFetcher.data as any).error}`);
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
    if (bulkMappingFetcher.state === "submitting") {
      hasHandledBulkMappingRef.current = false;
    }
  }, [bulkMappingFetcher.data, bulkMappingFetcher.state, revalidator]);

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

  const openMappingModal = (
    optionId: string,
    currentSku: string | null,
    productName: string,
    optionName: string
  ) => {
    setMappingModal({
      open: true,
      optionId,
      currentSku,
      productName,
      optionName,
    });
    setSelectedSku(currentSku || "");
  };

  const handleMappingUpdate = () => {
    if (!mappingModal) return;
    
    mappingFetcher.submit(
      {
        actionType: "mapSku",
        optionId: mappingModal.optionId,
        internalSku: selectedSku,
      },
      { method: "POST" }
    );
  };

  const openBulkMappingModal = (product: NaverProduct) => {
    const initialMappings: Record<string, string> = {};
    product.options?.forEach((o) => {
      initialMappings[o.id] = o.internal_sku || "";
    });
    setBulkMappings(initialMappings);
    setBulkMappingModal({ open: true, product });
  };

  const handleBulkMappingUpdate = () => {
    if (!bulkMappingModal) return;
    
    const mappings = Object.entries(bulkMappings).map(([optionId, sku]) => ({
      optionId,
      sku: sku || null,
    }));
    
    bulkMappingFetcher.submit(
      {
        actionType: "bulkMapSku",
        mappings: JSON.stringify(mappings),
      },
      { method: "POST" }
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
        return <Badge className="bg-green-500">판매중</Badge>;
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

  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : filters.search;
    const newStatus = overrides.status !== undefined ? overrides.status : filters.status;
    const newStock = overrides.stock !== undefined ? overrides.stock : filters.stock;
    const newOption = overrides.option !== undefined ? overrides.option : filters.option;
    const newMapping = overrides.mapping !== undefined ? overrides.mapping : filters.mapping;
    const newColor = overrides.color !== undefined ? overrides.color : filters.color;
    const newSize = overrides.size !== undefined ? overrides.size : filters.size;
    const newSortBy = overrides.sortBy !== undefined ? overrides.sortBy : filters.sortBy;
    const newSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : filters.sortOrder;

    if (newSearch) params.set("search", newSearch);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newStock && newStock !== "all") params.set("stock", newStock);
    if (newOption && newOption !== "all") params.set("option", newOption);
    if (newMapping && newMapping !== "all") params.set("mapping", newMapping);
    if (newColor && newColor !== "all") params.set("color", newColor);
    if (newSize && newSize !== "all") params.set("size", newSize);
    if (newSortBy && newSortBy !== "updated_at") params.set("sortBy", newSortBy);
    if (newSortOrder && newSortOrder !== "desc") params.set("sortOrder", newSortOrder);
    
    const queryString = params.toString();
    return `/dashboard/products-naver${queryString ? `?${queryString}` : ""}`;
  };

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      window.location.href = buildUrl({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" });
    } else {
      window.location.href = buildUrl({ sortBy: column, sortOrder: "asc" });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const headers = ["제품번호", "제품명", "옵션", "내부SKU", "판매가", "재고", "상태"];
    const rows: string[][] = [];
    
    products.forEach((product: NaverProduct) => {
      product.options?.forEach((option: NaverProductOption) => {
        rows.push([
          String(product.origin_product_no),
          product.product_name,
          formatOptionName(option),
          option.internal_sku || option.seller_management_code || "",
          String(option.price),
          String(option.stock_quantity),
          option.use_yn === "Y" ? "사용" : "미사용",
        ]);
      });
    });
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `naver_products_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const hasActiveFilters = filters.search || filters.status !== "all" || filters.stock !== "all" || filters.option !== "all" || filters.mapping !== "all" || filters.color !== "all" || filters.size !== "all" || filters.productId;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 상품 문의에서 연결된 경우 알림 */}
      {filters.productId && (
        <div className="p-4 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4" />
            <span>상품 문의에서 연결된 제품입니다. (상품 ID: {filters.productId})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/dashboard/products/naver"}
          >
            필터 해제
          </Button>
        </div>
      )}

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "동기화 중..." : "제품 동기화"}
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ status: "all", stock: "all", option: "all", mapping: "all" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 제품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.totalOptions}개 옵션</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ mapping: "unmapped" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Link2OffIcon className="h-4 w-4 text-orange-500" />
              미매핑
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unmappedProducts}</div>
            <p className="text-xs text-muted-foreground">{stats.unmappedOptions}개 옵션</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ option: "hasOptions" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <PackageIcon className="h-4 w-4 text-blue-500" />
              옵션 있음
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.hasOptions}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ status: "SALE" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              판매중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onSale}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ stock: "outOfStock" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <XCircleIcon className="h-4 w-4 text-red-500" />
              품절
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = buildUrl({ stock: "lowStock" })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
              재고부족
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">마지막 동기화</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{formatDate(stats.lastSyncedAt)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="제품명, 판매자코드 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">검색</Button>
            </form>

            <div className="flex flex-wrap gap-2 items-center">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={filters.mapping} 
                onValueChange={(v) => window.location.href = buildUrl({ mapping: v })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="SKU 매핑" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 매핑</SelectItem>
                  <SelectItem value="unmapped">미매핑</SelectItem>
                  <SelectItem value="mapped">매핑완료</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.option} 
                onValueChange={(v) => window.location.href = buildUrl({ option: v })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="옵션" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 옵션</SelectItem>
                  <SelectItem value="hasOptions">다중 옵션</SelectItem>
                  <SelectItem value="noOptions">단일 상품</SelectItem>
                </SelectContent>
              </Select>
              {availableColors.length > 0 && (
                <Select 
                  value={filters.color} 
                  onValueChange={(v) => window.location.href = buildUrl({ color: v })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="색상" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 색상</SelectItem>
                    {availableColors.filter((color: string) => color).map((color: string) => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {availableSizes.length > 0 && (
                <Select 
                  value={filters.size} 
                  onValueChange={(v) => window.location.href = buildUrl({ size: v })}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="사이즈" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {availableSizes.filter((size: string) => size).map((size: string) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select 
                value={filters.status} 
                onValueChange={(v) => window.location.href = buildUrl({ status: v })}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="SALE">판매중</SelectItem>
                  <SelectItem value="SUSPENSION">판매중지</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.stock} 
                onValueChange={(v) => window.location.href = buildUrl({ stock: v })}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="재고" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="lowStock">부족</SelectItem>
                  <SelectItem value="outOfStock">품절</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={`${filters.sortBy}-${filters.sortOrder}`} 
                onValueChange={(v) => {
                  const [sortBy, sortOrder] = v.split("-");
                  window.location.href = buildUrl({ sortBy, sortOrder });
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at-desc">최신순</SelectItem>
                  <SelectItem value="product_name-asc">제품명 ↑</SelectItem>
                  <SelectItem value="product_name-desc">제품명 ↓</SelectItem>
                  <SelectItem value="color-asc">색상 ↑</SelectItem>
                  <SelectItem value="color-desc">색상 ↓</SelectItem>
                  <SelectItem value="size-asc">사이즈 ↑</SelectItem>
                  <SelectItem value="size-desc">사이즈 ↓</SelectItem>
                  <SelectItem value="sale_price-asc">가격 낮은순</SelectItem>
                  <SelectItem value="sale_price-desc">가격 높은순</SelectItem>
                  <SelectItem value="stock_quantity-asc">재고 적은순</SelectItem>
                  <SelectItem value="stock_quantity-desc">재고 많은순</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={() => window.location.href = "/dashboard/products-naver"}>
                  초기화
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
            행을 클릭하면 옵션을 확인할 수 있습니다. SKU를 내부 제품과 매핑하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[80px]">이미지</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="w-[60px]">유형</TableHead>
                  <TableHead className="w-[150px]">판매자 코드</TableHead>
                  <TableHead className="w-[90px]">색상</TableHead>
                  <TableHead className="w-[70px]">사이즈</TableHead>
                  <TableHead className="w-[100px]">판매가</TableHead>
                  <TableHead className="w-[70px]">재고</TableHead>
                  <TableHead className="w-[90px]">상태</TableHead>
                  <TableHead className="w-[70px]">옵션 수</TableHead>
                  <TableHead className="w-[80px]">품절</TableHead>
                  <TableHead className="w-[100px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: NaverProduct) => {
                  const outOfStockOptions = product.options?.filter(o => o.stock_quantity <= 0).length || 0;
                  const isSingleOption = !product.options || product.options.length <= 1;
                  const isSetProduct = product.product_name.includes("세트") || product.product_name.toLowerCase().includes("set");
                  
                  // 단일 옵션인 경우 첫 번째 옵션의 SKU로 색상/사이즈 조회
                  const firstOption = product.options?.[0];
                  const firstSku = firstOption?.internal_sku || firstOption?.seller_management_code || product.seller_management_code;
                  const firstMappedProduct = firstSku ? internalProductsMap.get(firstSku) : null;
                  
                  return (
                    <>
                      {/* 메인 제품 행 */}
                      <TableRow 
                        key={product.origin_product_no}
                        className={isSingleOption ? "hover:bg-muted/50" : "cursor-pointer hover:bg-muted/50"}
                        onClick={() => !isSingleOption && toggleProduct(product.origin_product_no)}
                      >
                        <TableCell>
                          {!isSingleOption && (
                            expandedProducts.has(product.origin_product_no) ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )
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
                          <div className="text-xs text-muted-foreground font-mono space-x-2">
                            <span title="원상품번호">원: {product.origin_product_no}</span>
                            {product.channel_product_no && (
                              <span title="채널상품번호" className="text-green-600">채널: {product.channel_product_no}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSetProduct ? (
                            <Badge variant="outline" className="text-xs border-purple-500 text-purple-600 bg-purple-50">
                              <PackageOpenIcon className="h-3 w-3 mr-1" />
                              세트
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              단품
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {product.seller_management_code || "-"}
                        </TableCell>
                        <TableCell>
                          {isSingleOption && firstMappedProduct?.color_kr ? (
                            <ColorBadge colorName={firstMappedProduct.color_kr} />
                          ) : isSingleOption ? (
                            <span className="text-muted-foreground text-xs">-</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">다중</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSingleOption && firstMappedProduct?.sku_6_size ? (
                            <SizeBadge size={firstMappedProduct.sku_6_size} />
                          ) : isSingleOption ? (
                            <span className="text-muted-foreground text-xs">-</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">다중</span>
                          )}
                        </TableCell>
                        <TableCell>{formatPrice(product.sale_price)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.stock_quantity <= 0 ? "destructive" : "secondary"}
                          >
                            {product.stock_quantity}개
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.product_status)}</TableCell>
                        <TableCell>
                          {(product.options?.length || 0) > 1 ? (
                            <Badge variant="outline">
                              {product.options?.length || 0}개
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs text-slate-500">
                              단일
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {outOfStockOptions > 0 ? (
                            <Badge variant="destructive">{outOfStockOptions}개</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const productNo = product.channel_product_no || product.origin_product_no;
                                window.open(`https://brand.naver.com/sundayhug/products/${productNo}`, "_blank");
                              }}
                              title="스마트스토어에서 보기"
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBulkMappingModal(product);
                              }}
                              title="일괄 SKU 매핑"
                            >
                              <LayersIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* 옵션 아코디언 */}
                      {expandedProducts.has(product.origin_product_no) && product.options && product.options.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={13} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>옵션</TableHead>
                                    <TableHead className="w-[120px]">내부 SKU</TableHead>
                                    <TableHead className="w-[100px]">색상</TableHead>
                                    <TableHead className="w-[80px]">사이즈</TableHead>
                                    <TableHead className="w-[100px]">가격</TableHead>
                                    <TableHead className="w-[80px]">재고</TableHead>
                                    <TableHead className="w-[70px]">사용</TableHead>
                                    <TableHead className="w-[100px]">액션</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {product.options.map((option: NaverProductOption) => {
                                    // SKU 조회: internal_sku 또는 seller_management_code 사용
                                    const sku = option.internal_sku || option.seller_management_code;
                                    const mappedProduct = sku ? internalProductsMap.get(sku) : null;
                                    
                                    // 옵션명 생성: 매핑된 색상/사이즈 또는 원래 옵션값 사용
                                    const getOptionDisplayName = () => {
                                      if (mappedProduct?.color_kr && mappedProduct?.sku_6_size) {
                                        return `${mappedProduct.color_kr} / ${mappedProduct.sku_6_size}`;
                                      } else if (mappedProduct?.color_kr) {
                                        return mappedProduct.color_kr;
                                      } else if (mappedProduct?.sku_6_size) {
                                        return mappedProduct.sku_6_size;
                                      } else if (option.option_value1) {
                                        const parts: string[] = [];
                                        if (option.option_name1 && option.option_value1) {
                                          parts.push(`${option.option_name1}: ${option.option_value1}`);
                                        }
                                        if (option.option_name2 && option.option_value2) {
                                          parts.push(`${option.option_name2}: ${option.option_value2}`);
                                        }
                                        return parts.length > 0 ? parts.join(", ") : "기본";
                                      }
                                      return "기본";
                                    };
                                    
                                    return (
                                      <TableRow key={option.option_combination_id}>
                                        <TableCell className="font-medium">
                                          {getOptionDisplayName()}
                                        </TableCell>
                                        <TableCell>
                                          {sku ? (
                                            <Badge variant="outline" className="font-mono text-xs">
                                              {sku}
                                            </Badge>
                                          ) : (
                                            <span className="text-muted-foreground text-xs">미매핑</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {mappedProduct?.color_kr ? (
                                            <ColorBadge colorName={mappedProduct.color_kr} />
                                          ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {mappedProduct?.sku_6_size ? (
                                            <SizeBadge size={mappedProduct.sku_6_size} />
                                          ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>{formatPrice(option.price)}</TableCell>
                                        <TableCell>
                                          <Badge 
                                            variant={option.stock_quantity <= 0 ? "destructive" : option.stock_quantity <= 10 ? "outline" : "secondary"}
                                            className={option.stock_quantity <= 10 && option.stock_quantity > 0 ? "border-yellow-500 text-yellow-700" : ""}
                                          >
                                            {option.stock_quantity}개
                                          </Badge>
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
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openMappingModal(
                                                  option.id,
                                                  option.internal_sku,
                                                  product.product_name,
                                                  getOptionDisplayName()
                                                );
                                              }}
                                              title="SKU 매핑"
                                            >
                                              <LinkIcon className="h-4 w-4" />
                                            </Button>
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
                                                  getOptionDisplayName()
                                                );
                                              }}
                                              title="재고 수정"
                                            >
                                              <EditIcon className="h-4 w-4" />
                                            </Button>
                                          </div>
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
                    </>
                  );
                })}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters 
                        ? "검색 결과가 없습니다" 
                        : "제품이 없습니다. \"제품 동기화\" 버튼을 클릭해 스마트스토어에서 제품을 가져오세요."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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

      {/* SKU 매핑 모달 */}
      <Dialog 
        open={mappingModal?.open || false} 
        onOpenChange={(open) => !open && setMappingModal(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>SKU 매핑</DialogTitle>
            <DialogDescription>
              네이버 옵션을 내부 제품 SKU에 매핑합니다.
            </DialogDescription>
          </DialogHeader>
          {mappingModal && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">제품</Label>
                <p className="font-medium">{mappingModal.productName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">옵션</Label>
                <p className="font-medium">{mappingModal.optionName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">현재 SKU</Label>
                <p className="font-medium">{mappingModal.currentSku || "미매핑"}</p>
              </div>
              <div>
                <Label htmlFor="internalSku">내부 SKU 선택</Label>
                <Select value={selectedSku || "__none__"} onValueChange={(v) => setSelectedSku(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="SKU 선택..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    <SelectItem value="__none__">매핑 해제</SelectItem>
                    {internalProducts.filter((product: any) => product.sku).map((product: any) => (
                      <SelectItem key={product.sku} value={product.sku}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-1 rounded">{product.sku}</span>
                          <span className="truncate">{product.product_name}</span>
                          {product.color_kr && <Badge variant="outline" className="text-xs">{product.color_kr}</Badge>}
                          {product.sku_6_size && <Badge variant="secondary" className="text-xs">{product.sku_6_size}</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMappingModal(null)}
              disabled={updatingMapping}
            >
              취소
            </Button>
            <Button 
              onClick={handleMappingUpdate}
              disabled={updatingMapping}
            >
              {updatingMapping ? "저장 중..." : "매핑 저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 SKU 매핑 모달 */}
      <Dialog 
        open={bulkMappingModal?.open || false} 
        onOpenChange={(open) => {
          if (!open) {
            setBulkMappingModal(null);
            setBulkSkuSearch("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <LayersIcon className="h-5 w-5 text-green-500" />
              일괄 SKU 매핑
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span className="font-medium text-foreground">{bulkMappingModal?.product.product_name}</span>
              {bulkMappingModal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => {
                      const productNo = bulkMappingModal.product.channel_product_no || bulkMappingModal.product.origin_product_no;
                      window.open(`https://brand.naver.com/sundayhug/products/${productNo}`, "_blank");
                    }}
                  >
                    <ExternalLinkIcon className="h-3 w-3 mr-1" />
                    스토어 보기
                  </Button>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {bulkMappingModal && (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* SKU 검색 필터 */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="SKU, 제품명, 색상으로 검색..."
                    value={bulkSkuSearch}
                    onChange={(e) => setBulkSkuSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* 옵션 매핑 테이블 */}
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                    <TableRow>
                      <TableHead className="w-[200px]">네이버 옵션</TableHead>
                      <TableHead className="w-[150px]">현재 SKU</TableHead>
                      <TableHead>내부 SKU 선택</TableHead>
                      <TableHead className="w-[100px]">매핑 정보</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkMappingModal.product.options?.map((option) => {
                      const currentMapped = bulkMappings[option.id] ? internalProductsMap.get(bulkMappings[option.id]) : null;
                      const filteredProducts = internalProducts.filter((p: any) => {
                        if (!bulkSkuSearch) return true;
                        const search = bulkSkuSearch.toLowerCase();
                        return (
                          p.sku?.toLowerCase().includes(search) ||
                          p.product_name?.toLowerCase().includes(search) ||
                          p.color_kr?.toLowerCase().includes(search)
                        );
                      });
                      
                      return (
                        <TableRow key={option.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="font-medium">{formatOptionName(option)}</div>
                            <div className="text-xs text-muted-foreground font-mono">ID: {option.option_combination_id}</div>
                          </TableCell>
                          <TableCell>
                            {option.internal_sku || option.seller_management_code ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {option.internal_sku || option.seller_management_code}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs text-orange-600 bg-orange-50">
                                미매핑
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={bulkMappings[option.id] || "__none__"} 
                              onValueChange={(v) => setBulkMappings(prev => ({
                                ...prev,
                                [option.id]: v === "__none__" ? "" : v
                              }))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="SKU 선택..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                <SelectItem value="__none__">
                                  <span className="text-muted-foreground">매핑 해제</span>
                                </SelectItem>
                                {filteredProducts.filter((p: any) => p.sku).map((p: any) => (
                                  <SelectItem key={p.sku} value={p.sku}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-muted px-1 rounded">{p.sku}</span>
                                      <span className="truncate">{p.product_name}</span>
                                      {p.color_kr && <Badge variant="outline" className="text-xs">{p.color_kr}</Badge>}
                                      {p.sku_6_size && <Badge variant="secondary" className="text-xs">{p.sku_6_size}</Badge>}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {currentMapped ? (
                              <div className="flex flex-col gap-1">
                                {currentMapped.color_kr && (
                                  <ColorBadge colorName={currentMapped.color_kr} />
                                )}
                                {currentMapped.sku_6_size && (
                                  <SizeBadge size={currentMapped.sku_6_size} />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {/* 매핑 요약 */}
              <div className="flex-shrink-0 flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                <div>
                  총 {bulkMappingModal.product.options?.length || 0}개 옵션 중{" "}
                  <span className="text-green-600 font-medium">
                    {Object.values(bulkMappings).filter(v => v).length}개 매핑됨
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // 전체 해제
                      const cleared: Record<string, string> = {};
                      bulkMappingModal.product.options?.forEach(o => {
                        cleared[o.id] = "";
                      });
                      setBulkMappings(cleared);
                    }}
                  >
                    전체 해제
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setBulkMappingModal(null);
                setBulkSkuSearch("");
              }}
              disabled={updatingBulkMapping}
            >
              취소
            </Button>
            <Button 
              onClick={handleBulkMappingUpdate}
              disabled={updatingBulkMapping}
            >
              {updatingBulkMapping ? "저장 중..." : "일괄 매핑 저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
