/**
 * 공장별 제품 제조원가 관리
 */
import type { Route } from "./+types/factory-product-costs";

import {
  FactoryIcon,
  UploadIcon,
  DownloadIcon,
  SaveIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useState, useRef } from "react";
import { Link, useFetcher } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "~/core/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";

import makeServerClient from "~/core/lib/supa-client.server";

import {
  getFactory,
  getFactoryProductCosts,
  getActiveProducts,
  saveFactoryProductCost,
  deleteFactoryProductCost,
  uploadFactoryProductCostsCSV,
} from "../lib/factories.server";
import type { FactoryProductCost, FactoryProductCostFormData } from "../lib/factories.shared";
import { EMPTY_COST_FORM, costToFormData, formatCurrency } from "../lib/factories.shared";

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `제조원가 관리 - ${data?.factory?.factory_name} | Sundayhug Admin` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const factoryId = params.factoryId;

  const [factory, products, costs] = await Promise.all([
    getFactory(supabase, factoryId),
    getActiveProducts(supabase),
    getFactoryProductCosts(supabase, factoryId),
  ]);

  return { factory, products, costs };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const factoryId = params.factoryId;

  if (intent === "save") {
    const sku = formData.get("sku") as string;
    const costWithoutVat = parseFloat(formData.get("cost_without_vat") as string) || 0;
    const vatAmount = parseFloat(formData.get("vat_amount") as string) || 0;
    const productId = formData.get("product_id") as string || null;
    const notes = formData.get("notes") as string || null;

    return saveFactoryProductCost(supabase, factoryId, {
      sku,
      productId,
      costWithoutVat,
      vatAmount,
      notes,
    });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    return deleteFactoryProductCost(supabase, id);
  }

  if (intent === "upload_csv") {
    const csvData = formData.get("csv_data") as string;
    return uploadFactoryProductCostsCSV(supabase, factoryId, csvData);
  }

  return { error: "Unknown action" };
}

export default function FactoryProductCosts({ loaderData }: Route.ComponentProps) {
  const { factory, products, costs } = loaderData;
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<FactoryProductCost | null>(null);
  const [formData, setFormData] = useState<FactoryProductCostFormData>(EMPTY_COST_FORM);

  const filteredCosts = costs.filter((cost: FactoryProductCost) =>
    cost.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cost.product?.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditSheet = (cost?: FactoryProductCost) => {
    if (cost) {
      setSelectedCost(cost);
      setFormData(costToFormData(cost));
    } else {
      setSelectedCost(null);
      setFormData(EMPTY_COST_FORM);
    }
    setIsEditSheetOpen(true);
  };

  const handleSave = () => {
    const form = new FormData();
    form.append("intent", "save");
    form.append("sku", formData.sku);
    form.append("product_id", formData.product_id);
    form.append("cost_without_vat", formData.cost_without_vat);
    form.append("vat_amount", formData.vat_amount);
    form.append("notes", formData.notes);

    fetcher.submit(form, { method: "post" });
    setIsEditSheetOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("제조원가를 삭제하시겠습니까?")) {
      const form = new FormData();
      form.append("intent", "delete");
      form.append("id", id);
      fetcher.submit(form, { method: "post" });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      const form = new FormData();
      form.append("intent", "upload_csv");
      form.append("csv_data", csvData);
      fetcher.submit(form, { method: "post" });
    };
    reader.readAsText(file, "UTF-8");
  };

  const downloadCSV = () => {
    const headers = ["SKU", "제품명", "부가세 제외", "부가세", "부가세 포함"];
    const rows = costs.map((cost: FactoryProductCost) => [
      cost.sku,
      cost.product?.product_name || "",
      cost.cost_without_vat || 0,
      cost.vat_amount || 0,
      (cost.cost_without_vat || 0) + (cost.vat_amount || 0),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${factory?.factory_name}_제조원가_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/factories">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FactoryIcon className="w-6 h-6" />
              {factory?.factory_name} - 제조원가 관리
            </h1>
            <p className="text-muted-foreground">
              공장별 제품 제조원가를 관리합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadCSV}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="w-4 h-4 mr-2" />
            CSV 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => openEditSheet()}>
            <PlusIcon className="w-4 h-4 mr-2" />
            제조원가 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="SKU 또는 제품명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>제품명</TableHead>
                <TableHead className="text-right">부가세 제외</TableHead>
                <TableHead className="text-right">부가세</TableHead>
                <TableHead className="text-right">부가세 포함</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    등록된 제조원가가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCosts.map((cost: FactoryProductCost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-mono text-sm">
                      {cost.sku}
                    </TableCell>
                    <TableCell>
                      {cost.product?.product_name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cost.cost_without_vat || 0)}원
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cost.vat_amount || 0)}원
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency((cost.cost_without_vat || 0) + (cost.vat_amount || 0))}원
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditSheet(cost)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <TrashIcon className="w-4 h-4 text-destructive" />
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

      {/* 제조원가 편집 Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selectedCost ? "제조원가 수정" : "제조원가 추가"}
            </SheetTitle>
            <SheetDescription>
              제품의 제조원가를 입력해주세요.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-6">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="예: S2692A880B6F"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>제품 선택 (선택사항)</Label>
              <Select
                value={formData.product_id}
                onValueChange={(v) => setFormData({ ...formData, product_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="제품 선택" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>부가세 제외 (원)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cost_without_vat}
                  onChange={(e) => setFormData({ ...formData, cost_without_vat: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>부가세 (원)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.vat_amount}
                  onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">부가세 포함</div>
              <div className="text-lg font-bold">
                {formatCurrency(
                  (parseFloat(formData.cost_without_vat) || 0) +
                  (parseFloat(formData.vat_amount) || 0)
                )}원
              </div>
            </div>

            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <SheetFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditSheetOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!formData.sku}>
              <SaveIcon className="w-4 h-4 mr-2" />
              저장
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
