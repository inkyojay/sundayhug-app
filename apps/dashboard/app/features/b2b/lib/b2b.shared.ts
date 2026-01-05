/**
 * B2B 관리 - 공유 유틸리티 및 타입
 */

import {
  FileTextIcon,
  SendIcon,
  CheckCircleIcon,
  ReceiptIcon,
  PackageIcon,
  TruckIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  GlobeIcon,
  type LucideIcon,
} from "lucide-react";

// =====================
// 상수
// =====================

/**
 * 주문 상태 옵션
 */
export const ORDER_STATUS_OPTIONS = [
  { value: "quote_draft", label: "견적 작성중", color: "secondary", icon: FileTextIcon },
  { value: "quote_sent", label: "견적 발송", color: "default", icon: SendIcon },
  { value: "confirmed", label: "주문 확정", color: "default", icon: CheckCircleIcon },
  { value: "invoice_created", label: "인보이스 발행", color: "outline", icon: ReceiptIcon },
  { value: "shipping", label: "출고 준비", color: "outline", icon: PackageIcon },
  { value: "shipped", label: "출고 완료", color: "default", icon: TruckIcon },
  { value: "completed", label: "완료", color: "default", icon: CheckCircleIcon },
  { value: "cancelled", label: "취소", color: "destructive", icon: XCircleIcon },
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_OPTIONS)[number]["value"];
export type OrderStatusColor = "default" | "secondary" | "destructive" | "outline";

/**
 * 결제 상태 옵션
 */
export const PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "미결제", color: "secondary" },
  { value: "partial", label: "부분결제", color: "outline" },
  { value: "paid", label: "결제완료", color: "default" },
] as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUS_OPTIONS)[number]["value"];

/**
 * 출고 상태 옵션
 */
export const SHIPMENT_STATUS_OPTIONS = [
  { value: "pending", label: "대기", color: "secondary" },
  { value: "preparing", label: "준비중", color: "outline" },
  { value: "shipped", label: "출고완료", color: "default" },
  { value: "delivered", label: "배송완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
] as const;

export type ShipmentStatusValue = (typeof SHIPMENT_STATUS_OPTIONS)[number]["value"];

/**
 * 업체 유형 옵션
 */
export const BUSINESS_TYPE_OPTIONS = [
  { value: "domestic", label: "국내", icon: MapPinIcon },
  { value: "overseas", label: "해외", icon: GlobeIcon },
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPE_OPTIONS)[number]["value"];

/**
 * 국가 코드 목록
 */
export const COUNTRIES = [
  { code: "KR", name: "한국" },
  { code: "US", name: "미국" },
  { code: "JP", name: "일본" },
  { code: "CN", name: "중국" },
  { code: "VN", name: "베트남" },
  { code: "TH", name: "태국" },
  { code: "SG", name: "싱가포르" },
  { code: "MY", name: "말레이시아" },
  { code: "ID", name: "인도네시아" },
  { code: "PH", name: "필리핀" },
  { code: "AU", name: "호주" },
  { code: "DE", name: "독일" },
  { code: "FR", name: "프랑스" },
  { code: "GB", name: "영국" },
  { code: "CA", name: "캐나다" },
] as const;

/**
 * 통화 목록
 */
export const CURRENCIES = [
  { code: "KRW", name: "원 (KRW)" },
  { code: "USD", name: "달러 (USD)" },
  { code: "EUR", name: "유로 (EUR)" },
  { code: "JPY", name: "엔 (JPY)" },
  { code: "CNY", name: "위안 (CNY)" },
] as const;

// =====================
// 타입 정의
// =====================

export interface B2BCustomer {
  id: string;
  customer_code: string;
  company_name: string;
  company_name_en: string | null;
  business_type: BusinessTypeValue;
  country_code: string;
  business_registration_no: string | null;
  representative_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_position: string | null;
  address: string | null;
  address_en: string | null;
  shipping_address: string | null;
  shipping_address_en: string | null;
  payment_terms: string | null;
  currency: string;
  notes: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface B2BOrderItem {
  id?: string;
  order_id?: string;
  parent_sku: string;
  product_name: string;
  product_name_en?: string | null;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  line_total: number;
  notes?: string | null;
}

export interface B2BOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatusValue;
  order_date: string;
  quote_valid_until: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatusValue;
  payment_terms: string | null;
  shipping_address: string | null;
  shipping_address_en: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
  customer?: B2BCustomer | null;
  items?: B2BOrderItem[];
}

export interface B2BShipmentItem {
  id?: string;
  shipment_id?: string;
  order_item_id: string | null;
  sku: string;
  product_id: string | null;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  box_number: number | null;
}

export interface B2BShipment {
  id: string;
  order_id: string;
  shipment_number: string;
  warehouse_id: string | null;
  status: ShipmentStatusValue;
  planned_date: string | null;
  shipped_date: string | null;
  shipping_method: string | null;
  carrier_name: string | null;
  tracking_number: string | null;
  shipping_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  items?: B2BShipmentItem[];
}

export interface B2BCustomerPrice {
  id: string;
  customer_id: string;
  parent_sku: string;
  unit_price: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  parent_product?: {
    parent_sku: string;
    product_name: string;
    category: string | null;
  } | null;
}

export interface B2BDocument {
  id: string;
  order_id: string;
  document_type: string;
  file_url: string;
  generated_at: string;
}

export interface B2BCustomerStats {
  total: number;
  domestic: number;
  overseas: number;
  active: number;
}

export interface B2BOrderStats {
  quote_draft: number;
  quote_sent: number;
  confirmed: number;
  invoice_created: number;
  shipping: number;
  shipped: number;
  completed: number;
  cancelled: number;
}

// =====================
// 유틸리티 함수
// =====================

/**
 * 주문 상태 정보 가져오기
 */
export function getOrderStatusInfo(status: string) {
  return ORDER_STATUS_OPTIONS.find((s) => s.value === status) || ORDER_STATUS_OPTIONS[0];
}

/**
 * 주문 상태 뱃지 variant 가져오기
 */
export function getOrderStatusBadgeVariant(status: string): OrderStatusColor {
  const info = getOrderStatusInfo(status);
  return info.color as OrderStatusColor;
}

/**
 * 결제 상태 정보 가져오기
 */
export function getPaymentStatusInfo(status: string) {
  return PAYMENT_STATUS_OPTIONS.find((s) => s.value === status) || PAYMENT_STATUS_OPTIONS[0];
}

/**
 * 출고 상태 정보 가져오기
 */
export function getShipmentStatusInfo(status: string) {
  return SHIPMENT_STATUS_OPTIONS.find((s) => s.value === status) || SHIPMENT_STATUS_OPTIONS[0];
}

/**
 * 업체 유형 정보 가져오기
 */
export function getBusinessTypeInfo(type: string) {
  return BUSINESS_TYPE_OPTIONS.find((t) => t.value === type) || BUSINESS_TYPE_OPTIONS[0];
}

/**
 * 날짜 포맷팅 (한국어)
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

/**
 * 날짜/시간 포맷팅 (한국어)
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("ko-KR");
}

/**
 * 통화 포맷팅
 */
export function formatCurrency(amount: number, currency: string = "KRW"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
}

/**
 * 숫자 포맷팅
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("ko-KR").format(num);
}

/**
 * 오늘 날짜 문자열 (YYYYMMDD)
 */
export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * CSV 파싱 함수
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * 텍스트 파일 다운로드
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * CSV 파일 다운로드
 */
export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
