/**
 * 네이버 문의 관리 컴포넌트
 *
 * 병렬 개발을 위해 각 컴포넌트를 독립적으로 export
 */

// 고객 문의 (주문 관련)
export { InquiryStatsCards } from "./InquiryStatsCards";
export { InquiryStatusBadge, type InquiryStatus } from "./InquiryStatusBadge";
export { InquiryFilters, type InquiryFilterValues, type InquiryStatusFilter } from "./InquiryFilters";
export { InquiryTable } from "./InquiryTable";
export { InquiryDetailSheet } from "./InquiryDetailSheet";
export { InquiryTemplateSelect, type InquiryTemplate } from "./InquiryTemplateSelect";

// 상품 문의 (Q&A)
export { ProductQnaTable } from "./ProductQnaTable";
export { ProductQnaDetailSheet } from "./ProductQnaDetailSheet";

// 통합 테이블
export { UnifiedInquiryTable } from "./UnifiedInquiryTable";
