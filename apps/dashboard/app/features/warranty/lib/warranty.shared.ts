/**
 * Warranty 공유 유틸리티 및 타입
 */

// ============================================
// 상태 관련 타입 및 상수
// ============================================

export type WarrantyStatus = "pending" | "approved" | "rejected" | "expired";

export type AsRequestStatus = "received" | "processing" | "completed" | "cancelled";

export type AsRequestType = "repair" | "exchange" | "refund" | "inquiry";

export interface StatusConfig {
  label: string;
  className: string;
}

export interface StatusConfigWithIcon {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: any;
}

export const WARRANTY_STATUS_CONFIG: Record<WarrantyStatus, StatusConfig> = {
  pending: { label: "승인 대기", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "승인 완료", className: "bg-green-100 text-green-800" },
  rejected: { label: "거절", className: "bg-red-100 text-red-800" },
  expired: { label: "만료", className: "bg-gray-100 text-gray-800" },
};

export const AS_STATUS_CONFIG: Record<AsRequestStatus, StatusConfig & { variant: string }> = {
  received: { label: "접수", className: "", variant: "outline" },
  processing: { label: "처리중", className: "", variant: "secondary" },
  completed: { label: "완료", className: "", variant: "default" },
  cancelled: { label: "취소", className: "", variant: "destructive" },
};

export const AS_TYPE_CONFIG: Record<AsRequestType, string> = {
  repair: "수리",
  exchange: "교환",
  refund: "환불",
  inquiry: "문의",
};

// ============================================
// 보증서 타입
// ============================================

export interface Warranty {
  id: string;
  warranty_number: string;
  tracking_number: string | null;
  customer_phone: string | null;
  buyer_name: string | null;
  product_name: string | null;
  product_option: string | null;
  product_sku: string | null;
  product_photo_url: string | null;
  photo_uploaded_at: string | null;
  sales_channel: string | null;
  order_id: string | null;
  order_date: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  status: WarrantyStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  kakao_sent: boolean;
  kakao_sent_at: string | null;
  kakao_message_id: string | null;
  user_id: string | null;
  customer_id: string | null;
  created_at: string;
}

export interface WarrantyWithRelations extends Warranty {
  customers?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    kakao_id: string | null;
    kakao_nickname: string | null;
  } | null;
  warranty_products?: {
    id: string;
    product_code: string | null;
    product_name: string | null;
    category: string | null;
    warranty_months: number | null;
    product_image_url: string | null;
  } | null;
}

export interface AsRequest {
  id: string;
  warranty_id: string;
  request_type: AsRequestType;
  issue_description: string;
  status: AsRequestStatus;
  contact_name: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WarrantyLog {
  id: string;
  warranty_id: string;
  action: string;
  description: string | null;
  created_at: string;
}

// ============================================
// 제품 관련 상수
// ============================================

export interface WarrantyProduct {
  id: string;
  name: string;
  description: string;
  warrantyPeriod: string;
}

export const WARRANTY_PRODUCTS: WarrantyProduct[] = [
  {
    id: "abc-bed",
    name: "ABC 이동식 아기침대",
    description: "접이식 아기침대",
    warrantyPeriod: "1년",
  },
];

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 보증서 상태 라벨 가져오기
 */
export function getWarrantyStatusLabel(status: string): string {
  return WARRANTY_STATUS_CONFIG[status as WarrantyStatus]?.label || status;
}

/**
 * 보증서 상태 클래스 가져오기
 */
export function getWarrantyStatusClass(status: string): string {
  return WARRANTY_STATUS_CONFIG[status as WarrantyStatus]?.className || "";
}

/**
 * A/S 상태 라벨 가져오기
 */
export function getAsStatusLabel(status: string): string {
  return AS_STATUS_CONFIG[status as AsRequestStatus]?.label || status;
}

/**
 * A/S 유형 라벨 가져오기
 */
export function getAsTypeLabel(type: string): string {
  return AS_TYPE_CONFIG[type as AsRequestType] || type;
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

/**
 * 날짜/시간 포맷팅
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("ko-KR");
}

/**
 * 남은 보증 기간 계산 (일)
 */
export function getDaysRemaining(warrantyEnd: string | null): number {
  if (!warrantyEnd) return 0;
  return Math.ceil(
    (new Date(warrantyEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * 보증 만료 여부 확인
 */
export function isWarrantyExpired(warrantyEnd: string | null): boolean {
  if (!warrantyEnd) return false;
  return new Date(warrantyEnd) < new Date();
}

/**
 * 전화번호 포맷팅 (010-1234-5678 형식)
 */
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/[^\d]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * 전화번호에서 하이픈 제거
 */
export function removePhoneHyphens(phone: string): string {
  return phone.replace(/-/g, "");
}

/**
 * CSV 내보내기용 데이터 생성
 */
export function generateWarrantyCsvData(warranties: any[]): string {
  const headers = [
    "보증서번호",
    "구매자명",
    "연락처",
    "제품명",
    "옵션",
    "송장번호",
    "상태",
    "보증시작",
    "보증종료",
    "등록일",
  ];

  const rows = warranties.map((w) => [
    w.warranty_number,
    w.buyer_name || "",
    w.customer_phone || "",
    w.product_name || "",
    w.product_option || "",
    w.tracking_number || "",
    getWarrantyStatusLabel(w.status),
    w.warranty_start ? formatDate(w.warranty_start) : "",
    w.warranty_end ? formatDate(w.warranty_end) : "",
    formatDate(w.created_at),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  return "\uFEFF" + csvContent; // BOM for UTF-8
}

/**
 * URL 쿼리 파라미터 생성
 */
export function buildWarrantyListUrl(
  basePath: string,
  params: {
    search?: string | null;
    status?: string | null;
    page?: string | null;
    limit?: string | null;
    sortBy?: string | null;
    sortOrder?: string | null;
  }
): string {
  const urlParams = new URLSearchParams();

  if (params.search) urlParams.set("search", params.search);
  if (params.status && params.status !== "all") urlParams.set("status", params.status);
  if (params.page && params.page !== "1") urlParams.set("page", params.page);
  if (params.limit && params.limit !== "50") urlParams.set("limit", params.limit);
  if (params.sortBy && params.sortBy !== "created_at") urlParams.set("sortBy", params.sortBy);
  if (params.sortOrder && params.sortOrder !== "desc") urlParams.set("sortOrder", params.sortOrder);

  const queryString = urlParams.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

/**
 * A/S 목록 URL 생성
 */
export function buildAsListUrl(
  basePath: string,
  params: {
    status?: string | null;
    type?: string | null;
    page?: string | null;
  }
): string {
  const urlParams = new URLSearchParams();

  if (params.status && params.status !== "all") urlParams.set("status", params.status);
  if (params.type && params.type !== "all") urlParams.set("type", params.type);
  if (params.page && params.page !== "1") urlParams.set("page", params.page);

  const queryString = urlParams.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}
