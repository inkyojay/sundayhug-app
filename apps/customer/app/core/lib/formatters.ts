/**
 * Shared formatting utilities
 */

/**
 * 전화번호를 하이픈 포함 형식으로 변환 (UI 표시용)
 * @example formatPhoneNumber('01012345678') → '010-1234-5678'
 */
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/[^\d]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}
