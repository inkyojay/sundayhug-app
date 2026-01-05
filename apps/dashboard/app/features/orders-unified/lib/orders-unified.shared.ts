/**
 * 통합 주문 관리 - 공유 타입 및 유틸리티
 *
 * Cafe24, 네이버, 쿠팡 3개 몰 통합 관리
 */

// ===== 채널 타입 =====
export type Channel = "cafe24" | "naver" | "coupang";

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: "cafe24", label: "Cafe24" },
  { value: "naver", label: "네이버" },
  { value: "coupang", label: "쿠팡" },
];

// ===== 주문 상태 =====
export type OrderStatus = "결제완료" | "상품준비중" | "배송중" | "배송완료" | "취소" | "반품" | "교환";

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "결제완료", label: "결제완료" },
  { value: "상품준비중", label: "상품준비" },
  { value: "배송중", label: "배송중" },
  { value: "배송완료", label: "배송완료" },
  { value: "취소", label: "취소" },
];

// ===== 상태별 스타일 =====
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

// ===== 채널별 스타일 =====
export const CHANNEL_MAP: Record<Channel, { label: string; className: string }> = {
  cafe24: { label: "Cafe24", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  naver: { label: "네이버", className: "bg-green-50 text-green-700 border border-green-200" },
  coupang: { label: "쿠팡", className: "bg-orange-50 text-orange-700 border border-orange-200" },
};

// ===== 주문 아이템 =====
export interface OrderItem {
  id: string;
  saleName: string;
  optName: string;
  skuCd: string;
  qty: number;
  amt: number;
}

// ===== 통합 주문 =====
export interface UnifiedOrder {
  key: string;            // shopCd_orderNo 형식의 고유 키
  orderNo: string;        // 주문번호
  channel: Channel;       // 채널 (cafe24, naver, coupang)
  ordStatus: string;      // 주문 상태
  toName: string;         // 수령인
  toTel: string;          // 연락처
  toHtel: string;         // 휴대폰
  toAddr1: string;        // 주소1
  toAddr2: string;        // 주소2
  ordTime: string;        // 주문일시
  invoiceNo: string | null;  // 송장번호
  carrName: string | null;   // 택배사
  customerId: string | null; // 고객 ID
  totalAmount: number;    // 총 금액
  totalQty: number;       // 총 수량
  items: OrderItem[];     // 주문 상품 목록
}

// ===== 주문 통계 =====
export interface OrderStats {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<Channel, number>;
}

// ===== 유틸리티 함수 =====
export function getStatusConfig(status: string) {
  return ORDER_STATUS_MAP[status] || { label: status, className: "bg-gray-100 text-gray-800" };
}

export function getChannelConfig(channel: string) {
  return CHANNEL_MAP[channel as Channel] || { label: channel, className: "bg-gray-50 text-gray-700" };
}

// ===== URL 빌더 =====
export interface OrderUrlParams {
  q?: string | null;
  status?: string | null;
  channel?: string | null;
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
    channel: overrides.channel !== undefined ? overrides.channel : currentParams.channel,
    dateFrom: overrides.dateFrom !== undefined ? overrides.dateFrom : currentParams.dateFrom,
    dateTo: overrides.dateTo !== undefined ? overrides.dateTo : currentParams.dateTo,
    sortBy: overrides.sortBy !== undefined ? overrides.sortBy : currentParams.sortBy,
    sortOrder: overrides.sortOrder !== undefined ? overrides.sortOrder : currentParams.sortOrder,
    limit: overrides.limit !== undefined ? overrides.limit : currentParams.limit,
    page: overrides.page !== undefined ? overrides.page : "1",
  };

  Object.entries(values).forEach(([key, value]) => {
    const isDefault =
      !value ||
      value === "all" ||
      (key === "page" && value === "1") ||
      (key === "limit" && value === "50");

    if (!isDefault) {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

// ===== CSV 내보내기 =====
export function exportOrdersToCSV(orders: UnifiedOrder[], filename?: string): void {
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

  const channelLabels: Record<Channel, string> = {
    cafe24: "Cafe24",
    naver: "네이버",
    coupang: "쿠팡",
  };

  const rows = orders.map((o) => [
    o.orderNo,
    channelLabels[o.channel] || o.channel,
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
  link.download = filename || `orders_unified_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ===== 날짜 프리셋 =====
export function getDatePreset(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// ===== 포맷 유틸리티 =====
export function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString()}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("ko-KR");
}
