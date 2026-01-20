/**
 * 전체 재고 할당 다이얼로그
 *
 * 모든 상품에 대해 창고 재고 비율로 네이버 재고를 일괄 할당
 * - 상단 통계 영역에서 호출
 * - 선택 없이 전체 상품 대상
 */

import { useState, useMemo, useEffect } from "react";
import { Warehouse, AlertTriangle } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Badge } from "~/core/components/ui/badge";
import {
  Alert,
  AlertDescription,
} from "~/core/components/ui/alert";

interface NaverProductOption {
  option_combination_id: number;
  option_name1: string | null;
  option_value1: string | null;
  option_name2: string | null;
  option_value2: string | null;
  stock_quantity: number;
  internal_sku: string | null;
  seller_management_code: string | null;
}

interface NaverProduct {
  origin_product_no: number;
  product_name: string;
  stock_quantity: number;
  options?: NaverProductOption[];
}

interface GlobalInventoryAllocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allProducts: NaverProduct[];
  warehouseStockMap: Record<string, number>;
  onConfirmOptions: (
    updates: { originProductNo: number; optionCombinationId: number; stockQuantity: number }[]
  ) => Promise<void>;
}

export function GlobalInventoryAllocDialog({
  open,
  onOpenChange,
  allProducts,
  warehouseStockMap,
  onConfirmOptions,
}: GlobalInventoryAllocDialogProps) {
  const [percent, setPercent] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());

  // 모든 옵션 데이터 계산
  const optionWarehouseData = useMemo(() => {
    const data: {
      originProductNo: number;
      productName: string;
      optionCombinationId: number;
      optionName: string;
      sku: string | null;
      currentStock: number;
      warehouseStock: number | null;
    }[] = [];

    allProducts.forEach((product) => {
      if (product.options && product.options.length > 0) {
        product.options.forEach((opt) => {
          const sku = opt.internal_sku || opt.seller_management_code;
          const warehouseStock = sku ? warehouseStockMap[sku] : null;

          let optionName = "";
          if (opt.option_value1) {
            optionName = opt.option_value1;
            if (opt.option_value2) {
              optionName += ` / ${opt.option_value2}`;
            }
          }

          data.push({
            originProductNo: product.origin_product_no,
            productName: product.product_name,
            optionCombinationId: opt.option_combination_id,
            optionName: optionName || "기본",
            sku,
            currentStock: opt.stock_quantity,
            warehouseStock: warehouseStock ?? null,
          });
        });
      }
    });

    return data;
  }, [allProducts, warehouseStockMap]);

  // 창고 재고가 있는 옵션
  const optionsWithWarehouse = useMemo(() => {
    return optionWarehouseData.filter(
      (d) => d.warehouseStock !== null && d.warehouseStock !== undefined && d.optionCombinationId !== 0
    );
  }, [optionWarehouseData]);

  // 선택된 옵션
  const selectedOptionsWithWarehouse = useMemo(() => {
    return optionsWithWarehouse.filter((opt) =>
      selectedOptionIds.has(`${opt.originProductNo}-${opt.optionCombinationId}`)
    );
  }, [optionsWithWarehouse, selectedOptionIds]);

  // 모달이 열릴 때 전체 선택으로 초기화
  useEffect(() => {
    if (open) {
      const ids = new Set<string>();
      optionsWithWarehouse.forEach((opt) => {
        ids.add(`${opt.originProductNo}-${opt.optionCombinationId}`);
      });
      setSelectedOptionIds(ids);
    }
  }, [open, optionsWithWarehouse]);

  // 전체 선택/해제
  const toggleAllOptions = (checked: boolean) => {
    if (checked) {
      const ids = new Set<string>();
      optionsWithWarehouse.forEach((opt) => {
        ids.add(`${opt.originProductNo}-${opt.optionCombinationId}`);
      });
      setSelectedOptionIds(ids);
    } else {
      setSelectedOptionIds(new Set());
    }
  };

  // 옵션 토글
  const toggleOption = (originProductNo: number, optionCombinationId: number) => {
    const id = `${originProductNo}-${optionCombinationId}`;
    const newSelected = new Set(selectedOptionIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOptionIds(newSelected);
  };

  // 예상 재고 계산
  const getPreviewQuantity = (warehouseStock: number): number => {
    const pct = parseFloat(percent);
    if (isNaN(pct)) return 0;
    return Math.floor(warehouseStock * (pct / 100));
  };

  const handleConfirm = async () => {
    const pct = parseFloat(percent);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    if (selectedOptionsWithWarehouse.length === 0) return;

    setIsLoading(true);
    try {
      const updates = selectedOptionsWithWarehouse.map((d) => ({
        originProductNo: d.originProductNo,
        optionCombinationId: d.optionCombinationId,
        stockQuantity: Math.floor((d.warehouseStock ?? 0) * (pct / 100)),
      }));

      await onConfirmOptions(updates);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPercent("100");
      setSelectedOptionIds(new Set());
    }
    onOpenChange(open);
  };

  const isValid = percent !== "" && parseFloat(percent) >= 0 && parseFloat(percent) <= 100 && selectedOptionsWithWarehouse.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-green-600" />
            전체 재고 할당
          </DialogTitle>
          <DialogDescription>
            창고 재고 비율에 따라 전체 상품의 네이버 재고를 일괄 할당합니다.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            이 작업은 선택된 모든 옵션의 네이버 재고를 변경합니다. 신중하게 진행해주세요.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          {/* 할당 비율 입력 */}
          <div className="space-y-2">
            <Label htmlFor="global-percent">할당 비율 (%)</Label>
            <div className="relative max-w-xs">
              <Input
                id="global-percent"
                type="number"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                placeholder="예: 80"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              창고 재고의 {percent || 0}%가 네이버 재고로 설정됩니다.
            </p>
          </div>

          {/* 옵션 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>옵션 선택</Label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {selectedOptionsWithWarehouse.length} / {optionsWithWarehouse.length}개 선택
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllOptions(selectedOptionIds.size < optionsWithWarehouse.length)}
                >
                  {selectedOptionIds.size >= optionsWithWarehouse.length ? "전체 해제" : "전체 선택"}
                </Button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 w-10">
                      <Checkbox
                        checked={optionsWithWarehouse.length > 0 && selectedOptionIds.size >= optionsWithWarehouse.length}
                        onCheckedChange={(checked) => toggleAllOptions(!!checked)}
                      />
                    </th>
                    <th className="text-left p-2 font-medium">상품/옵션</th>
                    <th className="text-right p-2 font-medium w-24">SKU</th>
                    <th className="text-right p-2 font-medium w-20">창고</th>
                    <th className="text-right p-2 font-medium w-20">현재</th>
                    <th className="text-right p-2 font-medium w-20">변경 후</th>
                  </tr>
                </thead>
                <tbody>
                  {optionsWithWarehouse.map((item, idx) => {
                    const isSelected = selectedOptionIds.has(`${item.originProductNo}-${item.optionCombinationId}`);
                    const newQty = getPreviewQuantity(item.warehouseStock ?? 0);
                    return (
                      <tr
                        key={`${item.originProductNo}-${item.optionCombinationId}-${idx}`}
                        className={`border-t cursor-pointer ${isSelected ? "bg-blue-50" : "hover:bg-muted/50"}`}
                        onClick={() => toggleOption(item.originProductNo, item.optionCombinationId)}
                      >
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOption(item.originProductNo, item.optionCombinationId)}
                          />
                        </td>
                        <td className="p-2">
                          <div className="truncate max-w-[200px] font-medium">
                            {item.productName}
                          </div>
                          {item.optionName !== "-" && (
                            <div className="text-xs text-muted-foreground">
                              {item.optionName}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {item.sku && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.sku}
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {item.warehouseStock}개
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {item.currentStock}개
                        </td>
                        <td className="p-2 text-right font-medium">
                          {isSelected ? (
                            <span className={newQty !== item.currentStock ? "text-blue-600" : ""}>
                              {newQty}개
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {optionsWithWarehouse.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                창고 재고가 매핑된 옵션이 없습니다.
              </p>
            )}
          </div>

          {/* 요약 */}
          {selectedOptionsWithWarehouse.length > 0 && (
            <div className="text-sm p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-blue-800">
                <strong>{selectedOptionsWithWarehouse.length}개</strong> 옵션의 재고를 창고 재고의{" "}
                <strong>{percent}%</strong>로 할당합니다.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !isValid}>
            {isLoading
              ? "처리 중..."
              : `${selectedOptionsWithWarehouse.length}개 옵션 재고 할당`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
