/**
 * 공장 관리 - 공유 유틸리티 및 타입
 */

// ========== 타입 정의 ==========

/** 공장 정보 */
export interface Factory {
  id: string;
  factory_code: string;
  factory_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/** 공장 폼 데이터 */
export interface FactoryFormData {
  factory_code: string;
  factory_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  notes: string;
  is_active: boolean;
}

/** 로더 데이터 */
export interface FactoryListLoaderData {
  factories: Factory[];
  search: string;
}

/** 액션 결과 */
export interface FactoryActionResult {
  success?: boolean;
  message?: string;
  error?: string;
}

/** 제조원가 정보 */
export interface FactoryProductCost {
  id: string;
  factory_id: string;
  product_id: string | null;
  sku: string;
  cost_without_vat: number;
  vat_amount: number;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  product?: {
    id: string;
    product_name: string;
    color_kr: string;
    sku_6_size: string;
  };
}

/** 제조원가 폼 데이터 */
export interface FactoryProductCostFormData {
  sku: string;
  product_id: string;
  cost_without_vat: string;
  vat_amount: string;
  notes: string;
}

/** 제조원가 로더 데이터 */
export interface FactoryProductCostsLoaderData {
  factory: Factory | null;
  products: any[];
  costs: FactoryProductCost[];
}

// ========== 상수 ==========

/** 빈 폼 데이터 (초기값) */
export const EMPTY_FACTORY_FORM: FactoryFormData = {
  factory_code: "",
  factory_name: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  notes: "",
  is_active: true,
};

/** 빈 제조원가 폼 데이터 */
export const EMPTY_COST_FORM: FactoryProductCostFormData = {
  sku: "",
  product_id: "",
  cost_without_vat: "",
  vat_amount: "",
  notes: "",
};

// ========== 유틸리티 함수 ==========

/**
 * Factory 객체를 FactoryFormData로 변환
 */
export function factoryToFormData(factory: Factory): FactoryFormData {
  return {
    factory_code: factory.factory_code,
    factory_name: factory.factory_name,
    contact_name: factory.contact_name || "",
    contact_phone: factory.contact_phone || "",
    contact_email: factory.contact_email || "",
    address: factory.address || "",
    notes: factory.notes || "",
    is_active: factory.is_active,
  };
}

/**
 * 폼 데이터 유효성 검사
 */
export function isValidFactoryForm(form: FactoryFormData): boolean {
  return !!(form.factory_code.trim() && form.factory_name.trim());
}

/**
 * 제조원가를 폼 데이터로 변환
 */
export function costToFormData(cost: FactoryProductCost): FactoryProductCostFormData {
  return {
    sku: cost.sku,
    product_id: cost.product_id || "",
    cost_without_vat: String(cost.cost_without_vat || 0),
    vat_amount: String(cost.vat_amount || 0),
    notes: cost.notes || "",
  };
}

/**
 * 금액 포맷팅
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}
