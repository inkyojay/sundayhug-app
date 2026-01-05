/**
 * CSV 파싱 및 검증 유틸리티
 *
 * 송장 CSV 파일 처리를 위한 함수들
 */
import { CARRIERS, getCarrierByValue, getCarrierByLabel } from "./carriers";
import type { UnifiedOrder } from "./orders-unified.shared";

/**
 * 파싱된 송장 데이터 행
 */
export interface ParsedInvoiceRow {
  orderNo: string;
  carrierCode: string;
  invoiceNo: string;
  lineNumber: number;
}

/**
 * 검증 결과
 */
export interface ValidationResult {
  row: ParsedInvoiceRow;
  isValid: boolean;
  errors: string[];
  order?: UnifiedOrder;
  carrierLabel?: string;
}

/**
 * CSV 텍스트를 파싱하여 송장 데이터 배열로 변환
 *
 * @param csvText - CSV 파일 내용
 * @returns 파싱된 송장 데이터 배열
 */
export function parseInvoiceCSV(csvText: string): ParsedInvoiceRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  // 첫 줄이 헤더인지 확인 (숫자가 아닌 경우 헤더로 간주)
  const firstLine = lines[0];
  const firstCells = parseCSVLine(firstLine);
  const hasHeader = firstCells.some((cell) =>
    /[가-힣a-zA-Z]/.test(cell) && !/^\d+$/.test(cell)
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const startLineNumber = hasHeader ? 2 : 1;

  return dataLines
    .map((line, index) => {
      const cells = parseCSVLine(line);

      // 최소 3개 컬럼 필요
      if (cells.length < 3) {
        return null;
      }

      return {
        orderNo: cells[0].trim(),
        carrierCode: cells[1].trim(),
        invoiceNo: cells[2].trim(),
        lineNumber: startLineNumber + index,
      };
    })
    .filter((row): row is ParsedInvoiceRow => row !== null);
}

/**
 * CSV 라인을 셀 배열로 파싱
 * 쉼표, 탭, 세미콜론을 구분자로 지원
 * 큰따옴표로 감싼 값 지원
 */
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  // 구분자 자동 감지
  const delimiter = detectDelimiter(line);

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 이스케이프된 따옴표
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells.map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

/**
 * 구분자 자동 감지
 */
function detectDelimiter(line: string): string {
  const delimiters = [",", "\t", ";"];
  let maxCount = 0;
  let bestDelimiter = ",";

  for (const delimiter of delimiters) {
    const count = (line.match(new RegExp(`\\${delimiter}`, "g")) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * 파싱된 데이터를 검증
 *
 * @param rows - 파싱된 송장 데이터 배열
 * @param orders - 현재 주문 목록
 * @returns 검증 결과 배열
 */
export function validateInvoiceData(
  rows: ParsedInvoiceRow[],
  orders: UnifiedOrder[]
): ValidationResult[] {
  // 주문번호로 빠른 검색을 위한 맵 생성
  const orderMap = new Map<string, UnifiedOrder>();
  for (const order of orders) {
    orderMap.set(order.orderNo, order);
    // key로도 검색 가능하도록
    orderMap.set(order.key, order);
  }

  return rows.map((row) => {
    const errors: string[] = [];
    let order: UnifiedOrder | undefined;
    let carrierLabel: string | undefined;

    // 1. 주문번호 존재 여부 확인
    if (!row.orderNo) {
      errors.push("주문번호 누락");
    } else {
      order = orderMap.get(row.orderNo);
      if (!order) {
        errors.push("주문번호 없음");
      }
    }

    // 2. 택배사 코드 유효성 확인
    if (!row.carrierCode) {
      errors.push("택배사코드 누락");
    } else {
      // 코드로 먼저 검색
      let carrier = getCarrierByValue(row.carrierCode.toLowerCase());

      // 코드로 못찾으면 이름으로 검색
      if (!carrier) {
        carrier = getCarrierByLabel(row.carrierCode);
      }

      // 대문자로도 시도 (CJGLS 등)
      if (!carrier) {
        carrier = CARRIERS.find(
          (c) =>
            c.naverCode?.toLowerCase() === row.carrierCode.toLowerCase() ||
            c.coupangCode?.toLowerCase() === row.carrierCode.toLowerCase() ||
            c.cafe24Code === row.carrierCode
        );
      }

      if (!carrier) {
        errors.push(`유효하지 않은 택배사: ${row.carrierCode}`);
      } else {
        carrierLabel = carrier.label;
      }
    }

    // 3. 송장번호 확인
    if (!row.invoiceNo) {
      errors.push("송장번호 누락");
    } else if (!/^[\d-]+$/.test(row.invoiceNo.replace(/\s/g, ""))) {
      // 숫자와 하이픈만 허용 (일부 택배사 형식 고려)
      errors.push("송장번호 형식 오류");
    }

    return {
      row,
      isValid: errors.length === 0,
      errors,
      order,
      carrierLabel,
    };
  });
}

/**
 * 유효한 택배사 코드 목록 반환
 */
export function getValidCarrierCodes(): string[] {
  return CARRIERS.map((c) => c.value);
}

/**
 * 송장번호 형식 정규화
 * - 공백 제거
 * - 하이픈 유지
 */
export function normalizeInvoiceNo(invoiceNo: string): string {
  return invoiceNo.replace(/\s/g, "").trim();
}

/**
 * CSV 데이터를 다운로드용 문자열로 변환
 */
export function generateInvoiceCSVTemplate(): string {
  const headers = ["주문번호", "택배사코드", "송장번호"];
  const carrierCodes = CARRIERS.map((c) => `${c.value} (${c.label})`).join(", ");

  return [
    headers.join(","),
    "# 택배사코드: " + carrierCodes,
    "ORD-SAMPLE-001,cj,1234567890123",
    "ORD-SAMPLE-002,lotte,9876543210987",
  ].join("\n");
}
