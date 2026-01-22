/**
 * 제품 관리 - 제품 분류 (고급 기능)
 * 
 * 기능:
 * - 인라인 편집
 * - 하위 제품에 색상/사이즈/썸네일 표시
 * - 체크박스 일괄 변경
 * - 정렬 (Sorting)
 * - 그룹핑
 * - 변경 확인 알람
 * - 변경 로그 기록
 * - CSV 다운로드/업로드 (Upsert)
 */
import type { Route } from "./+types/parent-products";

import {
  FolderIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  PlusIcon,
  DownloadIcon,
  UploadIcon,
  ArrowUpDownIcon,
  GroupIcon,
  SearchIcon,
  FilterIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Switch } from "~/core/components/ui/switch";
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
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/core/components/ui/collapsible";

import makeServerClient from "~/core/lib/supa-client.server";
import { parseFormDataJson } from "~/core/lib/safe-parse";

// 색상명 → 실제 색상 코드 매핑
const colorMap: Record<string, string> = {
  // 기본 색상
  "화이트": "#FFFFFF", "흰색": "#FFFFFF", "white": "#FFFFFF", "아이보리": "#FFFFF0",
  "블랙": "#1a1a1a", "검정": "#1a1a1a", "black": "#1a1a1a", "차콜": "#36454F",
  "그레이": "#808080", "회색": "#808080", "gray": "#808080", "grey": "#808080",
  "라이트그레이": "#D3D3D3", "다크그레이": "#404040",
  // 브라운 계열
  "브라운": "#8B4513", "갈색": "#8B4513", "brown": "#8B4513",
  "어스브라운": "#6B4423", "다크브라운": "#3D2914", "라이트브라운": "#A0522D",
  "베이지": "#F5F5DC", "beige": "#F5F5DC", "탄": "#D2B48C", "카멜": "#C19A6B",
  "크림": "#FFFDD0", "데일리크림": "#FFFDD0", "cream": "#FFFDD0",
  "카키": "#8B8B00", "khaki": "#F0E68C", "올리브": "#808000",
  // 블루 계열  
  "네이비": "#000080", "navy": "#000080", "블루": "#0000FF", "blue": "#0000FF",
  "스카이블루": "#87CEEB", "라이트블루": "#ADD8E6", "다크블루": "#00008B",
  "인디고": "#4B0082", "민트": "#98FF98", "청록": "#008B8B", "틸": "#008080",
  // 핑크/레드 계열
  "핑크": "#FFC0CB", "pink": "#FFC0CB", "로즈": "#FF007F", "코랄": "#FF7F50",
  "레드": "#FF0000", "빨강": "#FF0000", "red": "#FF0000", "와인": "#722F37",
  "버건디": "#800020", "마룬": "#800000", "살몬": "#FA8072",
  // 그린 계열
  "그린": "#008000", "녹색": "#008000", "green": "#008000",
  "라이트그린": "#90EE90", "다크그린": "#006400", "포레스트": "#228B22",
  // 옐로우/오렌지 계열
  "옐로우": "#FFFF00", "노랑": "#FFFF00", "yellow": "#FFFF00",
  "오렌지": "#FFA500", "주황": "#FFA500", "orange": "#FFA500",
  "머스타드": "#FFDB58", "골드": "#FFD700", "레몬": "#FFF44F",
  // 퍼플 계열
  "퍼플": "#800080", "보라": "#800080", "purple": "#800080",
  "라벤더": "#E6E6FA", "바이올렛": "#EE82EE", "플럼": "#DDA0DD",
};

// 색상명에서 색상 코드 추출
function getColorCode(colorName: string): string | null {
  if (!colorName) return null;
  const lowerName = colorName.toLowerCase().replace(/\s/g, "");
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase().replace(/\s/g, ""))) {
      return value;
    }
  }
  return null;
}

// 배경색에 따른 텍스트 색상 결정
function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export const meta: Route.MetaFunction = () => {
  return [{ title: `제품 분류 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const sortBy = url.searchParams.get("sortBy") || "product_name";
  const sortOrder = url.searchParams.get("sortOrder") || "asc";
  const groupBy = url.searchParams.get("groupBy") || "";

  // 제품 분류 목록 조회
  let query = supabase
    .from("parent_products")
    .select("*")
    .order(sortBy, { ascending: sortOrder === "asc" });

  if (search) {
    query = query.or(`product_name.ilike.%${search}%,parent_sku.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }

  const { data: parentProducts, error } = await query;

  // 모든 하위 제품 조회 (색상/사이즈/썸네일 포함)
  const parentSkus = (parentProducts || []).map(p => p.parent_sku).filter(Boolean);
  const { data: allProducts } = parentSkus.length > 0
    ? await supabase
        .from("products")
        .select("sku, product_name, parent_sku, color_kr, sku_6_size, thumbnail_url, is_active")
        .in("parent_sku", parentSkus)
        .order("sku", { ascending: true })
    : { data: [] };

  // parent_sku별 하위 제품 그룹핑
  const productsByParent: Record<string, any[]> = {};
  for (const product of allProducts || []) {
    if (!productsByParent[product.parent_sku]) {
      productsByParent[product.parent_sku] = [];
    }
    productsByParent[product.parent_sku].push(product);
  }

  // 카테고리 및 서브카테고리 목록 추출
  const categories = [...new Set((parentProducts || []).map(p => p.category).filter(Boolean))].sort();
  const subcategories = [...new Set((parentProducts || []).map(p => p.subcategory).filter(Boolean))].sort();

  return {
    parentProducts: parentProducts || [],
    productsByParent,
    categories,
    subcategories,
    search,
    category,
    sortBy,
    sortOrder,
    groupBy,
    error: error?.message,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // 현재 사용자
  const { data: { user } } = await supabase.auth.getUser();

  // 단일 제품 분류 업데이트
  if (intent === "update") {
    const id = formData.get("id") as string;
    const changes = parseFormDataJson<Record<string, any>>(formData, "changes", {});

    // 기존 데이터 조회
    const { data: oldData } = await supabase
      .from("parent_products")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("parent_products")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    // 변경 로그 기록 (배치 INSERT)
    const changeLogs: Array<{
      table_name: string;
      record_id: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
      changed_by: string | undefined;
      change_type: string;
    }> = [];

    for (const [field, newValue] of Object.entries(changes)) {
      if (oldData && oldData[field] !== newValue) {
        changeLogs.push({
          table_name: "parent_products",
          record_id: id,
          field_name: field,
          old_value: oldData[field]?.toString() || null,
          new_value: newValue?.toString() || null,
          changed_by: user?.id,
          change_type: "update",
        });
      }
    }

    if (changeLogs.length > 0) {
      await supabase.from("product_change_logs").insert(changeLogs);
    }

    return { success: true, message: "제품 분류가 업데이트되었습니다." };
  }

  // 일괄 업데이트
  if (intent === "bulk_update") {
    const ids = parseFormDataJson<string[]>(formData, "ids", []);
    const changes = parseFormDataJson<Record<string, any>>(formData, "changes", {});

    const { data: oldDataList } = await supabase
      .from("parent_products")
      .select("*")
      .in("id", ids);

    const { error } = await supabase
      .from("parent_products")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      return { success: false, error: error.message };
    }

    // 변경 로그 기록 (배치 INSERT로 N+1 최적화)
    const changeLogs: Array<{
      table_name: string;
      record_id: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
      changed_by: string | undefined;
      change_type: string;
    }> = [];

    for (const oldData of oldDataList || []) {
      for (const [field, newValue] of Object.entries(changes)) {
        if (oldData[field] !== newValue) {
          changeLogs.push({
            table_name: "parent_products",
            record_id: oldData.id,
            field_name: field,
            old_value: oldData[field]?.toString() || null,
            new_value: newValue?.toString() || null,
            changed_by: user?.id,
            change_type: "bulk_update",
          });
        }
      }
    }

    // 단일 배치 INSERT (기존: 100개 제품 × 5개 필드 = 500회 쿼리 → 최적화 후: 1회)
    if (changeLogs.length > 0) {
      await supabase.from("product_change_logs").insert(changeLogs);
    }

    return { success: true, message: `${ids.length}개 분류가 업데이트되었습니다.` };
  }

  // 새 제품 분류 추가
  if (intent === "create") {
    const product_name = formData.get("product_name") as string;
    const parent_sku = formData.get("parent_sku") as string;
    const category = formData.get("category") as string;
    const subcategory = formData.get("subcategory") as string;
    const description = formData.get("description") as string;
    const thumbnail_url = formData.get("thumbnail_url") as string;

    const { data: newProduct, error } = await supabase
      .from("parent_products")
      .insert({
        product_name: product_name || null,
        parent_sku,
        category: category || null,
        subcategory: subcategory || null,
        description: description || null,
        thumbnail_url: thumbnail_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from("product_change_logs").insert({
      table_name: "parent_products",
      record_id: newProduct.id,
      field_name: "parent_sku",
      old_value: null,
      new_value: parent_sku,
      changed_by: user?.id,
      change_type: "create",
    });

    return { success: true, message: "새 제품 분류가 추가되었습니다." };
  }

  // CSV 업로드 (Upsert)
  if (intent === "csv_upload") {
    const csvData = parseFormDataJson<any[]>(formData, "csvData", []);

    let successCount = 0;
    let errorCount = 0;

    for (const row of csvData) {
      if (!row.parent_sku) continue;

      const productData = {
        parent_sku: row.parent_sku,
        product_name: row.product_name || null,
        category: row.category || null,
        subcategory: row.subcategory || null,
        description: row.description || null,
        thumbnail_url: row.thumbnail_url || null,
        is_active: row.is_active === "true" || row.is_active === true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("parent_products")
        .upsert(productData, { onConflict: "parent_sku" });

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    await supabase.from("product_change_logs").insert({
      table_name: "parent_products",
      record_id: "00000000-0000-0000-0000-000000000000",
      field_name: "csv_upload",
      old_value: null,
      new_value: `${successCount} rows uploaded`,
      changed_by: user?.id,
      change_type: "bulk_update",
    });

    return {
      success: true,
      message: `CSV 업로드 완료: ${successCount}개 성공, ${errorCount}개 실패`,
    };
  }

  return { success: false, error: "Unknown intent" };
}

// CSV 다운로드 함수
function downloadCSV(items: any[], filename: string) {
  const headers = [
    "parent_sku",
    "product_name",
    "category",
    "subcategory",
    "description",
    "thumbnail_url",
    "is_active",
  ];

  const csvContent = [
    headers.join(","),
    ...items.map((p) =>
      headers
        .map((h) => {
          const value = p[h];
          if (value === null || value === undefined) return "";
          const str = String(value);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// CSV 파싱 함수
function parseCSV(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/^"|"$/g, "") || "";
    });
    rows.push(row);
  }

  return rows;
}

export default function ParentProducts({ loaderData }: Route.ComponentProps) {
  const {
    parentProducts,
    productsByParent,
    categories,
    subcategories,
    search,
    category,
    sortBy,
    sortOrder,
    groupBy,
    error,
  } = loaderData;

  const [searchInput, setSearchInput] = useState(search);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkChanges, setBulkChanges] = useState<any>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [currentGroupBy, setCurrentGroupBy] = useState(groupBy);

  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setMessage(`✅ ${fetcher.data.message}`);
        setEditingId(null);
        setSelectedIds(new Set());
        setShowAddDialog(false);
        setShowBulkDialog(false);
        revalidator.revalidate();
      } else {
        setMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setMessage(null), 5000);
    }
  }, [fetcher.data, fetcher.state]);

  // URL 생성 헬퍼
  const buildUrl = (overrides: Record<string, string | null> = {}) => {
    const params = new URLSearchParams();
    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newCategory = overrides.category !== undefined ? overrides.category : category;
    const newSortBy = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const newSortOrder = overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;
    const newGroupBy = overrides.groupBy !== undefined ? overrides.groupBy : currentGroupBy;

    if (newSearch) params.set("search", newSearch);
    if (newCategory) params.set("category", newCategory);
    if (newSortBy && newSortBy !== "product_name") params.set("sortBy", newSortBy);
    if (newSortOrder && newSortOrder !== "asc") params.set("sortOrder", newSortOrder);
    if (newGroupBy) params.set("groupBy", newGroupBy);

    const queryString = params.toString();
    return `/dashboard/parent-products${queryString ? `?${queryString}` : ""}`;
  };

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    window.location.href = buildUrl({ sortBy: column, sortOrder: newOrder });
  };

  const handleGroupBy = (value: string) => {
    setCurrentGroupBy(value === "none" ? "" : value);
    window.location.href = buildUrl({ groupBy: value === "none" ? null : value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchInput || null });
  };

  const handleFilterChange = (value: string) => {
    window.location.href = buildUrl({ category: value === "all" ? null : value });
  };

  const handleReset = () => {
    window.location.href = "/dashboard/parent-products";
  };

  const toggleRow = (parentSku: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(parentSku)) {
      newExpanded.delete(parentSku);
    } else {
      newExpanded.add(parentSku);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === parentProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parentProducts.map((p: any) => p.id)));
    }
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditData({
      product_name: product.product_name || "",
      parent_sku: product.parent_sku || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      description: product.description || "",
      thumbnail_url: product.thumbnail_url || "",
      is_active: product.is_active ?? true,
    });
  };

  const saveEdit = () => {
    setPendingAction(() => () => {
      fetcher.submit(
        {
          intent: "update",
          id: editingId!,
          changes: JSON.stringify(editData),
        },
        { method: "POST" }
      );
    });
    setShowConfirmDialog(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setPendingAction(() => () => {
      fetcher.submit(formData, { method: "POST" });
    });
    setShowConfirmDialog(true);
  };

  const handleBulkUpdate = () => {
    // 커스텀 입력값 처리
    const finalChanges: Record<string, any> = {};

    // 카테고리 처리
    if (bulkChanges.category === "__custom__" && bulkChanges._customCategory) {
      finalChanges.category = bulkChanges._customCategory;
    } else if (bulkChanges.category && bulkChanges.category !== "__custom__") {
      finalChanges.category = bulkChanges.category;
    }

    // 서브카테고리 처리
    if (bulkChanges.subcategory === "__custom__" && bulkChanges._customSubcategory) {
      finalChanges.subcategory = bulkChanges._customSubcategory;
    } else if (bulkChanges.subcategory && bulkChanges.subcategory !== "__custom__") {
      finalChanges.subcategory = bulkChanges.subcategory;
    }

    // 나머지 필드 처리
    if (bulkChanges.thumbnail_url !== undefined) finalChanges.thumbnail_url = bulkChanges.thumbnail_url;
    if (bulkChanges.description !== undefined) finalChanges.description = bulkChanges.description;
    if (bulkChanges.is_active !== undefined) finalChanges.is_active = bulkChanges.is_active;

    setPendingAction(() => () => {
      fetcher.submit(
        {
          intent: "bulk_update",
          ids: JSON.stringify(Array.from(selectedIds)),
          changes: JSON.stringify(finalChanges),
        },
        { method: "POST" }
      );
    });
    setShowConfirmDialog(true);
  };

  const handleCSVDownload = () => {
    downloadCSV(parentProducts, `parent_products_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setPendingAction(() => () => {
        fetcher.submit(
          { intent: "csv_upload", csvData: JSON.stringify(data) },
          { method: "POST" }
        );
      });
      setShowConfirmDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmAction = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const hasActiveFilters = search || category;

  // 정렬 아이콘
  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDownIcon className="h-3 w-3 text-gray-400" />;
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="h-3 w-3 text-blue-600" />
    ) : (
      <ChevronDownIcon className="h-3 w-3 text-blue-600" />
    );
  };

  // 그룹핑된 데이터
  const groupedProducts = currentGroupBy
    ? parentProducts.reduce((acc: Record<string, any[]>, product: any) => {
        const key = product[currentGroupBy] || "미지정";
        if (!acc[key]) acc[key] = [];
        acc[key].push(product);
        return acc;
      }, {})
    : { 전체: parentProducts };

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

      {/* 확인 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>변경 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 변경하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 새 분류 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>새 제품 분류 추가</DialogTitle>
            <DialogDescription>
              새로운 제품 분류를 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <input type="hidden" name="intent" value="create" />
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="parent_sku">Parent SKU *</Label>
                <Input id="parent_sku" name="parent_sku" required placeholder="예: ABC001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_name">제품명</Label>
                <Input id="product_name" name="product_name" placeholder="예: ABC 침대" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리</Label>
                  <Input id="category" name="category" placeholder="예: 침대" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">서브카테고리</Label>
                  <Input id="subcategory" name="subcategory" placeholder="예: 프레임" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">썸네일 URL</Label>
                <Input id="thumbnail_url" name="thumbnail_url" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 일괄 변경 다이얼로그 */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>일괄 변경 ({selectedIds.size}개 선택)</DialogTitle>
            <DialogDescription>
              변경할 필드만 입력하세요. 빈 필드는 변경되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={bulkChanges.category === undefined ? "__none__" : (bulkChanges.category === "__custom__" ? "__custom__" : bulkChanges.category)}
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setBulkChanges({ ...bulkChanges, category: undefined, _customCategory: undefined });
                    } else if (v === "__custom__") {
                      setBulkChanges({ ...bulkChanges, category: "__custom__", _customCategory: "" });
                    } else {
                      setBulkChanges({ ...bulkChanges, category: v, _customCategory: undefined });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="변경 안함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">변경 안함</SelectItem>
                    {categories.map((c: string) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ 새로 입력</SelectItem>
                  </SelectContent>
                </Select>
                {bulkChanges.category === "__custom__" && (
                  <Input
                    value={bulkChanges._customCategory || ""}
                    onChange={(e) => setBulkChanges({ ...bulkChanges, _customCategory: e.target.value })}
                    placeholder="새 카테고리 입력"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>서브카테고리</Label>
                <Select
                  value={bulkChanges.subcategory === undefined ? "__none__" : (bulkChanges.subcategory === "__custom__" ? "__custom__" : bulkChanges.subcategory)}
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setBulkChanges({ ...bulkChanges, subcategory: undefined, _customSubcategory: undefined });
                    } else if (v === "__custom__") {
                      setBulkChanges({ ...bulkChanges, subcategory: "__custom__", _customSubcategory: "" });
                    } else {
                      setBulkChanges({ ...bulkChanges, subcategory: v, _customSubcategory: undefined });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="변경 안함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">변경 안함</SelectItem>
                    {subcategories.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ 새로 입력</SelectItem>
                  </SelectContent>
                </Select>
                {bulkChanges.subcategory === "__custom__" && (
                  <Input
                    value={bulkChanges._customSubcategory || ""}
                    onChange={(e) => setBulkChanges({ ...bulkChanges, _customSubcategory: e.target.value })}
                    placeholder="새 서브카테고리 입력"
                    className="mt-2"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>썸네일 URL</Label>
              <Input
                value={bulkChanges.thumbnail_url || ""}
                onChange={(e) => setBulkChanges({ ...bulkChanges, thumbnail_url: e.target.value || undefined })}
                placeholder="변경 안함"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={bulkChanges.description || ""}
                onChange={(e) => setBulkChanges({ ...bulkChanges, description: e.target.value || undefined })}
                placeholder="변경 안함"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>활성 상태</Label>
              <Select
                value={bulkChanges.is_active === undefined ? "__none__" : String(bulkChanges.is_active)}
                onValueChange={(v) =>
                  setBulkChanges({ ...bulkChanges, is_active: v === "__none__" ? undefined : v === "true" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="변경 안함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">변경 안함</SelectItem>
                  <SelectItem value="true">활성</SelectItem>
                  <SelectItem value="false">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkDialog(false); setBulkChanges({}); }}>
              취소
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={isSubmitting || (() => {
                const hasCategory = (bulkChanges.category && bulkChanges.category !== "__custom__") ||
                                   (bulkChanges.category === "__custom__" && bulkChanges._customCategory);
                const hasSubcategory = (bulkChanges.subcategory && bulkChanges.subcategory !== "__custom__") ||
                                       (bulkChanges.subcategory === "__custom__" && bulkChanges._customSubcategory);
                const hasOther = bulkChanges.thumbnail_url !== undefined ||
                                 bulkChanges.description !== undefined ||
                                 bulkChanges.is_active !== undefined;
                return !hasCategory && !hasSubcategory && !hasOther;
              })()}
            >
              {isSubmitting ? "처리 중..." : "일괄 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderIcon className="h-6 w-6" />
            제품 분류
          </h1>
          <p className="text-gray-500">
            등록된 제품 분류 ({parentProducts.length}개)
            {selectedIds.size > 0 && ` · ${selectedIds.size}개 선택됨`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-4 w-4 mr-1" />
            CSV 업로드
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSVDownload}>
            <DownloadIcon className="h-4 w-4 mr-1" />
            CSV 다운로드
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            분류 추가
          </Button>
        </div>
      </div>

      {/* 선택된 항목 일괄 처리 */}
      {selectedIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-blue-700 font-medium">{selectedIds.size}개 선택됨</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                선택 해제
              </Button>
              <Button size="sm" onClick={() => setShowBulkDialog(true)}>
                일괄 변경
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검색 & 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="SKU 또는 제품명으로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>

          <div className="flex flex-wrap gap-3 items-center">
            <FilterIcon className="h-4 w-4 text-gray-400" />

            <Select value={category || "all"} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {categories.map((c: string) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="border-l pl-3 ml-2">
              <Select value={currentGroupBy || "none"} onValueChange={handleGroupBy}>
                <SelectTrigger className="w-[140px]">
                  <GroupIcon className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="그룹" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">그룹 없음</SelectItem>
                  <SelectItem value="category">카테고리별</SelectItem>
                  <SelectItem value="subcategory">서브카테고리별</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-3 py-2.5 w-10">
                    <Checkbox
                      checked={selectedIds.size === parentProducts.length && parentProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5 w-12">이미지</th>
                  <th
                    className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("parent_sku")}
                  >
                    <div className="flex items-center gap-1">
                      SKU <SortIcon column="parent_sku" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("product_name")}
                  >
                    <div className="flex items-center gap-1">
                      제품명 <SortIcon column="product_name" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-1">
                      카테고리 <SortIcon column="category" />
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    서브카테고리
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">
                    하위제품
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-3 py-2.5 w-20">액션</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedProducts).map(([groupKey, groupItems]: [string, any[]]) => (
                  <>
                    {currentGroupBy && (
                      <tr key={`group-${groupKey}`} className="bg-gray-100">
                        <td colSpan={9} className="px-4 py-2 font-semibold text-gray-700">
                          {groupKey} ({groupItems.length}개)
                        </td>
                      </tr>
                    )}
                    {groupItems.map((product: any) => {
                      const isEditing = editingId === product.id;
                      const isExpanded = expandedRows.has(product.parent_sku);
                      const childProducts = productsByParent[product.parent_sku] || [];

                      return (
                        <>
                          <tr
                            key={product.id}
                            className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                              isEditing ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <Checkbox
                                checked={selectedIds.has(product.id)}
                                onCheckedChange={() => toggleSelect(product.id)}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <Input
                                  value={editData.thumbnail_url}
                                  onChange={(e) =>
                                    setEditData({ ...editData, thumbnail_url: e.target.value })
                                  }
                                  placeholder="URL"
                                  className="h-8 text-xs w-20"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                  {product.thumbnail_url ? (
                                    <img
                                      src={product.thumbnail_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => toggleRow(product.parent_sku)}
                              >
                                {childProducts.length > 0 ? (
                                  isExpanded ? (
                                    <ChevronDownIcon className="h-4 w-4" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4" />
                                  )
                                ) : (
                                  <span className="w-4" />
                                )}
                                {isEditing ? (
                                  <Input
                                    value={editData.parent_sku}
                                    onChange={(e) =>
                                      setEditData({ ...editData, parent_sku: e.target.value })
                                    }
                                    className="h-8 text-xs w-24"
                                  />
                                ) : (
                                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                    {product.parent_sku}
                                  </code>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <Input
                                  value={editData.product_name}
                                  onChange={(e) =>
                                    setEditData({ ...editData, product_name: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                />
                              ) : (
                                <span className="text-sm font-medium">{product.product_name || "-"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <Input
                                  value={editData.category}
                                  onChange={(e) =>
                                    setEditData({ ...editData, category: e.target.value })
                                  }
                                  className="h-8 text-sm w-24"
                                />
                              ) : product.category ? (
                                <Badge variant="outline">{product.category}</Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <Input
                                  value={editData.subcategory}
                                  onChange={(e) =>
                                    setEditData({ ...editData, subcategory: e.target.value })
                                  }
                                  className="h-8 text-sm w-24"
                                />
                              ) : product.subcategory ? (
                                <Badge variant="secondary" className="text-xs">
                                  {product.subcategory}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Badge variant="outline" className="text-xs">
                                {childProducts.length}개
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isEditing ? (
                                <Checkbox
                                  checked={editData.is_active}
                                  onCheckedChange={(checked) =>
                                    setEditData({ ...editData, is_active: checked })
                                  }
                                />
                              ) : (
                                <Badge
                                  variant={product.is_active ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {product.is_active ? "활성" : "비활성"}
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={saveEdit}
                                  >
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={cancelEdit}
                                  >
                                    <XIcon className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => startEdit(product)}
                                >
                                  <PencilIcon className="h-4 w-4 text-gray-500" />
                                </Button>
                              )}
                            </td>
                          </tr>
                          {/* 하위 제품 목록 (색상/사이즈/썸네일 표시) */}
                          {isExpanded && childProducts.length > 0 && (
                            <tr key={`${product.id}-children`}>
                              <td colSpan={9} className="px-0 py-0 bg-gray-50/50">
                                <div className="px-6 py-3 ml-8 border-l-2 border-gray-200">
                                  <div className="text-xs text-gray-500 mb-2 font-medium">
                                    하위 제품 ({childProducts.length}개)
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                    {childProducts.map((child: any) => {
                                      const bgColor = child.color_kr ? getColorCode(child.color_kr) : null;
                                      const textColor = bgColor ? getContrastColor(bgColor) : null;
                                      const needsBorder = bgColor && (bgColor === "#FFFFFF" || bgColor === "#FFFFF0" || bgColor === "#FFFDD0");
                                      
                                      return (
                                        <div
                                          key={child.sku}
                                          className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
                                        >
                                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {child.thumbnail_url ? (
                                              <img
                                                src={child.thumbnail_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <ImageIcon className="w-4 h-4 text-gray-400" />
                                            )}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <code className="text-xs text-gray-600 truncate">
                                              {child.sku}
                                            </code>
                                            <div className="flex gap-1 flex-wrap mt-0.5">
                                              {child.color_kr && (
                                                bgColor ? (
                                                  <span 
                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${needsBorder ? 'border border-gray-300' : ''}`}
                                                    style={{ backgroundColor: bgColor, color: textColor! }}
                                                  >
                                                    {child.color_kr}
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-600 rounded">
                                                    {child.color_kr}
                                                  </span>
                                                )
                                              )}
                                              {child.sku_6_size && (
                                                <span className="text-[10px] px-1 py-0.5 bg-purple-50 text-purple-600 rounded">
                                                  {child.sku_6_size}
                                                </span>
                                              )}
                                              {!child.is_active && (
                                                <span className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded">
                                                  비활성
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </>
                ))}
                {parentProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      {hasActiveFilters ? "검색 결과가 없습니다" : "등록된 제품 분류가 없습니다"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
