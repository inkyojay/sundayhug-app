/**
 * 제품 관리 공유 유틸리티
 */

// 색상명 → 실제 색상 코드 매핑
export const COLOR_MAP: Record<string, string> = {
  // 기본 색상
  "화이트": "#FFFFFF", "흰색": "#FFFFFF", "white": "#FFFFFF", "아이보리": "#FFFFF0",
  "블랙": "#1a1a1a", "검정": "#1a1a1a", "black": "#1a1a1a", "차콜": "#36454F",
  "그레이": "#808080", "회색": "#808080", "gray": "#808080", "grey": "#808080",
  "라이트그레이": "#D3D3D3", "다크그레이": "#404040",
  // 브라운 계열
  "브라운": "#8B4513", "갈색": "#8B4513", "brown": "#8B4513",
  "어스브라운": "#6B4423", "다크브라운": "#3D2914", "라이트브라운": "#A0522D",
  "베이지": "#F5F5DC", "beige": "#F5F5DC", "탄": "#D2B48C", "카멜": "#C19A6B",
  "크림": "#FFFDD0", "데일리크림": "#FFFDD0", "cream": "#FFFDD0",
  "카키": "#8B8B00", "khaki": "#F0E68C", "올리브": "#808000",
  // 블루 계열
  "네이비": "#000080", "navy": "#000080", "블루": "#0000FF", "blue": "#0000FF",
  "스카이블루": "#87CEEB", "라이트블루": "#ADD8E6", "다크블루": "#00008B",
  "인디고": "#4B0082", "민트": "#98FF98", "청록": "#008B8B", "틸": "#008080",
  // 핑크/레드 계열
  "핑크": "#FFC0CB", "pink": "#FFC0CB", "로즈": "#FF007F", "코랄": "#FF7F50",
  "레드": "#FF0000", "빨강": "#FF0000", "red": "#FF0000", "와인": "#722F37",
  "버건디": "#800020", "마룬": "#800000", "살몬": "#FA8072",
  // 그린 계열
  "그린": "#008000", "녹색": "#008000", "green": "#008000",
  "라이트그린": "#90EE90", "다크그린": "#006400", "포레스트": "#228B22",
  // 옐로우/오렌지 계열
  "옐로우": "#FFFF00", "노랑": "#FFFF00", "yellow": "#FFFF00",
  "오렌지": "#FFA500", "주황": "#FFA500", "orange": "#FFA500",
  "머스타드": "#FFDB58", "골드": "#FFD700", "레몬": "#FFF44F",
  // 퍼플 계열
  "퍼플": "#800080", "보라": "#800080", "purple": "#800080",
  "라벤더": "#E6E6FA", "바이올렛": "#EE82EE", "플럼": "#DDA0DD",
};

/**
 * 색상명에서 색상 코드 추출
 */
export function getColorCode(colorName: string): string | null {
  if (!colorName) return null;
  const lowerName = colorName.toLowerCase().replace(/\s/g, "");

  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lowerName.includes(key.toLowerCase().replace(/\s/g, ""))) {
      return value;
    }
  }
  return null;
}

/**
 * 배경색에 따른 텍스트 색상 결정
 */
export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * 가격 포맷
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price) + "원";
}

/**
 * CSV 다운로드 함수
 */
export function downloadCSV(products: any[], filename: string): void {
  const headers = [
    "sku",
    "product_name",
    "parent_sku",
    "category",
    "color_kr",
    "sku_6_size",
    "thumbnail_url",
    "cost_price",
    "is_active",
  ];

  const csvContent = [
    headers.join(","),
    ...products.map((p) =>
      headers
        .map((h) => {
          const value = p[h];
          if (value === null || value === undefined) return "";
          const str = String(value);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * CSV 파싱 함수
 */
export function parseCSV(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/^"|"$/g, "") || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * URL 빌드 헬퍼
 */
export interface ProductUrlParams {
  search?: string | null;
  parentSku?: string | null;
  color?: string | null;
  size?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  groupBy?: string | null;
  page?: string | null;
  limit?: string | null;
}

export function buildProductUrl(basePath: string, params: ProductUrlParams): string {
  const urlParams = new URLSearchParams();

  if (params.search) urlParams.set("search", params.search);
  if (params.parentSku) urlParams.set("parentSku", params.parentSku);
  if (params.color) urlParams.set("color", params.color);
  if (params.size) urlParams.set("size", params.size);
  if (params.sortBy && params.sortBy !== "updated_at") urlParams.set("sortBy", params.sortBy);
  if (params.sortOrder && params.sortOrder !== "desc") urlParams.set("sortOrder", params.sortOrder);
  if (params.groupBy) urlParams.set("groupBy", params.groupBy);
  if (params.page && params.page !== "1") urlParams.set("page", params.page);
  if (params.limit && params.limit !== "50") urlParams.set("limit", params.limit);

  const queryString = urlParams.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}
