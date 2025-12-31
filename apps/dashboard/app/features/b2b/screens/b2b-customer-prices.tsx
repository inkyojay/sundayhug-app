/**
 * B2B 업체별 가격표 관리
 * - 인라인 편집
 * - 일괄 가격 설정
 * - CSV 업로드 미리보기
 */
import type { Route } from "./+types/b2b-customer-prices";

import {
  DollarSignIcon,
  ArrowLeftIcon,
  PlusIcon,
  DownloadIcon,
  UploadIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  SaveIcon,
  XIcon,
  CheckIcon,
  PackageIcon,
  AlertCircleIcon,
  FileSpreadsheetIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useFetcher, useRevalidator } from "react-router";

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
import { Label } from "~/core/components/ui/label";
import { Checkbox } from "~/core/components/ui/checkbox";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/core/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";
import { Separator } from "~/core/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "~/core/components/ui/sheet";
import { ScrollArea } from "~/core/components/ui/scroll-area";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "업체별 가격표 | Sundayhug Admin" }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { id } = params;

  // 업체 정보 조회
  const { data: customer, error: customerError } = await supabase
    .from("b2b_customers")
    .select("*")
    .eq("id", id)
    .single();

  if (customerError || !customer) {
    throw new Response("업체를 찾을 수 없습니다", { status: 404 });
  }

  // 업체 가격표 조회
  const { data: prices } = await supabase
    .from("b2b_customer_prices")
    .select(`
      *,
      parent_product:parent_products(parent_sku, product_name, category)
    `)
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  // 제품 분류 목록 조회 (가격 추가용)
  const { data: parentProducts } = await supabase
    .from("parent_products")
    .select("parent_sku, product_name, category")
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  // 카테고리 목록 추출
  const categories = Array.from(
    new Set(parentProducts?.map((p: any) => p.category).filter(Boolean) || [])
  ).sort();

  return {
    customer,
    prices: prices || [],
    parentProducts: parentProducts || [],
    categories,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const { id: customerId } = params;

  if (intent === "add" || intent === "update") {
    const priceData = {
      customer_id: customerId,
      parent_sku: formData.get("parent_sku") as string,
      unit_price: parseFloat(formData.get("unit_price") as string),
      currency: formData.get("currency") as string,
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    };

    if (intent === "add") {
      const { error } = await supabase.from("b2b_customer_prices").insert(priceData);
      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "이미 등록된 제품입니다." };
        }
        return { success: false, error: error.message };
      }
      return { success: true, message: "가격이 등록되었습니다." };
    } else {
      const priceId = formData.get("id") as string;
      const { error } = await supabase
        .from("b2b_customer_prices")
        .update(priceData)
        .eq("id", priceId);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: "가격이 수정되었습니다." };
    }
  }

  if (intent === "delete") {
    const priceId = formData.get("id") as string;
    const { error } = await supabase.from("b2b_customer_prices").delete().eq("id", priceId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: "삭제되었습니다." };
  }

  if (intent === "bulk_add") {
    const items = JSON.parse(formData.get("items") as string) as any[];
    const currency = formData.get("currency") as string;
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      if (!item.parent_sku || !item.unit_price) continue;

      const priceData = {
        customer_id: customerId,
        parent_sku: item.parent_sku,
        unit_price: parseFloat(item.unit_price),
        currency: currency,
        notes: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("b2b_customer_prices")
        .upsert(priceData, { onConflict: "customer_id,parent_sku" });

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    return {
      success: true,
      message: `${successCount}개 제품 가격 설정 완료${errorCount > 0 ? `, ${errorCount}개 실패` : ""}`,
    };
  }

  if (intent === "csv_upload") {
    const csvData = JSON.parse(formData.get("csvData") as string) as any[];
    const customerCurrency = formData.get("currency") as string || "KRW";
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      if (!row.parent_sku || !row.unit_price) continue;

      const priceData = {
        customer_id: customerId,
        parent_sku: row.parent_sku,
        unit_price: parseFloat(row.unit_price),
        currency: customerCurrency, // 업체 통화 사용 (CSV의 currency 무시)
        notes: row.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("b2b_customer_prices")
        .upsert(priceData, { onConflict: "customer_id,parent_sku" });

      if (error) {
        errorCount++;
        errors.push(`${row.parent_sku}: ${error.message}`);
      } else {
        successCount++;
      }
    }

    return {
      success: true,
      message: `CSV 업로드 완료: ${successCount}개 성공${errorCount > 0 ? `, ${errorCount}개 실패` : ""}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  return { success: false, error: "Unknown intent" };
}

// CSV 파싱 함수
function parseCSV(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

// 금액 포맷 함수
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

// 숫자 포맷 함수
function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("ko-KR").format(num);
}

export default function B2BCustomerPrices({ loaderData }: Route.ComponentProps) {
  const { customer, prices, parentProducts, categories } = loaderData;

  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(null);

  // 인라인 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");

  // 일괄 추가 Sheet
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>("all");
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({});
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());

  // CSV 미리보기 Dialog
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);

  // 삭제 확인
  const [deletePrice, setDeletePrice] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setMessage(`✅ ${fetcher.data.message}`);
        setEditingId(null);
        setShowBulkSheet(false);
        setShowCSVPreview(false);
        setBulkPrices({});
        setSelectedForBulk(new Set());
        revalidator.revalidate();
      } else {
        setMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setMessage(null), 4000);
    }
  }, [fetcher.data, fetcher.state]);

  // 검색 및 카테고리 필터링
  const filteredPrices = prices.filter((p: any) => {
    const matchesSearch = !searchInput ||
      p.parent_sku.toLowerCase().includes(searchInput.toLowerCase()) ||
      p.parent_product?.product_name?.toLowerCase().includes(searchInput.toLowerCase());

    const matchesCategory = categoryFilter === "all" ||
      p.parent_product?.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // 등록되지 않은 제품 목록
  const unregisteredProducts = parentProducts.filter(
    (p: any) => !prices.some((price: any) => price.parent_sku === p.parent_sku)
  );

  // 일괄 추가용 필터링된 제품
  const filteredUnregisteredProducts = unregisteredProducts.filter((p: any) => {
    return bulkCategory === "all" || p.category === bulkCategory;
  });

  // 인라인 편집 시작
  const startEditing = (price: any) => {
    setEditingId(price.id);
    setEditingPrice(String(price.unit_price));
  };

  // 인라인 편집 저장
  const saveInlineEdit = (price: any) => {
    if (!editingPrice || parseFloat(editingPrice) <= 0) return;

    fetcher.submit(
      {
        intent: "update",
        id: price.id,
        parent_sku: price.parent_sku,
        unit_price: editingPrice,
        currency: price.currency,
        notes: price.notes || "",
      },
      { method: "POST" }
    );
  };

  // 인라인 편집 취소
  const cancelEditing = () => {
    setEditingId(null);
    setEditingPrice("");
  };

  // 삭제
  const handleDelete = () => {
    if (!deletePrice) return;
    fetcher.submit({ intent: "delete", id: deletePrice.id }, { method: "POST" });
    setDeletePrice(null);
  };

  // 일괄 추가 제출
  const handleBulkSubmit = () => {
    const items = Array.from(selectedForBulk)
      .filter((sku) => bulkPrices[sku] && parseFloat(bulkPrices[sku]) > 0)
      .map((sku) => ({
        parent_sku: sku,
        unit_price: bulkPrices[sku],
      }));

    if (items.length === 0) {
      setMessage("❌ 가격이 입력된 제품이 없습니다.");
      return;
    }

    fetcher.submit(
      {
        intent: "bulk_add",
        items: JSON.stringify(items),
        currency: customer.currency || "KRW",
      },
      { method: "POST" }
    );
  };

  // CSV 다운로드
  const handleCSVDownload = () => {
    const headers = ["parent_sku", "product_name", "unit_price", "currency", "notes"];
    const csvContent = [
      headers.join(","),
      ...prices.map((p: any) =>
        [
          p.parent_sku,
          p.parent_product?.product_name || "",
          p.unit_price,
          p.currency,
          p.notes || "",
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${customer.customer_code}_prices_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // CSV 샘플 다운로드
  const handleCSVSampleDownload = () => {
    const headers = ["parent_sku", "unit_price", "currency", "notes"];
    const sampleData = [
      ["SKU-001", "10000", "KRW", "샘플 메모"],
      ["SKU-002", "15000", "KRW", ""],
    ];
    const csvContent = [headers.join(","), ...sampleData.map((row) => row.join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "price_upload_sample.csv";
    link.click();
  };

  // CSV 파일 선택
  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      if (data.length === 0) {
        setMessage("❌ CSV 파일이 비어있거나 형식이 잘못되었습니다.");
        return;
      }

      // 제품 존재 여부 체크
      const enrichedData = data.map((row) => {
        const product = parentProducts.find((p: any) => p.parent_sku === row.parent_sku);
        const existingPrice = prices.find((p: any) => p.parent_sku === row.parent_sku);
        return {
          ...row,
          product_name: product?.product_name || null,
          exists: !!product,
          hasExistingPrice: !!existingPrice,
          existingPrice: existingPrice?.unit_price,
        };
      });

      setCsvPreviewData(enrichedData);
      setShowCSVPreview(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // CSV 업로드 확정
  const handleCSVUploadConfirm = () => {
    const validData = csvPreviewData.filter((row) => row.exists && row.unit_price);
    if (validData.length === 0) {
      setMessage("❌ 유효한 데이터가 없습니다.");
      return;
    }

    fetcher.submit(
      {
        intent: "csv_upload",
        csvData: JSON.stringify(validData),
        currency: customer.currency || "KRW", // 업체 통화 전달
      },
      { method: "POST" }
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedForBulk.size === filteredUnregisteredProducts.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(filteredUnregisteredProducts.map((p: any) => p.parent_sku)));
    }
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletePrice} onOpenChange={() => setDeletePrice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가격 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletePrice?.parent_product?.product_name}" 제품의 가격을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV 미리보기 다이얼로그 */}
      <Dialog open={showCSVPreview} onOpenChange={setShowCSVPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheetIcon className="w-5 h-5" />
              CSV 업로드 미리보기
            </DialogTitle>
            <DialogDescription>
              업로드할 데이터를 확인하세요. 존재하지 않는 SKU는 건너뜁니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
              <span>신규 등록</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded" />
              <span>가격 변경</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
              <span>SKU 없음 (건너뜀)</span>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상태</TableHead>
                  <TableHead>Parent SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead className="text-right">기존 가격</TableHead>
                  <TableHead className="text-right">새 가격</TableHead>
                  <TableHead>통화</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvPreviewData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={
                      !row.exists
                        ? "bg-red-50"
                        : row.hasExistingPrice
                        ? "bg-yellow-50"
                        : "bg-green-50"
                    }
                  >
                    <TableCell>
                      {!row.exists ? (
                        <Badge variant="destructive" className="text-xs">
                          <XIcon className="w-3 h-3 mr-1" />
                          SKU 없음
                        </Badge>
                      ) : row.hasExistingPrice ? (
                        <Badge variant="outline" className="text-xs bg-yellow-100 border-yellow-300">
                          <PencilIcon className="w-3 h-3 mr-1" />
                          변경
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-green-100 border-green-300">
                          <PlusIcon className="w-3 h-3 mr-1" />
                          신규
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {row.parent_sku}
                      </code>
                    </TableCell>
                    <TableCell>{row.product_name || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.existingPrice ? formatNumber(row.existingPrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatNumber(row.unit_price)}
                    </TableCell>
                    <TableCell>{customer.currency || "KRW"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              총 {csvPreviewData.length}개 중{" "}
              <span className="font-medium text-foreground">
                {csvPreviewData.filter((r) => r.exists).length}개
              </span>{" "}
              적용 예정
            </span>
            <span>
              {csvPreviewData.filter((r) => !r.exists).length}개 건너뜀
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCSVPreview(false)}>
              취소
            </Button>
            <Button
              onClick={handleCSVUploadConfirm}
              disabled={isSubmitting || csvPreviewData.filter((r) => r.exists).length === 0}
            >
              {isSubmitting ? "업로드 중..." : `${csvPreviewData.filter((r) => r.exists).length}개 업로드`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 가격 설정 Sheet */}
      <Sheet open={showBulkSheet} onOpenChange={setShowBulkSheet}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PackageIcon className="w-5 h-5" />
              일괄 가격 설정
            </SheetTitle>
            <SheetDescription>
              미등록 제품에 가격을 일괄 설정합니다. 통화: {customer.currency || "KRW"}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* 카테고리 필터 */}
            <div className="flex gap-2">
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedForBulk.size === filteredUnregisteredProducts.length
                  ? "전체 해제"
                  : "전체 선택"}
              </Button>
            </div>

            {/* 제품 목록 */}
            <ScrollArea className="h-[calc(100vh-320px)] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedForBulk.size === filteredUnregisteredProducts.length && filteredUnregisteredProducts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>제품</TableHead>
                    <TableHead className="w-[140px]">가격</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnregisteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        미등록 제품이 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUnregisteredProducts.map((product: any) => (
                      <TableRow key={product.parent_sku}>
                        <TableCell>
                          <Checkbox
                            checked={selectedForBulk.has(product.parent_sku)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedForBulk);
                              if (checked) {
                                newSet.add(product.parent_sku);
                              } else {
                                newSet.delete(product.parent_sku);
                              }
                              setSelectedForBulk(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {product.parent_sku}
                              {product.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0"
                            value={bulkPrices[product.parent_sku] || ""}
                            onChange={(e) =>
                              setBulkPrices({
                                ...bulkPrices,
                                [product.parent_sku]: e.target.value,
                              })
                            }
                            className="w-full text-right"
                            disabled={!selectedForBulk.has(product.parent_sku)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <SheetFooter>
            <div className="flex justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedForBulk.size}개 선택됨
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowBulkSheet(false)}>
                  취소
                </Button>
                <Button onClick={handleBulkSubmit} disabled={isSubmitting || selectedForBulk.size === 0}>
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/b2b/customers">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              목록
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSignIcon className="h-6 w-6" />
              업체별 가격표
            </h1>
            <p className="text-gray-500">
              {customer.company_name} ({customer.customer_code})
              <Badge variant="outline" className="ml-2">
                {customer.currency || "KRW"}
              </Badge>
              <span className="ml-2">
                ·{" "}
                <span className="font-medium text-foreground">{prices.length}</span>개 등록
                {unregisteredProducts.length > 0 && (
                  <span className="text-orange-600 ml-2">
                    · {unregisteredProducts.length}개 미등록
                  </span>
                )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCSVFileSelect}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={handleCSVSampleDownload}>
            <DownloadIcon className="h-4 w-4 mr-1" />
            샘플 CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-4 w-4 mr-1" />
            CSV 업로드
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSVDownload} disabled={prices.length === 0}>
            <DownloadIcon className="h-4 w-4 mr-1" />
            CSV 내보내기
          </Button>
          <Button onClick={() => setShowBulkSheet(true)} disabled={unregisteredProducts.length === 0}>
            <PlusIcon className="h-4 w-4 mr-2" />
            일괄 가격 설정
            {unregisteredProducts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unregisteredProducts.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="제품명 또는 SKU로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {categories.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 가격 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent SKU</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-right w-[180px]">단가</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                    {prices.length === 0 ? (
                      <div className="space-y-2">
                        <PackageIcon className="w-10 h-10 mx-auto text-gray-300" />
                        <p>등록된 가격이 없습니다</p>
                        <Button variant="outline" size="sm" onClick={() => setShowBulkSheet(true)}>
                          가격 등록하기
                        </Button>
                      </div>
                    ) : (
                      "검색 결과가 없습니다"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrices.map((price: any) => (
                  <TableRow key={price.id}>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {price.parent_sku}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      {price.parent_product?.product_name || "-"}
                    </TableCell>
                    <TableCell>
                      {price.parent_product?.category && (
                        <Badge variant="outline">{price.parent_product.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === price.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="w-[100px] text-right font-mono"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInlineEdit(price);
                              if (e.key === "Escape") cancelEditing();
                            }}
                          />
                          <span className="text-xs text-muted-foreground w-10">
                            {price.currency}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-green-600"
                            onClick={() => saveInlineEdit(price)}
                            disabled={isSubmitting}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={cancelEditing}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="font-mono cursor-pointer hover:bg-gray-100 px-2 py-1 rounded inline-block"
                          onClick={() => startEditing(price)}
                        >
                          {formatCurrency(price.unit_price, price.currency)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => startEditing(price)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => setDeletePrice(price)}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 도움말 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">가격표 관리 안내</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>가격을 클릭하면 바로 수정할 수 있습니다</li>
                <li>CSV 업로드 시 기존 가격이 있으면 덮어씁니다</li>
                <li>이미 발행된 견적서/인보이스는 가격 변경 영향을 받지 않습니다</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
