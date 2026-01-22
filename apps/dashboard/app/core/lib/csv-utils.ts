/**
 * CSV 유틸리티
 *
 * CSV 파일 생성, 파싱, 다운로드를 위한 공통 유틸리티
 *
 * 사용 예시:
 * - 다운로드: downloadCSV(data, headers, 'products.csv')
 * - 파싱: const data = parseCSV(csvText)
 * - 생성: const csv = generateCSV(data, headers)
 */

/**
 * CSV 셀 값 이스케이프
 * 쉼표, 따옴표, 줄바꿈이 포함된 경우 따옴표로 감싸고 내부 따옴표는 이중 처리
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // 이스케이프가 필요한 경우
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * CSV 문자열 생성
 *
 * @param data - 데이터 배열 (객체 배열 또는 2차원 배열)
 * @param headers - 헤더 정보 (선택)
 *   - 문자열 배열: 그대로 헤더로 사용 (data는 객체의 키와 매칭)
 *   - 객체 배열: { key, label } 형태로 data 객체의 키를 label로 매핑
 * @returns CSV 문자열
 *
 * @example
 * // 객체 배열 + 헤더 매핑
 * const csv = generateCSV(products, [
 *   { key: 'sku', label: 'SKU' },
 *   { key: 'name', label: '제품명' }
 * ]);
 *
 * // 객체 배열 + 단순 헤더
 * const csv = generateCSV(products, ['sku', 'name', 'price']);
 *
 * // 2차원 배열
 * const csv = generateCSV([['a', 'b'], ['c', 'd']]);
 */
export function generateCSV(
  data: Record<string, unknown>[] | unknown[][],
  headers?:
    | string[]
    | Array<{ key: string; label: string }>
): string {
  if (data.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // 2차원 배열인지 확인
  const isArray2D = Array.isArray(data[0]);

  if (isArray2D) {
    // 2차원 배열: 각 행을 직접 CSV로 변환
    for (const row of data as unknown[][]) {
      lines.push(row.map(escapeCSVValue).join(","));
    }
  } else {
    // 객체 배열
    const objectData = data as Record<string, unknown>[];

    // 헤더 처리
    let keys: string[];
    let headerLabels: string[];

    if (!headers) {
      // 헤더가 없으면 첫 번째 객체의 키 사용
      keys = Object.keys(objectData[0]);
      headerLabels = keys;
    } else if (typeof headers[0] === "string") {
      // 문자열 배열
      keys = headers as string[];
      headerLabels = keys;
    } else {
      // 객체 배열 ({ key, label })
      const headerConfig = headers as Array<{ key: string; label: string }>;
      keys = headerConfig.map((h) => h.key);
      headerLabels = headerConfig.map((h) => h.label);
    }

    // 헤더 행 추가
    lines.push(headerLabels.map(escapeCSVValue).join(","));

    // 데이터 행 추가
    for (const row of objectData) {
      const values = keys.map((key) => escapeCSVValue(row[key]));
      lines.push(values.join(","));
    }
  }

  return lines.join("\n");
}

/**
 * CSV 파싱
 *
 * @param text - CSV 문자열
 * @param options - 파싱 옵션
 * @returns 파싱된 객체 배열 (첫 행을 헤더로 사용)
 */
export function parseCSV(
  text: string,
  options: {
    hasHeader?: boolean;
    delimiter?: string;
    trimValues?: boolean;
  } = {}
): Record<string, string>[] {
  const { hasHeader = true, delimiter = ",", trimValues = true } = options;

  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0 || (hasHeader && lines.length < 2)) {
    return [];
  }

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // 이스케이프된 따옴표
            current += '"';
            i++;
          } else {
            // 따옴표 종료
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          values.push(trimValues ? current.trim() : current);
          current = "";
        } else {
          current += char;
        }
      }
    }

    // 마지막 값 추가
    values.push(trimValues ? current.trim() : current);

    return values;
  };

  if (hasHeader) {
    const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx]?.replace(/^"|"$/g, "") || "";
      });

      rows.push(row);
    }

    return rows;
  } else {
    // 헤더 없는 경우 인덱스를 키로 사용
    return lines.map((line) => {
      const values = parseLine(line);
      const row: Record<string, string> = {};
      values.forEach((value, idx) => {
        row[`col${idx}`] = value.replace(/^"|"$/g, "");
      });
      return row;
    });
  }
}

/**
 * CSV 파일 다운로드 (브라우저)
 *
 * @param data - 데이터 배열
 * @param headers - 헤더 정보
 * @param filename - 파일명
 *
 * @example
 * downloadCSV(products, [
 *   { key: 'sku', label: 'SKU' },
 *   { key: 'name', label: '제품명' }
 * ], 'products.csv');
 */
export function downloadCSV(
  data: Record<string, unknown>[] | unknown[][],
  headers?: string[] | Array<{ key: string; label: string }>,
  filename: string = "export.csv"
): void {
  const csvContent = generateCSV(data, headers);

  // BOM 추가 (한글 깨짐 방지)
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * CSV 다운로드 (단순화된 버전)
 * 객체 배열을 받아 모든 키를 그대로 헤더로 사용
 *
 * @param items - 데이터 배열
 * @param filename - 파일명
 */
export function downloadCSVSimple(
  items: Record<string, unknown>[],
  filename: string = "export.csv"
): void {
  if (items.length === 0) {
    console.warn("[downloadCSVSimple] No data to export");
    return;
  }

  const headers = Object.keys(items[0]);
  downloadCSV(items, headers, filename);
}

/**
 * 날짜가 포함된 파일명 생성
 *
 * @param prefix - 파일명 접두사
 * @param extension - 파일 확장자 (기본: csv)
 * @returns 날짜가 포함된 파일명
 *
 * @example
 * generateFilename('products') // 'products_2024-01-15.csv'
 */
export function generateFilename(prefix: string, extension: string = "csv"): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}.${extension}`;
}
