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
