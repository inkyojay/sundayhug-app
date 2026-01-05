/**
 * 일괄 송장 입력 모달 컴포넌트
 *
 * - 택배사 선택 (Select)
 * - 송장번호 입력 (Input)
 * - 선택된 주문 목록 표시
 * - 저장 시 각 주문에 송장 정보 저장 + 재고 차감 트리거
 */
import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { PackageIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Alert, AlertDescription } from "~/core/components/ui/alert";

import { CARRIERS, getCarrierByValue } from "../lib/carriers";
import { type UnifiedOrder } from "../lib/orders-unified.shared";
import { ChannelBadge } from "./ChannelBadge";

interface InvoiceInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: UnifiedOrder[];
  onComplete?: () => void;
}

interface InvoiceInput {
  orderKey: string;
  orderNo: string;
  channel: string;
  carrierCode: string;
  invoiceNo: string;
}

export function InvoiceInputModal({
  open,
  onOpenChange,
  selectedOrders,
  onComplete,
}: InvoiceInputModalProps) {
  const fetcher = useFetcher();

  // 일괄 입력용 상태
  const [bulkCarrierCode, setBulkCarrierCode] = useState("");
  const [bulkInvoiceNo, setBulkInvoiceNo] = useState("");

  // 개별 주문별 입력 상태
  const [invoiceInputs, setInvoiceInputs] = useState<InvoiceInput[]>([]);

  // 결과 상태
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const isProcessing = fetcher.state === "submitting";

  // 선택된 주문이 변경되면 입력 상태 초기화
  useEffect(() => {
    if (open) {
      setInvoiceInputs(
        selectedOrders.map((order) => ({
          orderKey: order.key,
          orderNo: order.orderNo,
          channel: order.channel,
          carrierCode: order.carrName
            ? CARRIERS.find((c) => c.label === order.carrName)?.value || ""
            : "",
          invoiceNo: order.invoiceNo || "",
        }))
      );
      setBulkCarrierCode("");
      setBulkInvoiceNo("");
      setResult(null);
    }
  }, [open, selectedOrders]);

  // fetcher 결과 처리
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as { success: boolean; message?: string; error?: string };
      if (data.success) {
        setResult({ success: true, message: data.message || "송장 정보가 저장되었습니다." });
        // 잠시 후 모달 닫기
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      } else {
        setResult({ success: false, message: data.error || "오류가 발생했습니다." });
      }
    }
  }, [fetcher.state, fetcher.data, onComplete]);

  // 일괄 적용
  const handleBulkApply = () => {
    if (!bulkCarrierCode) return;

    setInvoiceInputs((prev) =>
      prev.map((input) => ({
        ...input,
        carrierCode: bulkCarrierCode,
        invoiceNo: bulkInvoiceNo || input.invoiceNo,
      }))
    );
  };

  // 개별 입력 변경
  const handleInputChange = (
    orderKey: string,
    field: "carrierCode" | "invoiceNo",
    value: string
  ) => {
    setInvoiceInputs((prev) =>
      prev.map((input) =>
        input.orderKey === orderKey ? { ...input, [field]: value } : input
      )
    );
  };

  // 저장
  const handleSave = () => {
    // 유효한 입력만 필터링 (택배사와 송장번호 모두 있어야 함)
    const validInputs = invoiceInputs.filter(
      (input) => input.carrierCode && input.invoiceNo
    );

    if (validInputs.length === 0) {
      setResult({ success: false, message: "저장할 송장 정보가 없습니다." });
      return;
    }

    // 송장 정보를 서버로 전송
    const invoiceData = validInputs.map((input) => ({
      orderKey: input.orderKey,
      orderNo: input.orderNo,
      channel: input.channel,
      carrName: getCarrierByValue(input.carrierCode)?.label || "",
      invoiceNo: input.invoiceNo,
    }));

    fetcher.submit(
      {
        actionType: "bulkUpdateInvoice",
        invoiceData: JSON.stringify(invoiceData),
      },
      { method: "POST" }
    );
  };

  // 유효한 입력 개수
  const validCount = invoiceInputs.filter(
    (input) => input.carrierCode && input.invoiceNo
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            일괄 송장 입력
          </DialogTitle>
          <DialogDescription>
            선택한 {selectedOrders.length}개 주문에 송장 정보를 입력합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 결과 메시지 */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircleIcon className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        {/* 일괄 적용 섹션 */}
        <div className="flex items-end gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>택배사 일괄 선택</Label>
            <Select value={bulkCarrierCode} onValueChange={setBulkCarrierCode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="택배사 선택" />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((carrier) => (
                  <SelectItem key={carrier.value} value={carrier.value}>
                    {carrier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>송장번호 (선택)</Label>
            <Input
              value={bulkInvoiceNo}
              onChange={(e) => setBulkInvoiceNo(e.target.value)}
              placeholder="일괄 적용할 송장번호"
              className="w-[200px]"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleBulkApply}
            disabled={!bulkCarrierCode}
          >
            일괄 적용
          </Button>
        </div>

        {/* 주문 목록 테이블 */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">채널</TableHead>
                <TableHead className="w-[150px]">주문번호</TableHead>
                <TableHead>수령인</TableHead>
                <TableHead className="w-[180px]">택배사</TableHead>
                <TableHead className="w-[200px]">송장번호</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceInputs.map((input) => {
                const order = selectedOrders.find((o) => o.key === input.orderKey);
                if (!order) return null;

                return (
                  <TableRow key={input.orderKey}>
                    <TableCell>
                      <ChannelBadge channel={order.channel} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {order.orderNo}
                    </TableCell>
                    <TableCell>{order.toName}</TableCell>
                    <TableCell>
                      <Select
                        value={input.carrierCode}
                        onValueChange={(v) =>
                          handleInputChange(input.orderKey, "carrierCode", v)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="택배사" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARRIERS.map((carrier) => (
                            <SelectItem key={carrier.value} value={carrier.value}>
                              {carrier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={input.invoiceNo}
                        onChange={(e) =>
                          handleInputChange(input.orderKey, "invoiceNo", e.target.value)
                        }
                        placeholder="송장번호"
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {validCount}개 주문에 송장 정보 입력됨
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing || validCount === 0}
            >
              {isProcessing ? "저장 중..." : `저장 (${validCount}건)`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
