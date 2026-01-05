/**
 * 제품 선택 Sheet 컴포넌트
 */

import { SearchIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "~/core/components/ui/button";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/core/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { type Product, formatCurrency } from "../lib/purchase-orders.shared";

interface ProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSelectProducts: (products: Product[]) => void;
  onAddSingleProduct: (product: Product) => void;
}

export function ProductSelector({
  open,
  onOpenChange,
  products,
  onSelectProducts,
  onAddSingleProduct,
}: ProductSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // 필터 옵션 추출
  const filterOptions = useMemo(() => {
    const colors = Array.from(
      new Set(products.map((p) => p.color_kr).filter(Boolean))
    ).sort() as string[];
    const sizes = Array.from(
      new Set(products.map((p) => p.sku_6_size).filter(Boolean))
    ).sort() as string[];
    const categories = Array.from(
      new Set(products.map((p) => p.parent_product?.product_name).filter(Boolean))
    ).sort() as string[];

    return { colors, sizes, categories };
  }, [products]);

  // 필터링된 제품 목록
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.product_name?.toLowerCase().includes(search.toLowerCase());
      const matchesColor = !colorFilter || colorFilter === "__all__" || p.color_kr === colorFilter;
      const matchesSize = !sizeFilter || sizeFilter === "__all__" || p.sku_6_size === sizeFilter;
      const matchesCategory =
        !categoryFilter ||
        categoryFilter === "__all__" ||
        p.parent_product?.product_name === categoryFilter;
      return matchesSearch && matchesColor && matchesSize && matchesCategory;
    });
  }, [products, search, colorFilter, sizeFilter, categoryFilter]);

  const toggleSelection = (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleAddSelected = () => {
    const selectedProducts = filteredProducts.filter((p) => selectedIds.has(p.id));
    onSelectProducts(selectedProducts);
    handleClose();
  };

  const handleAddSingle = (product: Product) => {
    onAddSingleProduct(product);
    handleClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearch("");
    setColorFilter("");
    setSizeFilter("");
    setCategoryFilter("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>제품 선택</SheetTitle>
          <SheetDescription>
            발주할 제품을 선택해주세요. 여러 개 선택 후 한번에 추가할 수 있습니다.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6">
          {/* 검색 및 필터 */}
          <div className="space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="SKU 또는 제품명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="분류 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">분류 전체</SelectItem>
                  {filterOptions.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={colorFilter} onValueChange={setColorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="색상 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">색상 전체</SelectItem>
                  {filterOptions.colors.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="사이즈 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">사이즈 전체</SelectItem>
                  {filterOptions.sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between p-2 bg-accent rounded-lg">
                <span className="text-sm font-medium">{selectedIds.size}개 선택됨</span>
                <Button onClick={handleAddSelected} size="sm">
                  선택한 제품 추가 ({selectedIds.size})
                </Button>
              </div>
            )}
          </div>

          {/* 제품 목록 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          filteredProducts.length > 0 &&
                          filteredProducts.every((p) => selectedIds.has(p.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[80px]">추가</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>색상</TableHead>
                    <TableHead>사이즈</TableHead>
                    <TableHead className="text-right">원가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.slice(0, 200).map((product) => (
                    <TableRow
                      key={product.id}
                      className={selectedIds.has(product.id) ? "bg-accent" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelection(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleAddSingle(product)}>
                          추가
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{product.product_name || "-"}</TableCell>
                      <TableCell>{product.parent_product?.product_name || "-"}</TableCell>
                      <TableCell>{product.color_kr || "-"}</TableCell>
                      <TableCell>{product.sku_6_size || "-"}</TableCell>
                      <TableCell className="text-right">
                        {product.cost_price ? formatCurrency(product.cost_price) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6">
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={handleAddSelected}>선택한 제품 추가 ({selectedIds.size})</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
