/**
 * 네이버 커머스 API 클라이언트
 *
 * 네이버 스마트스토어 API와 통신하는 서버 유틸리티입니다.
 * 토큰 자동 갱신, API 호출 등을 처리합니다.
 *
 * 참고: https://apicenter.commerce.naver.com/docs/introduction
 *
 * 이 파일은 하위 호환성을 위한 re-export 허브입니다.
 * 실제 구현은 ./naver/ 폴더에 모듈화되어 있습니다.
 */

// ============================================================================
// Re-export all from naver modules
// ============================================================================

// 타입 정의
export type {
  NaverToken,
  NaverOrder,
  NaverProduct,
  NaverProductDetailed,
  NaverProductOption,
  NaverClaim,
  NaverSettlement,
  NaverInquiry,
  GetOrdersParams,
  GetProductsParams,
  GetClaimsParams,
  GetSettlementsParams,
  GetInquiriesParams,
  PlaceOrderParams,
  GetLastChangedOrdersParams,
  ClaimApproveParams,
  ClaimRejectParams,
  ClaimHoldParams,
  ClaimExchangeDispatchParams,
  ClaimWithdrawParams,
  NaverProductCreateParams,
  NaverProductUpdateParams,
  InquiryAnswerParams,
  InvoiceSendResult,
  InvoiceSendParams,
  BulkInvoiceSendParams,
  NaverApiResponse,
  NaverListResponse,
} from "./naver/naver-types.server";

// 인증/공통
export {
  NAVER_API_BASE,
  getProxyUrl,
  getProxyApiKey,
  getNaverToken,
  isTokenExpired,
  refreshNaverToken,
  getValidToken,
  naverFetch,
  testConnection,
  disconnectNaver,
  toKSTString,
  normalizeNaverDateTime,
} from "./naver/naver-auth.server";

// 주문 API
export {
  getOrders,
  getOrderDetails,
  getLastChangedOrders,
  placeOrder,
  placeOrdersBulk,
  sendInvoiceToNaver,
  sendInvoicesToNaverBulk,
} from "./naver/naver-orders.server";

// 상품 API
export {
  getProducts,
  getProductListDetailed,
  getChannelProduct,
  getOriginProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductOptionStock,
  updateProductStock,
  getCategories,
  getCategoryDetail,
} from "./naver/naver-products.server";

// 클레임 API (취소/반품/교환)
export {
  getClaims,
  // 취소
  approveCancelClaim,
  rejectCancelClaim,
  withdrawCancelClaim,
  // 반품
  approveReturnClaim,
  rejectReturnClaim,
  holdReturnClaim,
  releaseReturnClaimHold,
  withdrawReturnClaim,
  // 교환
  completeExchangeCollect,
  dispatchExchange,
  holdExchangeClaim,
  releaseExchangeClaimHold,
  rejectExchangeClaim,
  withdrawExchangeClaim,
} from "./naver/naver-claims.server";

// 정산 API
export {
  getSettlements,
  getSettlementDetail,
  getExpectedSettlements,
} from "./naver/naver-settlements.server";

// 문의 API
export {
  // 고객 문의 (주문 관련)
  getCustomerInquiries,
  getInquiries, // deprecated alias
  answerInquiry,
  updateInquiryAnswer,
  getUnansweredCustomerInquiryCount,
  getUnansweredInquiryCount, // deprecated alias
  // 상품 문의 (Q&A)
  getProductQnas,
  answerProductQna,
  getUnansweredProductQnaCount,
} from "./naver/naver-inquiries.server";
