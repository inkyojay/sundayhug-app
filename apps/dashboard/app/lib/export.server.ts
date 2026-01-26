/**
 * CSV/Excel 내보내기 서버 유틸리티
 *
 * 데이터를 CSV 형식으로 변환하고 다운로드 응답을 생성하는 헬퍼 함수들
 */

import ExcelJS from "exceljs";

/**
 * CSV 컬럼 헤더 정의
 */
export interface CSVColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

/**
 * Excel 컬럼 헤더 정의
 */
export interface ExcelColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
  width?: number; // 컬럼 너비 (선택사항)
}

/**
 * Excel 시트 정의 (다중 시트용)
 */
export interface ExcelSheetDef<T extends Record<string, any>> {
  sheetName: string;
  columns: ExcelColumnDef<T>[];
  data: T[];
}

/**
 * Excel 파일 생성 (단일 시트)
 *
 * @param columns - 컬럼 정의 배열
 * @param data - 데이터 객체 배열
 * @param sheetName - 시트 이름
 * @returns Excel 파일 Buffer
 *
 * @example
 * ```ts
 * const buffer = await generateExcel(
 *   [
 *     { header: '주문번호', accessor: 'orderNo', width: 15 },
 *     { header: '금액', accessor: (row) => row.amount.toLocaleString(), width: 12 },
 *   ],
 *   orders,
 *   '주문 목록'
 * );
 * ```
 */
export async function generateExcel<T extends Record<string, any>>(
  columns: ExcelColumnDef<T>[],
  data: T[],
  sheetName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // 컬럼 정의 설정
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.header,
    width: col.width ?? 15, // 기본 너비 15
  }));

  // 헤더 스타일 설정
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // 데이터 추가
  data.forEach((row) => {
    const rowData = columns.map((col) => {
      if (typeof col.accessor === "function") {
        return col.accessor(row) ?? "";
      }
      return row[col.accessor] ?? "";
    });
    worksheet.addRow(rowData);
  });

  // Buffer로 변환
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 객체 배열에서 Excel 파일 생성 (간편 버전)
 *
 * @param columns - 컬럼 정의 배열
 * @param data - 데이터 객체 배열
 * @param sheetName - 시트 이름 (기본값: 'Sheet1')
 * @returns Excel 파일 Buffer
 *
 * @example
 * ```ts
 * const buffer = await generateExcelFromObjects(
 *   [
 *     { header: '주문번호', accessor: 'orderNo', width: 15 },
 *     { header: '금액', accessor: (row) => row.amount.toLocaleString(), width: 12 },
 *   ],
 *   orders
 * );
 * ```
 */
export async function generateExcelFromObjects<T extends Record<string, any>>(
  columns: ExcelColumnDef<T>[],
  data: T[],
  sheetName: string = "Sheet1"
): Promise<Buffer> {
  return generateExcel(columns, data, sheetName);
}

/**
 * Excel 파일 생성 (다중 시트)
 *
 * @param sheets - 시트 정의 배열
 * @returns Excel 파일 Buffer
 *
 * @example
 * ```ts
 * const buffer = await generateMultiSheetExcel([
 *   {
 *     sheetName: '주문 목록',
 *     columns: [
 *       { header: '주문번호', accessor: 'orderNo', width: 15 },
 *       { header: '금액', accessor: (row) => row.amount.toLocaleString(), width: 12 },
 *     ],
 *     data: orders,
 *   },
 *   {
 *     sheetName: '상품 목록',
 *     columns: [
 *       { header: '상품명', accessor: 'name', width: 20 },
 *       { header: '가격', accessor: (row) => row.price.toLocaleString(), width: 12 },
 *     ],
 *     data: products,
 *   },
 * ]);
 * ```
 */
export async function generateMultiSheetExcel(
  sheets: ExcelSheetDef<any>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // 각 시트 생성
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.sheetName);

    // 컬럼 정의 설정
    worksheet.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.header,
      width: col.width ?? 15, // 기본 너비 15
    }));

    // 헤더 스타일 설정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // 데이터 추가
    sheet.data.forEach((row) => {
      const rowData = sheet.columns.map((col) => {
        if (typeof col.accessor === "function") {
          return col.accessor(row) ?? "";
        }
        return row[col.accessor] ?? "";
      });
      worksheet.addRow(rowData);
    });
  }

  // Buffer로 변환
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Excel 셀 스타일 옵션
 */
export interface ExcelCellStyle {
  font?: Partial<ExcelJS.Font>;
  fill?: ExcelJS.Fill;
  alignment?: Partial<ExcelJS.Alignment>;
  border?: Partial<ExcelJS.Borders>;
  numFmt?: string;
}

/**
 * Excel 헤더 스타일 적용
 *
 * @param worksheet - 워크시트 객체
 * @param rowNumber - 행 번호 (기본값: 1)
 * @param style - 커스텀 스타일 (선택사항)
 *
 * @example
 * ```ts
 * applyHeaderStyle(worksheet);
 * // 또는 커스텀 스타일로
 * applyHeaderStyle(worksheet, 1, {
 *   font: { bold: true, color: { argb: 'FFFFFFFF' } },
 *   fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
 * });
 * ```
 */
export function applyHeaderStyle(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number = 1,
  style?: Partial<ExcelCellStyle>
): void {
  const row = worksheet.getRow(rowNumber);
  row.font = style?.font ?? { bold: true };
  row.fill = style?.fill ?? {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  row.alignment = style?.alignment ?? { vertical: "middle", horizontal: "center" };
  if (style?.border) {
    row.border = style.border;
  }
}

/**
 * Excel 셀 스타일 적용
 *
 * @param cell - 셀 객체
 * @param style - 스타일 옵션
 *
 * @example
 * ```ts
 * const cell = worksheet.getCell('A1');
 * applyCellStyle(cell, {
 *   font: { bold: true, color: { argb: 'FFFF0000' } },
 *   fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
 *   alignment: { horizontal: 'center' },
 * });
 * ```
 */
export function applyCellStyle(cell: ExcelJS.Cell, style: ExcelCellStyle): void {
  if (style.font) {
    cell.font = style.font;
  }
  if (style.fill) {
    cell.fill = style.fill;
  }
  if (style.alignment) {
    cell.alignment = style.alignment;
  }
  if (style.border) {
    cell.border = style.border;
  }
  if (style.numFmt) {
    cell.numFmt = style.numFmt;
  }
}

/**
 * Excel 통화 형식 적용
 *
 * @param cell - 셀 객체
 * @param symbol - 통화 기호 (기본값: '₩')
 *
 * @example
 * ```ts
 * const cell = worksheet.getCell('B2');
 * cell.value = 10000;
 * applyCurrencyFormat(cell); // ₩10,000
 * ```
 */
export function applyCurrencyFormat(cell: ExcelJS.Cell, symbol: string = "₩"): void {
  cell.numFmt = `${symbol}#,##0`;
}

/**
 * Excel 백분율 형식 적용
 *
 * @param cell - 셀 객체
 * @param decimals - 소수점 자릿수 (기본값: 2)
 *
 * @example
 * ```ts
 * const cell = worksheet.getCell('C2');
 * cell.value = 0.15;
 * applyPercentageFormat(cell); // 15.00%
 * ```
 */
export function applyPercentageFormat(cell: ExcelJS.Cell, decimals: number = 2): void {
  const decimalStr = decimals > 0 ? "." + "0".repeat(decimals) : "";
  cell.numFmt = `0${decimalStr}%`;
}

/**
 * Excel 날짜 형식 적용
 *
 * @param cell - 셀 객체
 * @param format - 날짜 형식 (기본값: 'yyyy-mm-dd')
 *
 * @example
 * ```ts
 * const cell = worksheet.getCell('D2');
 * cell.value = new Date();
 * applyDateFormat(cell); // 2024-01-26
 * applyDateFormat(cell, 'yyyy-mm-dd hh:mm:ss'); // 2024-01-26 14:30:00
 * ```
 */
export function applyDateFormat(cell: ExcelJS.Cell, format: string = "yyyy-mm-dd"): void {
  cell.numFmt = format;
}

/**
 * Excel 셀 테두리 적용
 *
 * @param cell - 셀 객체
 * @param style - 테두리 스타일 (기본값: 'thin')
 * @param color - 테두리 색상 (기본값: '000000')
 *
 * @example
 * ```ts
 * const cell = worksheet.getCell('A1');
 * applyCellBorder(cell); // 기본 테두리
 * applyCellBorder(cell, 'medium', 'FF0000'); // 빨간색 중간 테두리
 * ```
 */
export function applyCellBorder(
  cell: ExcelJS.Cell,
  style: "thin" | "medium" | "thick" | "dotted" | "dashed" = "thin",
  color: string = "000000"
): void {
  const borderStyle = { style, color: { argb: color } };
  cell.border = {
    top: borderStyle,
    left: borderStyle,
    bottom: borderStyle,
    right: borderStyle,
  };
}

/**
 * Excel 범위에 테두리 적용
 *
 * @param worksheet - 워크시트 객체
 * @param startRow - 시작 행
 * @param startCol - 시작 컬럼
 * @param endRow - 종료 행
 * @param endCol - 종료 컬럼
 * @param style - 테두리 스타일 (기본값: 'thin')
 *
 * @example
 * ```ts
 * // A1:D10 범위에 테두리 적용
 * applyRangeBorder(worksheet, 1, 1, 10, 4);
 * ```
 */
export function applyRangeBorder(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  style: "thin" | "medium" | "thick" | "dotted" | "dashed" = "thin"
): void {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = worksheet.getCell(row, col);
      applyCellBorder(cell, style);
    }
  }
}

/**
 * Excel 셀 병합
 *
 * @param worksheet - 워크시트 객체
 * @param startRow - 시작 행
 * @param startCol - 시작 컬럼
 * @param endRow - 종료 행
 * @param endCol - 종료 컬럼
 *
 * @example
 * ```ts
 * // A1:D1 셀 병합
 * mergeCells(worksheet, 1, 1, 1, 4);
 * ```
 */
export function mergeCells(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): void {
  worksheet.mergeCells(startRow, startCol, endRow, endCol);
}

/**
 * Excel 열 너비 자동 조정
 *
 * @param worksheet - 워크시트 객체
 * @param minWidth - 최소 너비 (기본값: 10)
 * @param maxWidth - 최대 너비 (기본값: 50)
 *
 * @example
 * ```ts
 * autoFitColumns(worksheet);
 * autoFitColumns(worksheet, 15, 40);
 * ```
 */
export function autoFitColumns(
  worksheet: ExcelJS.Worksheet,
  minWidth: number = 10,
  maxWidth: number = 50
): void {
  worksheet.columns.forEach((column) => {
    if (!column.eachCell) return;

    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : "";
      maxLength = Math.max(maxLength, cellValue.length);
    });

    column.width = Math.min(Math.max(maxLength + 2, minWidth), maxWidth);
  });
}

/**
 * Excel 조건부 서식 - 값 기반 색상
 *
 * @param cell - 셀 객체
 * @param value - 셀 값
 * @param threshold - 임계값
 * @param aboveColor - 임계값 이상일 때 색상 (기본값: 초록색)
 * @param belowColor - 임계값 미만일 때 색상 (기본값: 빨간색)
 *
 * @example
 * ```ts
 * const cell = worksheet.getCell('E2');
 * cell.value = 85;
 * applyConditionalColor(cell, 85, 80); // 임계값 80 이상이면 초록색
 * ```
 */
export function applyConditionalColor(
  cell: ExcelJS.Cell,
  value: number,
  threshold: number,
  aboveColor: string = "FF90EE90",
  belowColor: string = "FFFFC0CB"
): void {
  const color = value >= threshold ? aboveColor : belowColor;
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color },
  };
}

/**
 * CSV 문자열 생성
 *
 * @param headers - 컬럼 헤더 배열
 * @param rows - 데이터 행 배열 (각 행은 문자열 배열)
 * @returns CSV 형식 문자열
 *
 * @example
 * ```ts
 * const csv = generateCSV(
 *   ['이름', '가격', '수량'],
 *   [
 *     ['상품A', '10000', '5'],
 *     ['상품B', '20000', '3'],
 *   ]
 * );
 * ```
 */
export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCSVValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    // 쉼표, 줄바꿈, 큰따옴표가 포함된 경우 큰따옴표로 감싸기
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headerLine = headers.map(escapeCSVValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSVValue).join(","));

  return [headerLine, ...dataLines].join("\n");
}

/**
 * 객체 배열에서 CSV 문자열 생성
 *
 * @param columns - 컬럼 정의 배열
 * @param data - 데이터 객체 배열
 * @returns CSV 형식 문자열
 *
 * @example
 * ```ts
 * const csv = generateCSVFromObjects(
 *   [
 *     { header: '주문번호', accessor: 'orderNo' },
 *     { header: '금액', accessor: (row) => row.amount.toLocaleString() },
 *   ],
 *   orders
 * );
 * ```
 */
export function generateCSVFromObjects<T extends Record<string, any>>(
  columns: CSVColumnDef<T>[],
  data: T[]
): string {
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      if (typeof col.accessor === "function") {
        return col.accessor(row) ?? "";
      }
      return row[col.accessor] ?? "";
    })
  );

  return generateCSV(headers, rows);
}

/**
 * CSV 다운로드 Response 생성
 *
 * @param csv - CSV 문자열
 * @param filename - 다운로드 파일명 (확장자 제외)
 * @returns Response 객체
 *
 * @example
 * ```ts
 * // loader나 action에서 사용
 * const csv = generateCSV(headers, rows);
 * return createCSVResponse(csv, 'orders-export');
 * ```
 */
export function createCSVResponse(csv: string, filename: string): Response {
  // UTF-8 BOM 추가하여 Excel에서 한글 깨짐 방지
  const BOM = "\uFEFF";
  const csvWithBom = BOM + csv;

  // 파일명에 날짜 추가
  const timestamp = new Date().toISOString().split("T")[0];
  const fullFilename = `${filename}-${timestamp}.csv`;

  return new Response(csvWithBom, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fullFilename)}"`,
    },
  });
}

/**
 * Excel 다운로드 Response 생성
 *
 * @param buffer - Excel 파일 Buffer
 * @param filename - 다운로드 파일명 (확장자 제외)
 * @returns Response 객체
 *
 * @example
 * ```ts
 * // loader나 action에서 사용
 * const buffer = await generateExcel(columns, data, 'Sheet1');
 * return createExcelResponse(buffer, 'orders-export');
 * ```
 */
export function createExcelResponse(buffer: Buffer, filename: string): Response {
  // 파일명에 날짜 추가
  const timestamp = new Date().toISOString().split("T")[0];
  const fullFilename = `${filename}-${timestamp}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fullFilename)}"`,
    },
  });
}

/**
 * 객체 배열에서 Excel Response 직접 생성
 *
 * @param columns - 컬럼 정의 배열
 * @param data - 데이터 객체 배열
 * @param filename - 다운로드 파일명 (확장자 제외)
 * @param sheetName - 시트 이름 (기본값: 'Sheet1')
 * @returns Response 객체
 *
 * @example
 * ```ts
 * return await createExcelResponseFromObjects(
 *   [
 *     { header: '주문번호', accessor: 'orderNo', width: 15 },
 *     { header: '상태', accessor: 'status', width: 12 },
 *   ],
 *   orders,
 *   'orders-export'
 * );
 * ```
 */
export async function createExcelResponseFromObjects<T extends Record<string, any>>(
  columns: ExcelColumnDef<T>[],
  data: T[],
  filename: string,
  sheetName: string = "Sheet1"
): Promise<Response> {
  const buffer = await generateExcelFromObjects(columns, data, sheetName);
  return createExcelResponse(buffer, filename);
}

/**
 * 객체 배열에서 CSV Response 직접 생성
 *
 * @param columns - 컬럼 정의 배열
 * @param data - 데이터 객체 배열
 * @param filename - 다운로드 파일명 (확장자 제외)
 * @returns Response 객체
 *
 * @example
 * ```ts
 * return createCSVResponseFromObjects(
 *   [
 *     { header: '주문번호', accessor: 'orderNo' },
 *     { header: '상태', accessor: 'status' },
 *   ],
 *   orders,
 *   'orders-export'
 * );
 * ```
 */
export function createCSVResponseFromObjects<T extends Record<string, any>>(
  columns: CSVColumnDef<T>[],
  data: T[],
  filename: string
): Response {
  const csv = generateCSVFromObjects(columns, data);
  return createCSVResponse(csv, filename);
}

/**
 * 날짜 형식 포매터 (CSV 출력용)
 */
export function formatDateForCSV(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 날짜시간 형식 포매터 (CSV 출력용)
 */
export function formatDateTimeForCSV(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 금액 형식 포매터 (CSV 출력용)
 */
export function formatCurrencyForCSV(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return amount.toLocaleString("ko-KR");
}
