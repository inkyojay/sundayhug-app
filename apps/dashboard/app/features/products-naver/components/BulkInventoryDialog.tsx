/**
 * 재고 일괄 수정 다이얼로그
 *
 * 선택된 상품들의 재고를 일괄 수정
 * - 일괄 적용: 모든 상품에 동일한 재고 설정
 * - 증감 적용: 현재 재고에서 증감
 * - 창고 재고 비율 할당: 창고 재고의 N%를 네이버 재고로 설정 (옵션별 체크박스 선택 가능)
 */

import { useState, useMemo } from "react";
import { Warehouse } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import { Badge } from "~/core/components/ui/badge";

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

interface BulkInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: NaverProduct[];
  warehouseStockMap: Record<string, number>;
  onConfirm: (
    updates: { originProductNo: number; stockQuantity: number }[]
  ) => Promise<void>;
  onConfirmOptions?: (
    updates: { originProductNo: number; optionCombinationId: number; stockQuantity: number }[]
  ) => Promise<void>;
}

type UpdateMode = "set" | "increase" | "decrease" | "warehouse_percent";

export function BulkInventoryDialog({
  open,
  onOpenChange,
  selectedProducts,
  warehouseStockMap,
  onConfirm,
  onConfirmOptions,
}: BulkInventoryDialogProps) {
  const [mode, setMode] = useState<UpdateMode>("set");
  const [quantity, setQuantity] = useState("");
  const [percent, setPercent] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  // 창고 재고 비율 모드에서 선택된 옵션들
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());

  // 옵션별 창고 재고 매핑 계산
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

    selectedProducts.forEach((product) => {
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
      } else {
        // 옵션이 없는 상품
        data.push({
          originProductNo: product.origin_product_no,
          productName: product.product_name,
          optionCombinationId: 0,
          optionName: "-",
          sku: null,
          currentStock: product.stock_quantity,
          warehouseStock: null,
        });
      }
    });

    return data;
  }, [selectedProducts, warehouseStockMap]);

  // 창고 재고가 있는 옵션
  const optionsWithWarehouse = useMemo(() => {
    return optionWarehouseData.filter(
      (d) => d.warehouseStock !== null && d.warehouseStock !== undefined
    );
  }, [optionWarehouseData]);

  // 창고 재고 비율 모드에서 선택된 옵션들 (초기화: 창고 재고가 있는 모든 옵션)
  const initializeSelectedOptions = () => {
    const ids = new Set<string>();
    optionsWithWarehouse.forEach((opt) => {
      ids.add(`${opt.originProductNo}-${opt.optionCombinationId}`);
    });
    setSelectedOptionIds(ids);
  };

  // 옵션 체크박스 토글
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

  // 전체 선택/해제
  const toggleAllOptions = (checked: boolean) => {
    if (checked) {
      initializeSelectedOptions();
    } else {
      setSelectedOptionIds(new Set());
    }
  };

  // 선택된 옵션 중 창고 재고가 있는 것들
  const selectedOptionsWithWarehouse = useMemo(() => {
    return optionsWithWarehouse.filter((opt) =>
      selectedOptionIds.has(`${opt.originProductNo}-${opt.optionCombinationId}`)
    );
  }, [optionsWithWarehouse, selectedOptionIds]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (mode === "warehouse_percent") {
        // 창고 재고 비율 할당 모드 - 선택된 옵션만 업데이트
        const pct = parseFloat(percent);
        if (isNaN(pct) || pct < 0 || pct > 100) return;

        // 옵션별 업데이트 (선택된 옵션만)
        if (onConfirmOptions && selectedOptionsWithWarehouse.length > 0) {
          const updates = selectedOptionsWithWarehouse
            .filter((d) => d.optionCombinationId !== 0) // 옵션이 있는 경우만
            .map((d) => ({
              originProductNo: d.originProductNo,
              optionCombinationId: d.optionCombinationId,
              stockQuantity: Math.floor((d.warehouseStock ?? 0) * (pct / 100)),
            }));

          await onConfirmOptions(updates);
        } else {
          // 옵션이 없는 상품만 있는 경우 (선택된 것만)
          const updates = selectedOptionsWithWarehouse
            .filter((d) => d.optionCombinationId === 0)
            .map((d) => ({
              originProductNo: d.originProductNo,
              stockQuantity: Math.floor((d.warehouseStock ?? 0) * (pct / 100)),
            }));

          await onConfirm(updates);
        }
      } else {
        // 기존 모드들 (set, increase, decrease)
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 0) return;

        const updates = selectedProducts.map((product) => {
          let newQuantity: number;
          switch (mode) {
            case "set":
              newQuantity = qty;
              break;
            case "increase":
              newQuantity = product.stock_quantity + qty;
              break;
            case "decrease":
              newQuantity = Math.max(0, product.stock_quantity - qty);
              break;
            default:
              newQuantity = qty;
          }
          return {
            originProductNo: product.origin_product_no,
            stockQuantity: newQuantity,
          };
        });

        await onConfirm(updates);
      }

      onOpenChange(false);
      setQuantity("");
      setPercent("100");
      setMode("set");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setQuantity("");
      setPercent("100");
      setMode("set");
      setSelectedOptionIds(new Set());
    } else {
      // 모달이 열릴 때 창고 재고가 있는 모든 옵션을 선택 상태로 초기화
      initializeSelectedOptions();
    }
    onOpenChange(open);
  };

  // 적용 후 예상 재고 계산
  const getPreviewQuantity = (currentQuantity: number, warehouseStock?: number | null): number => {
    if (mode === "warehouse_percent") {
      const pct = parseFloat(percent);
      if (isNaN(pct) || warehouseStock === null || warehouseStock === undefined) return currentQuantity;
      return Math.floor(warehouseStock * (pct / 100));
    }

    const qty = parseInt(quantity);
    if (isNaN(qty)) return currentQuantity;

    switch (mode) {
      case "set":
        return qty;
      case "increase":
        return currentQuantity + qty;
      case "decrease":
        return Math.max(0, currentQuantity - qty);
      default:
        return currentQuantity;
    }
  };

  const isValid =
    mode === "warehouse_percent"
      ? percent !== "" && parseFloat(percent) >= 0 && parseFloat(percent) <= 100 && selectedOptionsWithWarehouse.length > 0
      : quantity !== "" && parseInt(quantity) >= 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>재고 일괄 수정</DialogTitle>
          <DialogDescription>
            {selectedProducts.length}개 상품의 재고를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* 수정 방식 선택 */}
          <div className="space-y-3">
            <Label>수정 방식</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as UpdateMode)}
              className="grid grid-cols-2 gap-3"
            >
              <div
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => setMode("set")}
              >
                <RadioGroupItem value="set" id="set" />
                <Label htmlFor="set" className="cursor-pointer">
                  <div className="font-medium">일괄 설정</div>
                  <div className="text-xs text-muted-foreground">
                    모든 상품을 동일 수량으로
                  </div>
                </Label>
              </div>
              <div
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => setMode("increase")}
              >
                <RadioGroupItem value="increase" id="increase" />
                <Label htmlFor="increase" className="cursor-pointer">
                  <div className="font-medium">증가</div>
                  <div className="text-xs text-muted-foreground">
                    현재 수량에 추가
                  </div>
                </Label>
              </div>
              <div
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => setMode("decrease")}
              >
                <RadioGroupItem value="decrease" id="decrease" />
                <Label htmlFor="decrease" className="cursor-pointer">
                  <div className="font-medium">감소</div>
                  <div className="text-xs text-muted-foreground">
                    현재 수량에서 차감
                  </div>
                </Label>
              </div>
              <div
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${
                  optionsWithWarehouse.length > 0
                    ? "hover:bg-muted/50"
                    : "opacity-50 cursor-not-allowed"
                } ${mode === "warehouse_percent" ? "border-blue-500 bg-blue-50" : ""}`}
                onClick={() => optionsWithWarehouse.length > 0 && setMode("warehouse_percent")}
              >
                <RadioGroupItem
                  value="warehouse_percent"
                  id="warehouse_percent"
                  disabled={optionsWithWarehouse.length === 0}
                />
                <Label
                  htmlFor="warehouse_percent"
                  className={`cursor-pointer ${optionsWithWarehouse.length === 0 ? "opacity-50" : ""}`}
                >
                  <div className="font-medium flex items-center gap-1">
                    <Warehouse className="h-4 w-4" />
                    창고 재고 비율
                  </div>
                  <div className="text-xs text-muted-foreground">
                    창고 재고의 N%를 할당
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 입력 필드 */}
          {mode === "warehouse_percent" ? (
            <div className="space-y-2">
              <Label htmlFor="percent">할당 비율 (%)</Label>
              <div className="relative">
                <Input
                  id="percent"
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
                창고 재고가 매핑된 {optionsWithWarehouse.length}개 옵션에 적용됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {mode === "set" ? "설정할 재고 수량" : "변경할 수량"}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="수량 입력"
              />
            </div>
          )}

          {/* 미리보기 */}
          {(mode === "warehouse_percent" || isValid) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">
                  {mode === "warehouse_percent" ? "옵션 선택 및 미리보기" : "변경 미리보기"}
                </Label>
                {mode === "warehouse_percent" && optionsWithWarehouse.length > 0 && (
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
                )}
              </div>
              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {mode === "warehouse_percent" && (
                        <th className="p-2 w-10">
                          <Checkbox
                            checked={optionsWithWarehouse.length > 0 && selectedOptionIds.size >= optionsWithWarehouse.length}
                            onCheckedChange={(checked) => toggleAllOptions(!!checked)}
                          />
                        </th>
                      )}
                      <th className="text-left p-2 font-medium">상품/옵션</th>
                      {mode === "warehouse_percent" && (
                        <th className="text-right p-2 font-medium w-20">창고</th>
                      )}
                      <th className="text-right p-2 font-medium w-20">현재</th>
                      <th className="text-right p-2 font-medium w-20">변경 후</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mode === "warehouse_percent" ? (
                      // 창고 비율 모드: 옵션별로 표시 (체크박스 포함)
                      optionWarehouseData.map((item, idx) => {
                        const newQty = getPreviewQuantity(item.currentStock, item.warehouseStock);
                        const hasWarehouse = item.warehouseStock !== null && item.warehouseStock !== undefined;
                        const isSelected = selectedOptionIds.has(`${item.originProductNo}-${item.optionCombinationId}`);
                        return (
                          <tr
                            key={`${item.originProductNo}-${item.optionCombinationId}-${idx}`}
                            className={`border-t ${isSelected ? "bg-blue-50" : ""} ${hasWarehouse ? "cursor-pointer hover:bg-muted/50" : "opacity-50"}`}
                            onClick={() => hasWarehouse && toggleOption(item.originProductNo, item.optionCombinationId)}
                          >
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                disabled={!hasWarehouse}
                                onCheckedChange={() => hasWarehouse && toggleOption(item.originProductNo, item.optionCombinationId)}
                              />
                            </td>
                            <td className="p-2">
                              <div className="truncate max-w-[250px] font-medium">
                                {item.productName}
                              </div>
                              {item.optionName !== "-" && (
                                <div className="text-xs text-muted-foreground">
                                  {item.optionName}
                                  {item.sku && (
                                    <span className="ml-1 font-mono text-blue-600">
                                      ({item.sku})
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              {hasWarehouse ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  {item.warehouseStock}개
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-muted-foreground">
                              {item.currentStock}개
                            </td>
                            <td className="p-2 text-right font-medium">
                              {hasWarehouse && isSelected ? (
                                <span className={newQty !== item.currentStock ? "text-blue-600" : ""}>
                                  {newQty}개
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      // 기존 모드: 상품별로 표시
                      selectedProducts.slice(0, 5).map((product) => (
                        <tr key={product.origin_product_no} className="border-t">
                          <td className="p-2 truncate max-w-[200px]">
                            {product.product_name}
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {product.stock_quantity}개
                          </td>
                          <td className="p-2 text-right font-medium">
                            {getPreviewQuantity(product.stock_quantity)}개
                          </td>
                        </tr>
                      ))
                    )}
                    {mode !== "warehouse_percent" && selectedProducts.length > 5 && (
                      <tr className="border-t">
                        <td colSpan={3} className="p-2 text-center text-muted-foreground">
                          외 {selectedProducts.length - 5}개 상품...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {mode === "warehouse_percent" && (
                <div className="text-xs space-y-1">
                  {optionsWithWarehouse.length < optionWarehouseData.length && (
                    <p className="text-amber-600">
                      ⚠️ {optionWarehouseData.length - optionsWithWarehouse.length}개 옵션은 창고 재고 매핑이 없어 선택할 수 없습니다.
                    </p>
                  )}
                  {selectedOptionsWithWarehouse.length > 0 && (
                    <p className="text-blue-600">
                      ✓ {selectedOptionsWithWarehouse.length}개 옵션의 재고가 변경됩니다.
                    </p>
                  )}
                </div>
              )}
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
              : mode === "warehouse_percent"
              ? `${selectedOptionsWithWarehouse.length}개 옵션 재고 할당`
              : `${selectedProducts.length}개 상품 재고 수정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
