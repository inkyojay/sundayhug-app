/**
 * 상태 배지 설정 통합
 *
 * 주문, 보증서, 재고 등 다양한 상태에 대한 배지 스타일을 통합 관리합니다.
 */

/**
 * 배지 스타일 설정
 */
export interface StatusConfig {
  label: string;
  className: string;
  bgColor?: string;
  textColor?: string;
}

// ===== 주문 상태 =====

export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  // 결제 상태
  결제완료: { label: "결제완료", className: "bg-blue-100 text-blue-800" },
  입금완료: { label: "입금완료", className: "bg-blue-100 text-blue-800" },
  PAID: { label: "결제완료", className: "bg-blue-100 text-blue-800" },

  // 준비 상태
  상품준비중: { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },
  상품준비: { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },
  PREPARING: { label: "상품준비", className: "bg-yellow-100 text-yellow-800" },

  // 배송 상태
  배송중: { label: "배송중", className: "bg-orange-100 text-orange-800" },
  SHIPPING: { label: "배송중", className: "bg-orange-100 text-orange-800" },

  // 완료 상태
  배송완료: { label: "배송완료", className: "bg-green-100 text-green-800" },
  수취확인: { label: "수취확인", className: "bg-green-100 text-green-800" },
  DELIVERED: { label: "배송완료", className: "bg-green-100 text-green-800" },

  // 취소/반품 상태
  취소: { label: "취소", className: "bg-red-100 text-red-800" },
  취소완료: { label: "취소", className: "bg-red-100 text-red-800" },
  환불: { label: "환불", className: "bg-red-100 text-red-800" },
  환불완료: { label: "환불", className: "bg-red-100 text-red-800" },
  반품: { label: "반품", className: "bg-red-100 text-red-800" },
  반품완료: { label: "반품", className: "bg-red-100 text-red-800" },
  CANCELED: { label: "취소", className: "bg-red-100 text-red-800" },
  REFUND: { label: "환불", className: "bg-red-100 text-red-800" },

  // 교환 상태
  교환: { label: "교환", className: "bg-purple-100 text-purple-800" },
  교환완료: { label: "교환완료", className: "bg-purple-100 text-purple-800" },
};

// ===== 보증서 상태 =====

export const WARRANTY_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: "대기", className: "bg-gray-100 text-gray-800" },
  approved: { label: "승인", className: "bg-green-100 text-green-800" },
  rejected: { label: "거절", className: "bg-red-100 text-red-800" },
  expired: { label: "만료", className: "bg-yellow-100 text-yellow-800" },
};

// ===== 채널 배지 =====

export const CHANNEL_CONFIG: Record<string, StatusConfig> = {
  cafe24: { label: "Cafe24", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  naver: { label: "네이버", className: "bg-green-50 text-green-700 border border-green-200" },
  coupang: { label: "쿠팡", className: "bg-orange-50 text-orange-700 border border-orange-200" },
};

// ===== 재고 상태 =====

export const INVENTORY_STATUS_CONFIG: Record<string, StatusConfig> = {
  inStock: { label: "재고있음", className: "bg-green-100 text-green-800" },
  lowStock: { label: "재고부족", className: "bg-yellow-100 text-yellow-800" },
  outOfStock: { label: "품절", className: "bg-red-100 text-red-800" },
};

// ===== A/S 상태 =====

export const AS_STATUS_CONFIG: Record<string, StatusConfig> = {
  received: { label: "접수", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "처리중", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "완료", className: "bg-green-100 text-green-800" },
  cancelled: { label: "취소", className: "bg-gray-100 text-gray-800" },
};

// ===== 활성화 상태 =====

export const ACTIVE_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { label: "활성", className: "bg-green-100 text-green-800" },
  inactive: { label: "비활성", className: "bg-gray-100 text-gray-500" },
};

// ===== 유틸리티 함수 =====

/**
 * 상태 설정 가져오기 (기본값 포함)
 */
export function getStatusConfig(
  configMap: Record<string, StatusConfig>,
  status: string
): StatusConfig {
  return configMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
}

/**
 * 주문 상태 설정 가져오기
 */
export function getOrderStatusConfig(status: string): StatusConfig {
  return getStatusConfig(ORDER_STATUS_CONFIG, status);
}

/**
 * 보증서 상태 설정 가져오기
 */
export function getWarrantyStatusConfig(status: string): StatusConfig {
  return getStatusConfig(WARRANTY_STATUS_CONFIG, status);
}

/**
 * 채널 설정 가져오기
 */
export function getChannelConfig(channel: string): StatusConfig {
  return getStatusConfig(CHANNEL_CONFIG, channel);
}

/**
 * 재고 상태 결정
 */
export function getInventoryStatus(
  quantity: number,
  lowStockThreshold: number = 10
): "inStock" | "lowStock" | "outOfStock" {
  if (quantity <= 0) return "outOfStock";
  if (quantity <= lowStockThreshold) return "lowStock";
  return "inStock";
}

/**
 * 재고 상태 설정 가져오기
 */
export function getInventoryStatusConfig(
  quantity: number,
  lowStockThreshold: number = 10
): StatusConfig {
  const status = getInventoryStatus(quantity, lowStockThreshold);
  return INVENTORY_STATUS_CONFIG[status];
}
