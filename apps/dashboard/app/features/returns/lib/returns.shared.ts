/**
 * 교환/반품/AS 관리 - 공유 유틸리티 및 타입
 */
import {
  RotateCcwIcon,
  ArrowLeftRightIcon,
  WrenchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 교환/반품/AS 유형
export interface ReturnType {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const RETURN_TYPES: ReturnType[] = [
  { value: "exchange", label: "교환", icon: ArrowLeftRightIcon, color: "default" },
  { value: "return", label: "반품", icon: RotateCcwIcon, color: "secondary" },
  { value: "repair", label: "수리(AS)", icon: WrenchIcon, color: "outline" },
];

// 상태
export interface ReturnStatus {
  value: string;
  label: string;
  color: string;
}

export const RETURN_STATUSES: ReturnStatus[] = [
  { value: "received", label: "접수", color: "secondary" },
  { value: "pickup_scheduled", label: "수거예정", color: "outline" },
  { value: "pickup_completed", label: "수거완료", color: "outline" },
  { value: "inspecting", label: "검수중", color: "outline" },
  { value: "processing", label: "처리중", color: "default" },
  { value: "shipped", label: "발송완료", color: "default" },
  { value: "refunded", label: "환불완료", color: "default" },
  { value: "completed", label: "완료", color: "default" },
  { value: "cancelled", label: "취소", color: "destructive" },
];

// 활성 상태 목록
export const ACTIVE_STATUSES = [
  "received",
  "pickup_scheduled",
  "pickup_completed",
  "inspecting",
  "processing",
  "shipped",
  "refunded",
];

// 채널
export interface Channel {
  value: string;
  label: string;
}

export const CHANNELS: Channel[] = [
  { value: "cafe24", label: "카페24" },
  { value: "naver", label: "네이버" },
  { value: "coupang", label: "쿠팡" },
  { value: "11st", label: "11번가" },
  { value: "gmarket", label: "G마켓" },
  { value: "auction", label: "옥션" },
  { value: "other", label: "기타" },
];

// 유형 정보 가져오기
export function getTypeInfo(type: string): ReturnType {
  return RETURN_TYPES.find((t) => t.value === type) || RETURN_TYPES[0];
}

// 상태 정보 가져오기
export function getStatusInfo(status: string): ReturnStatus {
  return RETURN_STATUSES.find((s) => s.value === status) || RETURN_STATUSES[0];
}

// 채널 정보 가져오기
export function getChannelInfo(channel: string): Channel | undefined {
  return CHANNELS.find((c) => c.value === channel);
}

// 창고 타입
export interface Warehouse {
  id: string;
  warehouse_name: string;
  warehouse_code?: string;
}

// 상품 타입
export interface Product {
  id: string;
  sku: string;
  product_name: string;
  color_kr: string | null;
  sku_6_size: string | null;
}

// 교환/반품 품목 타입
export interface ReturnExchangeItem {
  id: string;
  sku: string;
  product_name: string;
  option_name: string | null;
  quantity: number;
  condition: string;
  restock_quantity: number | null;
  product_id?: string | null;
  return_reason?: string | null;
}

// 교환/반품 타입
export interface ReturnExchange {
  id: string;
  return_number: string;
  order_number: string | null;
  channel: string | null;
  return_type: string;
  status: string;
  reason: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  return_date: string;
  completed_date: string | null;
  restocked: boolean;
  restock_warehouse_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  restock_warehouse: Warehouse | null;
  items: ReturnExchangeItem[];
}

// 통계 타입
export interface ReturnStats {
  received: number;
  processing: number;
  exchange: number;
  return: number;
  repair: number;
}

// 필터 타입
export interface ReturnFilters {
  search: string;
  typeFilter: string;
  statusFilter: string;
  channelFilter: string;
}

// 주문 검색 결과 타입
export interface OrderSearchResult {
  channel: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{
    sku: string;
    product_name: string;
    option_name: string;
    quantity: number;
  }>;
}

// 품목 입력 타입
export interface ReturnItemInput {
  product_id: string | null;
  sku: string;
  product_name: string;
  option_name: string;
  quantity: number;
  return_reason: string;
  condition: string;
}
