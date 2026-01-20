/**
 * 가격 일괄 변경 다이얼로그
 *
 * 선택된 상품들의 가격을 일괄 변경
 * - 즉시할인가 변경
 * - 판매가 변경
 */

import { useState } from "react";

import { Button } from "~/core/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

import type { BulkUpdateType } from "~/features/integrations/lib/naver/naver-products-types";

interface NaverProduct {
  origin_product_no: number;
  product_name: string;
  sale_price: number;
}

interface BulkPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: NaverProduct[];
  onConfirm: (
    bulkUpdateType: BulkUpdateType,
    originProductNos: number[],
    updateData: Record<string, unknown>
  ) => Promise<void>;
}

type PriceUpdateMode = "percent" | "fixed";

export function BulkPriceDialog({
  open,
  onOpenChange,
  selectedProducts,
  onConfirm,
}: BulkPriceDialogProps) {
  const [updateType, setUpdateType] = useState<"IMMEDIATE_DISCOUNT" | "SALE_PRICE">(
    "IMMEDIATE_DISCOUNT"
  );
  const [mode, setMode] = useState<PriceUpdateMode>("percent");
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setIsLoading(true);
    try {
      const originProductNos = selectedProducts.map((p) => p.origin_product_no);

      let updateData: Record<string, unknown>;

      if (updateType === "IMMEDIATE_DISCOUNT") {
        updateData = {
          immediateDiscountPolicy: {
            discountMethod: {
              value: numValue,
              unitType: mode === "percent" ? "PERCENT" : "WON",
            },
          },
        };
      } else {
        // SALE_PRICE
        updateData = {
          salePrice: numValue,
        };
      }

      await onConfirm(updateType, originProductNos, updateData);
      onOpenChange(false);
      setValue("");
      setMode("percent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setValue("");
      setMode("percent");
    }
    onOpenChange(open);
  };

  // 할인 미리보기 계산
  const getDiscountedPrice = (originalPrice: number): number => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return originalPrice;

    if (updateType === "IMMEDIATE_DISCOUNT") {
      if (mode === "percent") {
        return Math.round(originalPrice * (1 - numValue / 100));
      } else {
        return Math.max(0, originalPrice - numValue);
      }
    } else {
      return numValue;
    }
  };

  const isValid =
    value !== "" &&
    parseFloat(value) >= 0 &&
    (updateType !== "IMMEDIATE_DISCOUNT" ||
      mode !== "percent" ||
      parseFloat(value) <= 100);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>가격 일괄 변경</DialogTitle>
          <DialogDescription>
            {selectedProducts.length}개 상품의 가격을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 변경 유형 선택 */}
          <div className="space-y-3">
            <Label>변경 유형</Label>
            <RadioGroup
              value={updateType}
              onValueChange={(v) =>
                setUpdateType(v as "IMMEDIATE_DISCOUNT" | "SALE_PRICE")
              }
              className="flex gap-4"
            >
              <div
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer flex-1"
                onClick={() => setUpdateType("IMMEDIATE_DISCOUNT")}
              >
                <RadioGroupItem value="IMMEDIATE_DISCOUNT" id="discount" />
                <Label htmlFor="discount" className="cursor-pointer">
                  <div className="font-medium">즉시할인</div>
                  <div className="text-xs text-muted-foreground">
                    할인율/할인금액 적용
                  </div>
                </Label>
              </div>
              <div
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer flex-1"
                onClick={() => setUpdateType("SALE_PRICE")}
              >
                <RadioGroupItem value="SALE_PRICE" id="price" />
                <Label htmlFor="price" className="cursor-pointer">
                  <div className="font-medium">판매가 변경</div>
                  <div className="text-xs text-muted-foreground">
                    판매가 직접 설정
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 즉시할인인 경우 단위 선택 */}
          {updateType === "IMMEDIATE_DISCOUNT" && (
            <div className="space-y-2">
              <Label>할인 방식</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as PriceUpdateMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">비율 (%) - 판매가의 N% 할인</SelectItem>
                  <SelectItem value="fixed">금액 (원) - 고정 금액 할인</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 값 입력 */}
          <div className="space-y-2">
            <Label htmlFor="value">
              {updateType === "IMMEDIATE_DISCOUNT"
                ? mode === "percent"
                  ? "할인율 (%)"
                  : "할인 금액 (원)"
                : "판매가 (원)"}
            </Label>
            <div className="relative">
              <Input
                id="value"
                type="number"
                min="0"
                max={
                  updateType === "IMMEDIATE_DISCOUNT" && mode === "percent"
                    ? "100"
                    : undefined
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  updateType === "IMMEDIATE_DISCOUNT"
                    ? mode === "percent"
                      ? "예: 10"
                      : "예: 5000"
                    : "예: 29000"
                }
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {updateType === "IMMEDIATE_DISCOUNT" && mode === "percent"
                  ? "%"
                  : "원"}
              </span>
            </div>
          </div>

          {/* 미리보기 */}
          {isValid && selectedProducts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">변경 미리보기</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">상품명</th>
                      <th className="text-right p-2 font-medium w-28">현재가</th>
                      <th className="text-right p-2 font-medium w-28">변경 후</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.slice(0, 5).map((product) => (
                      <tr key={product.origin_product_no} className="border-t">
                        <td className="p-2 truncate max-w-[180px]">
                          {product.product_name}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {formatPrice(product.sale_price)}
                        </td>
                        <td className="p-2 text-right font-medium text-green-600">
                          {formatPrice(getDiscountedPrice(product.sale_price))}
                        </td>
                      </tr>
                    ))}
                    {selectedProducts.length > 5 && (
                      <tr className="border-t">
                        <td
                          colSpan={3}
                          className="p-2 text-center text-muted-foreground"
                        >
                          외 {selectedProducts.length - 5}개 상품...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
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
              : `${selectedProducts.length}개 상품 가격 변경`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
