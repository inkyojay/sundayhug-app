/**
 * 공통 포맷팅 유틸리티
 *
 * 통화, 숫자, 퍼센트, 전화번호 등의 포맷팅 함수 모음
 */

/**
 * 원화 포맷팅 (전체 형식)
 * @example formatCurrency(1234567) => "₩1,234,567"
 */
export function formatCurrency(value: number): string {
  return `₩${value.toLocaleString("ko-KR")}`;
}

/**
 * 원화 축약 포맷팅 (한국어)
 * @example formatCurrencyShort(150000000) => "1.5억"
 * @example formatCurrencyShort(50000000) => "5.0천만"
 * @example formatCurrencyShort(1500000) => "1.5M"
 * @example formatCurrencyShort(500000) => "500K"
 */
export function formatCurrencyShort(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(1)}천만`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return value.toLocaleString("ko-KR");
}

/**
 * 숫자 포맷팅 (천 단위 콤마)
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

/**
 * 퍼센트 포맷팅
 * @example formatPercent(12.345) => "12.3%"
 * @example formatPercent(12.345, 0) => "12%"
 * @example formatPercent(12.345, 2) => "12.35%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 전화번호 마스킹
 * @example maskPhone("01012345678") => "010-****-5678"
 * @example maskPhone("010-1234-5678") => "010-****-5678"
 */
export function maskPhone(phone: string): string {
  // 숫자만 추출
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    // 010-XXXX-XXXX 형식
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    // 02-XXXX-XXXX 또는 031-XXX-XXXX 형식
    if (digits.startsWith("02")) {
      return `02-****-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  }

  // 기타 형식은 마지막 4자리만 표시
  if (digits.length >= 4) {
    return `****-${digits.slice(-4)}`;
  }

  return phone;
}
