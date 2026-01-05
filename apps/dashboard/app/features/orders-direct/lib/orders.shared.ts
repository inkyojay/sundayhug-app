/**
 * 주문 관리 공유 유틸리티
 *
 * 클라이언트/서버 양쪽에서 사용 가능한 유틸리티
 */
import type { Order } from "./orders.server";

/**
 * 주문 상태 설정
 */
export const ORDER_STATUS_MAP: Record<string, { label: string; className: string }> = {
  "결제완료": { label: "결제완료", className: "bg-blue-100 text-blue-800" },
  "상품준비중": { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },
  "상품준비": { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },
  "배송중": { label: "배송중", className: "bg-orange-100 text-orange-800" },
  "배송완료": { label: "배송완료", className: "bg-green-100 text-green-800" },
  "취소": { label: "취소", className: "bg-red-100 text-red-800" },
  "반품": { label: "반품", className: "bg-red-100 text-red-800" },
  "교환": { label: "교환", className: "bg-purple-100 text-purple-800" },
};

/**
 * 쇼핑몰 설정
 */
export const SHOP_MAP: Record<string, { label: string; className: string }> = {
  "cafe24": { label: "Cafe24", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  "naver": { label: "네이버", className: "bg-green-50 text-green-700 border border-green-200" },
};

/**
 * 주문 상태 목록
 */
export const ORDER_STATUSES = [
  { value: "결제완료", label: "결제완료" },
  { value: "상품준비중", label: "상품준비" },
  { value: "배송중", label: "배송중" },
  { value: "배송완료", label: "배송완료" },
  { value: "취소", label: "취소" },
];

/**
 * 쇼핑몰 목록
 */
export const SHOPS = [
  { value: "cafe24", label: "Cafe24" },
  { value: "naver", label: "네이버" },
];

/**
 * 주문 상태별 스타일 가져오기
 */
export function getStatusConfig(status: string) {
  return ORDER_STATUS_MAP[status] || { label: status, className: "bg-gray-100 text-gray-800" };
}

/**
 * 쇼핑몰별 스타일 가져오기
 */
export function getShopConfig(shopCd: string) {
  return SHOP_MAP[shopCd] || { label: shopCd, className: "bg-gray-50 text-gray-700" };
}

/**
 * 주문 조회 URL 빌더
 */
export interface OrderUrlParams {
  q?: string | null;
  status?: string | null;
  shop?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  limit?: string | null;
  page?: string | null;
}

export function buildOrderUrl(
  basePath: string,
  currentParams: OrderUrlParams,
  overrides: Partial<OrderUrlParams> = {}
): string {
  const params = new URLSearchParams();

  const values: OrderUrlParams = {
    q: overrides.q !== undefined ? overrides.q : currentParams.q,
    status: overrides.status !== undefined ? overrides.status : currentParams.status,
    shop: overrides.shop !== undefined ? overrides.shop : currentParams.shop,
    dateFrom: overrides.dateFrom !== undefined ? overrides.dateFrom : currentParams.dateFrom,
    dateTo: overrides.dateTo !== undefined ? overrides.dateTo : currentParams.dateTo,
    sortBy: overrides.sortBy !== undefined ? overrides.sortBy : currentParams.sortBy,
    sortOrder: overrides.sortOrder !== undefined ? overrides.sortOrder : currentParams.sortOrder,
    limit: overrides.limit !== undefined ? overrides.limit : currentParams.limit,
    page: overrides.page !== undefined ? overrides.page : "1",
  };

  Object.entries(values).forEach(([key, value]) => {
    // 기본값이 아닌 경우에만 파라미터 추가
    const isDefault =
      !value ||
      value === "all" ||
      value === "none" ||
      (key === "page" && value === "1") ||
      (key === "limit" && value === "50");

    if (!isDefault) {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

/**
 * CSV 내보내기
 */
export function exportOrdersToCSV(orders: Order[], filename?: string): void {
  const headers = [
    "주문번호",
    "채널",
    "상태",
    "주문자",
    "연락처",
    "주소",
    "금액",
    "수량",
    "주문일시",
    "송장번호",
    "택배사",
  ];

  const rows = orders.map((o) => [
    o.orderNo,
    o.shopCd === "cafe24" ? "Cafe24" : "네이버",
    o.ordStatus,
    o.toName,
    o.toTel || o.toHtel,
    `${o.toAddr1 || ""} ${o.toAddr2 || ""}`.trim(),
    o.totalAmount,
    o.totalQty,
    o.ordTime,
    o.invoiceNo || "",
    o.carrName || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v: any) => `"${v}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `orders_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 날짜 범위 프리셋 계산
 */
export function getDatePreset(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

/**
 * 금액 포맷
 */
export function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString()}`;
}

/**
 * 날짜 포맷
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}
