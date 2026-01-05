/**
 * 창고 관리 - 공유 유틸리티 및 타입
 */

import { BoxIcon, TruckIcon, type LucideIcon } from "lucide-react";

// ========== 타입 정의 ==========

/** 창고 정보 */
export interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
  location: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

/** 창고 폼 데이터 */
export interface WarehouseFormData {
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: string;
  location: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  notes: string;
  is_active: boolean;
}

/** 창고 유형 옵션 */
export interface WarehouseTypeOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

/** 로더 데이터 */
export interface WarehouseListLoaderData {
  warehouses: Warehouse[];
  search: string;
  typeFilter: string;
  inventoryCounts: Record<string, number>;
}

/** 액션 결과 */
export interface WarehouseActionResult {
  success?: boolean;
  message?: string;
  error?: string;
}

// ========== 상수 ==========

/** 창고 유형 목록 */
export const WAREHOUSE_TYPES: WarehouseTypeOption[] = [
  { value: "owned", label: "자체 창고", icon: BoxIcon },
  { value: "3pl", label: "3PL 물류센터", icon: TruckIcon },
];

/** 빈 폼 데이터 (초기값) */
export const EMPTY_WAREHOUSE_FORM: WarehouseFormData = {
  warehouse_code: "",
  warehouse_name: "",
  warehouse_type: "owned",
  location: "",
  address: "",
  contact_name: "",
  contact_phone: "",
  notes: "",
  is_active: true,
};

// ========== 유틸리티 함수 ==========

/**
 * 창고 유형 라벨 반환
 */
export function getWarehouseTypeLabel(type: string): string {
  return WAREHOUSE_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * Warehouse 객체를 WarehouseFormData로 변환
 */
export function warehouseToFormData(warehouse: Warehouse): WarehouseFormData {
  return {
    warehouse_code: warehouse.warehouse_code,
    warehouse_name: warehouse.warehouse_name,
    warehouse_type: warehouse.warehouse_type,
    location: warehouse.location || "",
    address: warehouse.address || "",
    contact_name: warehouse.contact_name || "",
    contact_phone: warehouse.contact_phone || "",
    notes: warehouse.notes || "",
    is_active: warehouse.is_active,
  };
}

/**
 * 폼 데이터 유효성 검사
 */
export function isValidWarehouseForm(form: WarehouseFormData): boolean {
  return !!(form.warehouse_code.trim() && form.warehouse_name.trim());
}
