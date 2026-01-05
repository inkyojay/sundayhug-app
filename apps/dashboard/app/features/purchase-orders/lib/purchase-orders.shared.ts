/**
 * 발주 관리 - 공유 유틸리티 및 타입
 */

import {
  ClipboardListIcon,
  SendIcon,
  FactoryIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

// =====================
// 상수
// =====================

export const ORDER_STATUS_OPTIONS = [
  { value: "draft", label: "작성중", color: "secondary", icon: ClipboardListIcon },
  { value: "sent", label: "발주완료", color: "default", icon: SendIcon },
  { value: "in_production", label: "제작중", color: "outline", icon: FactoryIcon },
  { value: "shipping", label: "배송중", color: "outline", icon: TruckIcon },
  { value: "received", label: "입고완료", color: "default", icon: CheckCircleIcon },
  { value: "cancelled", label: "취소", color: "destructive", icon: XCircleIcon },
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_OPTIONS)[number]["value"];

// =====================
// 타입 정의
// =====================

export interface Factory {
  id: string;
  factory_name: string;
  factory_code: string;
}

export interface Product {
  id: string;
  sku: string;
  product_name: string | null;
  color_kr: string | null;
  sku_6_size: string | null;
  cost_price: number | null;
  parent_sku: string | null;
  parent_product: {
    id: string;
    product_name: string;
  } | null;
}

export interface OrderItem {
  id?: string;
  product_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  received_quantity?: number;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  factory_id: string;
  status: OrderStatusValue;
  order_date: string;
  expected_date: string | null;
  total_quantity: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  factory: Factory | null;
  items: OrderItem[];
}

export interface PurchaseOrderFormData {
  order_number: string;
  factory_id: string;
  status: OrderStatusValue;
  order_date: string;
  expected_date: string;
  notes: string;
}

export interface PurchaseOrderStats {
  draft: number;
  sent: number;
  in_production: number;
  shipping: number;
  received: number;
  cancelled: number;
}

// =====================
// 유틸리티 함수
// =====================

/**
 * 상태 정보 가져오기
 */
export function getStatusInfo(status: string) {
  return ORDER_STATUS_OPTIONS.find((s) => s.value === status) || ORDER_STATUS_OPTIONS[0];
}

/**
 * 날짜 포맷팅 (한국어)
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

/**
 * 통화 포맷팅 (원화)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

/**
 * 통화 포맷팅 (원화 + 단위)
 */
export function formatCurrencyWithUnit(amount: number): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
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
 * 제품 정보를 기반으로 전체 제품명 생성
 */
export function buildFullProductName(product: {
  product_name?: string | null;
  color_kr?: string | null;
  sku_6_size?: string | null;
}): string {
  return [product.product_name, product.color_kr, product.sku_6_size]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * 발주서 텍스트 내보내기 생성
 */
export function generateOrderText(
  order: PurchaseOrderFormData,
  items: OrderItem[],
  factoryName: string | null
): string {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  let content = `발주서\n${"=".repeat(50)}\n\n`;
  content += `발주번호: ${order.order_number}\n`;
  content += `공장: ${factoryName || "-"}\n`;
  content += `발주일: ${order.order_date}\n`;
  content += `예상입고일: ${order.expected_date || "-"}\n\n`;
  content += `품목\n${"-".repeat(50)}\n`;

  items.forEach((item, i) => {
    content += `${i + 1}. ${item.sku} - ${item.product_name}\n`;
    content += `   수량: ${item.quantity}개, 단가: ${formatCurrency(item.unit_price)}원\n`;
  });

  content += `${"-".repeat(50)}\n`;
  content += `총 수량: ${totalQuantity}개\n`;
  content += `총 금액: ${formatCurrency(totalAmount)}원\n`;

  if (order.notes) {
    content += `\n비고: ${order.notes}\n`;
  }

  return content;
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
