/**
 * 송장 CSV 업로드 모달 컴포넌트
 *
 * - CSV 파일 업로드 (드래그앤드롭)
 * - CSV 형식: 주문번호, 택배사코드, 송장번호
 * - 업로드 결과 미리보기 테이블
 * - 일괄 적용 버튼
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import {
  UploadIcon,
  FileTextIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XIcon,
  DownloadIcon,
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "~/core/components/ui/alert";

import { type UnifiedOrder } from "../lib/orders-unified.shared";
import {
  parseInvoiceCSV,
  validateInvoiceData,
  type ParsedInvoiceRow,
  type ValidationResult,
} from "../lib/csv-parser";
import { ChannelBadge } from "./ChannelBadge";

interface InvoiceUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: UnifiedOrder[];
  onComplete?: () => void;
}

export function InvoiceUploadModal({
  open,
  onOpenChange,
  orders,
  onComplete,
}: InvoiceUploadModalProps) {
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInvoiceRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const isProcessing = fetcher.state === "submitting";

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setFile(null);
      setParsedData([]);
      setValidationResults([]);
      setParseError(null);
      setResult(null);
    }
  }, [open]);

  // fetcher 결과 처리
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as { success: boolean; message?: string; error?: string };
      if (data.success) {
        setResult({ success: true, message: data.message || "송장 정보가 저장되었습니다." });
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      } else {
        setResult({ success: false, message: data.error || "오류가 발생했습니다." });
      }
    }
  }, [fetcher.state, fetcher.data, onComplete]);

  // 파일 처리
  const handleFile = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setParseError(null);
      setResult(null);

      try {
        const text = await selectedFile.text();
        const parsed = parseInvoiceCSV(text);

        if (parsed.length === 0) {
          setParseError("CSV 파일에 데이터가 없습니다.");
          return;
        }

        setParsedData(parsed);

        // 검증
        const results = validateInvoiceData(parsed, orders);
        setValidationResults(results);
      } catch (error) {
        setParseError(
          error instanceof Error ? error.message : "파일 파싱 중 오류가 발생했습니다."
        );
      }
    },
    [orders]
  );

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.type === "text/csv") {
        handleFile(droppedFile);
      } else {
        setParseError("CSV 파일만 업로드 가능합니다.");
      }
    },
    [handleFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  // 파일 제거
  const handleRemoveFile = () => {
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 샘플 CSV 다운로드
  const handleDownloadSample = () => {
    const sampleContent = `주문번호,택배사코드,송장번호
ORD-2024-001,cj,1234567890123
ORD-2024-002,lotte,9876543210987
ORD-2024-003,hanjin,5555666677778`;

    const blob = new Blob(["\uFEFF" + sampleContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "invoice_sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // 일괄 적용
  const handleApply = () => {
    const validData = validationResults
      .filter((r) => r.isValid && r.order)
      .map((r) => ({
        orderKey: r.order!.key,
        orderNo: r.order!.orderNo,
        channel: r.order!.channel,
        carrName: r.carrierLabel,
        invoiceNo: r.row.invoiceNo,
      }));

    if (validData.length === 0) {
      setResult({ success: false, message: "적용할 유효한 데이터가 없습니다." });
      return;
    }

    fetcher.submit(
      {
        actionType: "bulkUpdateInvoice",
        invoiceData: JSON.stringify(validData),
      },
      { method: "POST" }
    );
  };

  // 통계
  const validCount = validationResults.filter((r) => r.isValid).length;
  const invalidCount = validationResults.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            송장 CSV 업로드
          </DialogTitle>
          <DialogDescription>
            CSV 파일로 여러 주문의 송장 정보를 한번에 업로드합니다.
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

        {/* 파일 업로드 영역 */}
        {!file ? (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">CSV 파일을 드래그하여 업로드</p>
            <p className="text-sm text-muted-foreground mb-4">
              또는 클릭하여 파일 선택
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </Button>
              <Button variant="ghost" onClick={handleDownloadSample}>
                <DownloadIcon className="h-4 w-4 mr-2" />
                샘플 다운로드
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              CSV 형식: 주문번호, 택배사코드, 송장번호
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileTextIcon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length}행 파싱됨
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 파싱 에러 */}
        {parseError && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>파싱 오류</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {/* 검증 결과 요약 */}
        {validationResults.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 font-medium">
              유효: {validCount}건
            </span>
            {invalidCount > 0 && (
              <span className="text-red-600 font-medium">
                오류: {invalidCount}건
              </span>
            )}
          </div>
        )}

        {/* 미리보기 테이블 */}
        {validationResults.length > 0 && (
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">상태</TableHead>
                  <TableHead className="w-[150px]">주문번호</TableHead>
                  <TableHead className="w-[100px]">채널</TableHead>
                  <TableHead>택배사</TableHead>
                  <TableHead>송장번호</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationResults.map((result, index) => (
                  <TableRow
                    key={index}
                    className={!result.isValid ? "bg-red-50" : ""}
                  >
                    <TableCell>
                      {result.isValid ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircleIcon className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.row.orderNo}
                    </TableCell>
                    <TableCell>
                      {result.order ? (
                        <ChannelBadge channel={result.order.channel} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{result.carrierLabel || result.row.carrierCode}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.row.invoiceNo}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {result.errors.join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {validCount > 0 && `${validCount}건 적용 가능`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={handleApply}
              disabled={isProcessing || validCount === 0}
            >
              {isProcessing ? "적용 중..." : `일괄 적용 (${validCount}건)`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
