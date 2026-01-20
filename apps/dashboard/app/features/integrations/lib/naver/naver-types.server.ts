/**
 * 네이버 커머스 API - 타입 정의
 *
 * 모든 네이버 API 관련 타입을 정의합니다.
 */

// ============================================================================
// 토큰/인증 관련
// ============================================================================

export interface NaverToken {
  id: string;
  account_id: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  issued_at: string;
  expires_at: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 주문 관련
// ============================================================================

export interface NaverOrder {
  productOrderId: string;
  orderId: string;
  orderDate: string;
  paymentDate: string;
  orderStatus: string;
  productOrderStatus: string;
  productId: string;
  productName: string;
  productOption: string;
  quantity: number;
  unitPrice: number;
  totalProductAmount: number;
  deliveryFee: number;
  totalPaymentAmount: number;
  ordererName: string;
  ordererTel: string;
  receiverName: string;
  receiverTel: string;
  receiverAddress: string;
  deliveryMemo: string;
  trackingNumber: string;
  deliveryCompanyCode: string;
}

export interface GetOrdersParams {
  orderDateFrom?: string; // YYYY-MM-DDTHH:mm:ss.SSSZ
  orderDateTo?: string;
  productOrderStatus?: string;
  limit?: number;
}

export interface PlaceOrderParams {
  productOrderId: string;
}

export interface GetLastChangedOrdersParams {
  lastChangedFrom: string;
  lastChangedTo: string;
  lastChangedType?:
    | "PAYED"
    | "DELIVERING"
    | "DELIVERED"
    | "PURCHASE_DECIDED"
    | "EXCHANGED"
    | "CANCELED"
    | "RETURNED"
    | "CLAIM_REJECTED";
}

// ============================================================================
// 상품 관련
// ============================================================================

export interface NaverProduct {
  originProductNo: number;
  channelProductNo: number;
  productName: string;
  salePrice: number;
  stockQuantity: number;
  channelProductDisplayStatusType: string;
  statusType: string;
  saleStartDate: string;
  saleEndDate: string;
}

export interface NaverProductDetailed {
  originProductNo: number;
  channelProductNo?: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  productStatusType: string;
  channelProductDisplayStatusType?: string;
  sellerManagementCode?: string;
  saleStartDate?: string;
  saleEndDate?: string;
  representativeImage?: {
    url: string;
  };
  detailAttribute?: {
    naverShoppingSearchInfo?: {
      categoryId?: string;
    };
  };
  optionInfo?: {
    optionCombinations?: NaverProductOption[];
  };
}

export interface NaverProductOption {
  id: number;
  optionName1?: string;
  optionValue1?: string;
  optionName2?: string;
  optionValue2?: string;
  stockQuantity: number;
  price: number;
  sellerManagerCode?: string;
  usable: boolean;
}

export interface GetProductsParams {
  page?: number;
  size?: number;
  productStatusType?: string;
}

export interface NaverProductCreateParams {
  originProduct: {
    statusType: "SALE" | "SUSPENSION" | "WAIT" | "CLOSE" | "PROHIBITION";
    saleType: "NEW" | "OLD";
    leafCategoryId: string;
    name: string;
    detailContent: string;
    images: {
      representativeImage: { url: string };
      optionalImages?: { url: string }[];
    };
    salePrice: number;
    stockQuantity: number;
    deliveryInfo: {
      deliveryType: "DELIVERY" | "DIRECT" | "VISIT_RECEIPT" | "NOTHING";
      deliveryAttributeType: "NORMAL" | "TODAY" | "HOPE" | "DIRECT";
      deliveryFee: {
        deliveryFeeType: "FREE" | "CHARGE" | "CONDITIONAL_FREE" | "CHARGE_BY_QUANTITY";
        baseFee?: number;
        freeConditionalAmount?: number;
      };
      claimDeliveryInfo?: {
        returnDeliveryFee?: number;
        exchangeDeliveryFee?: number;
      };
    };
    productLogistics?: {
      productWeight?: number;
    };
    detailAttribute?: {
      naverShoppingSearchInfo?: {
        manufacturerName?: string;
        brandName?: string;
        modelName?: string;
      };
      afterServiceInfo?: {
        afterServiceTelephoneNumber?: string;
        afterServiceGuideContent?: string;
      };
      originAreaInfo?: {
        originAreaCode?: string;
        content?: string;
      };
      sellerCodeInfo?: {
        sellerManagementCode?: string;
        sellerBarcode?: string;
        sellerCustomCode1?: string;
        sellerCustomCode2?: string;
      };
      optionInfo?: {
        optionCombinationSortType?: "CREATE" | "ABC" | "PRICE" | "STOCK";
        optionCombinationGroupNames?: {
          optionGroupName1?: string;
          optionGroupName2?: string;
        };
        optionCombinations?: {
          optionName1?: string;
          optionName2?: string;
          stockQuantity: number;
          price: number;
          sellerManagerCode?: string;
          usable?: boolean;
        }[];
        useStockManagement?: boolean;
      };
    };
  };
  smartstoreChannelProduct?: {
    channelProductName?: string;
    storeKeepExclusiveProduct?: boolean;
    naverShoppingRegistration?: boolean;
    channelProductDisplayStatusType?: "ON" | "OFF" | "SUSPEND";
  };
}

export interface NaverProductUpdateParams {
  originProductNo: number;
  originProduct?: Partial<NaverProductCreateParams["originProduct"]>;
  smartstoreChannelProduct?: NaverProductCreateParams["smartstoreChannelProduct"];
}

// ============================================================================
// 클레임 관련
// ============================================================================

export interface NaverClaim {
  productOrderId: string;
  claimType: "CANCEL" | "RETURN" | "EXCHANGE";
  claimStatus: string;
  claimRequestDate: string;
  claimReason: string;
  refundExpectedAmount: number;
}

export interface GetClaimsParams {
  claimRequestDateFrom?: string;
  claimRequestDateTo?: string;
  claimType?: "CANCEL" | "RETURN" | "EXCHANGE";
  claimStatus?: string;
}

export interface ClaimApproveParams {
  productOrderId: string;
  memo?: string;
}

export interface ClaimRejectParams {
  productOrderId: string;
  rejectReason: string;
  rejectDetailedReason?: string;
}

export interface ClaimHoldParams {
  productOrderId: string;
  holdReason: string;
  holdDetailedReason?: string;
}

export interface ClaimExchangeDispatchParams {
  productOrderId: string;
  deliveryCompanyCode: string;
  trackingNumber: string;
  dispatchDate?: string;
}

export interface ClaimWithdrawParams {
  productOrderId: string;
}

// ============================================================================
// 정산 관련
// ============================================================================

export interface NaverSettlement {
  settlementTargetId: string;
  settlementTargetDate: string;
  settlementBaseAmount: number;
  commissionAmount: number;
  deliveryFeeSettlementAmount: number;
  expectedSettlementAmount: number;
  productOrderId: string;
  orderId: string;
  productName: string;
  quantity: number;
  sellerBurdenDiscountAmount: number;
  platformDiscountAmount: number;
  knowledgeShoppingCommission: number;
  affiliateCommission: number;
  settlementStatus: string;
}

export interface GetSettlementsParams {
  startDate?: string;
  endDate?: string;
  settlementStatus?: "SETTLEMENT_IN_PROGRESS" | "SETTLEMENT_DONE" | "SETTLEMENT_HOLD";
  page?: number;
  size?: number;
}

// ============================================================================
// 문의 관련
// ============================================================================

/**
 * 네이버 고객 문의 응답 구조
 * GET /v1/pay-user/inquiries 응답
 */
export interface NaverInquiry {
  inquiryNo: number;
  category: string;
  title: string;
  inquiryContent: string;
  inquiryRegistrationDateTime: string;
  answerContentId?: number;
  answerContent?: string;
  answerTemplateNo?: number;
  answerRegistrationDateTime?: string;
  answered: boolean;
  orderId?: string;
  productNo?: string;
  productOrderIdList?: string;
  productName?: string;
  productOrderOption?: string;
  customerId?: string;
  customerName?: string;
  // 호환성을 위한 별칭 (기존 코드 지원)
  inquiryTypeName?: string;
  inquiryStatus?: "WAITING" | "ANSWERED" | "HOLDING";
  content?: string;
  createDate?: string;
  buyerMemberId?: string;
  answerDate?: string;
}

export interface GetInquiriesParams {
  startDate?: string;
  endDate?: string;
  inquiryStatus?: "WAITING" | "ANSWERED" | "HOLDING";
  answered?: boolean;
  page?: number;
  size?: number;
}

export interface InquiryAnswerParams {
  inquiryNo: number;
  answerContent: string;
}

// ============================================================================
// 송장/발송 관련
// ============================================================================

export interface InvoiceSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface InvoiceSendParams {
  productOrderId: string;
  deliveryCompanyCode: string;
  trackingNumber: string;
  dispatchDate?: string;
}

export interface BulkInvoiceSendParams {
  productOrderId: string;
  deliveryCompanyCode: string;
  trackingNumber: string;
}

// ============================================================================
// API 응답 타입
// ============================================================================

export interface NaverApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface NaverListResponse<T> {
  contents: T[];
  totalElements: number;
  totalPages?: number;
  page?: number;
  size?: number;
}
