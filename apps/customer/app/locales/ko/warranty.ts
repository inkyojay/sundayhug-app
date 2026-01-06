/**
 * 보증서 번역 - 한국어
 */
export default {
  // 메인
  title: "정품 인증",
  subtitle: "제품 보증서를 등록하고 프리미엄 혜택을 받으세요",

  // 등록
  register: {
    title: "보증서 등록",
    serialNumber: "시리얼 넘버",
    serialPlaceholder: "제품 뒷면의 시리얼 넘버를 입력하세요",
    scanQr: "QR 코드 스캔",
    orEnterManually: "또는 직접 입력",
    purchaseDate: "구매일",
    purchasePlace: "구매처",
    selectPlace: "구매처를 선택하세요",
    places: {
      official: "공식 스토어",
      coupang: "쿠팡",
      naver: "네이버 스마트스토어",
      other: "기타",
    },
    submit: "등록하기",
    success: "보증서가 등록되었습니다!",
  },

  // 목록
  list: {
    title: "내 보증서",
    empty: "등록된 보증서가 없습니다",
    registerFirst: "첫 번째 보증서를 등록해 보세요",
    addNew: "새 보증서 등록",
    viewDetail: "상세 보기",
  },

  // 상세
  detail: {
    title: "보증서 상세",
    productInfo: "제품 정보",
    productName: "제품명",
    serialNumber: "시리얼 넘버",
    registrationDate: "등록일",
    purchaseDate: "구매일",
    purchasePlace: "구매처",
    warrantyPeriod: "보증 기간",
    expiryDate: "만료일",
    status: {
      active: "유효",
      expired: "만료됨",
      pending: "검토 중",
    },

    // 혜택
    benefits: {
      title: "보증 혜택",
      freeRepair: "무상 수리",
      freeRepairDesc: "보증 기간 내 무상 수리 서비스",
      discount: "수리비 할인",
      discountDesc: "보증 기간 이후 수리비 20% 할인",
      priority: "우선 처리",
      priorityDesc: "A/S 접수 시 우선 처리",
    },
  },

  // A/S 신청
  asRequest: {
    title: "A/S 신청",
    selectProduct: "제품 선택",
    issueType: "문의 유형",
    types: {
      repair: "수리 요청",
      exchange: "교환 요청",
      refund: "환불 요청",
      inquiry: "일반 문의",
    },
    description: "상세 내용",
    descriptionPlaceholder: "증상이나 문의 내용을 자세히 적어주세요",
    attachPhoto: "사진 첨부",
    attachPhotoDesc: "증상을 확인할 수 있는 사진을 첨부해 주세요",
    submit: "신청하기",
    success: "A/S 신청이 접수되었습니다",
  },

  // A/S 목록
  asList: {
    title: "A/S 신청 내역",
    empty: "신청 내역이 없습니다",
    status: {
      pending: "접수됨",
      inProgress: "처리 중",
      completed: "완료",
      cancelled: "취소됨",
    },
  },

  // 검증
  validation: {
    serialRequired: "시리얼 넘버를 입력해주세요",
    serialInvalid: "올바른 시리얼 넘버 형식이 아닙니다",
    serialExists: "이미 등록된 시리얼 넘버입니다",
    purchaseDateRequired: "구매일을 선택해주세요",
    purchasePlaceRequired: "구매처를 선택해주세요",
  },

  // 에러
  errors: {
    registerFailed: "보증서 등록에 실패했습니다",
    notFound: "보증서를 찾을 수 없습니다",
    expired: "만료된 보증서입니다",
    tryAgain: "다시 시도해 주세요",
  },

  // 관리자 - A/S 관리
  admin: {
    asManagement: {
      title: "A/S 관리",
      subtitle: "A/S 신청 현황",
      backToWarrantyList: "보증서 목록",
      requestList: "A/S 신청 목록",
      totalItems: "총 {{count}}건",
      noRequests: "A/S 신청 내역이 없습니다",
      filter: {
        status: "상태",
        type: "유형",
        all: "전체",
      },
      stats: {
        total: "전체",
        received: "접수",
        processing: "처리중",
        completed: "완료",
      },
      status: {
        received: "접수",
        processing: "처리중",
        completed: "완료",
        cancelled: "취소",
      },
      types: {
        repair: "수리",
        exchange: "교환",
        refund: "환불",
        inquiry: "문의",
      },
      table: {
        warrantyNumber: "보증서번호",
        customer: "고객",
        product: "제품",
        type: "유형",
        content: "내용",
        status: "상태",
        requestDate: "신청일",
      },
      pagination: {
        page: "페이지 {{current}} / {{total}}",
        previous: "이전",
        next: "다음",
      },
    },

    warrantyManagement: {
      title: "보증서 관리",
      subtitle: "디지털 보증서 발급 현황",
      warrantyList: "보증서 목록",
      totalItems: "총 {{count}}개",
      selectedItems: "({{count}}개 선택됨)",
      noWarranties: "등록된 보증서가 없습니다",
      noSearchResults: "검색 결과가 없습니다",
      searchPlaceholder: "보증서번호, 송장번호, 연락처로 검색...",
      search: "검색",
      selectAll: "전체 선택",
      selectItem: "{{number}} 선택",
      deleteSelected: "선택 삭제 ({{count}})",
      pendingApproval: "승인 대기 ({{count}})",
      filter: {
        status: "상태",
        all: "전체",
      },
      stats: {
        total: "전체 보증서",
        pending: "승인 대기",
        approved: "승인 완료",
        rejected: "거절",
        expired: "만료",
        thisWeek: "이번 주 등록",
      },
      status: {
        pending: "승인 대기",
        approved: "승인 완료",
        rejected: "거절",
        expired: "만료",
      },
      table: {
        warrantyNumber: "보증서번호",
        buyerName: "구매자명",
        product: "제품",
        trackingNumber: "송장번호",
        warrantyPeriod: "보증기간",
        status: "상태",
        registrationDate: "등록일",
        detail: "상세",
        view: "보기",
        member: "회원: {{name}}",
      },
      deleteDialog: {
        title: "보증서 삭제",
        description: "선택한 <strong>{{count}}개</strong>의 보증서를 삭제하시겠습니까?",
        warning: "이 작업은 되돌릴 수 없습니다.",
        deleting: "삭제 중...",
      },
    },

    warrantyDetail: {
      registrationDate: "등록일: {{date}}",
      customerInfo: {
        title: "고객 정보",
        buyerName: "구매자명",
        phone: "연락처",
        memberName: "회원명",
        email: "이메일",
      },
      productInfo: {
        title: "제품 정보",
        productName: "제품명",
        option: "옵션",
        sku: "SKU",
        salesChannel: "판매채널",
      },
      orderInfo: {
        title: "주문 정보 확인됨",
        matched: "매칭 완료",
        description: "보증서 신청 정보와 실제 주문 이력이 일치합니다",
        unlinkOrder: "연결 해제",
        shopOrderNumber: "쇼핑몰 주문번호",
        salesChannel: "판매채널",
        orderDate: "주문일시",
        orderStatus: "주문상태",
        trackingNumber: "송장번호",
        notShipped: "미발송",
        orderProductName: "주문 상품명",
        option: "옵션",
        deliveryInfo: "배송 정보",
        recipient: "수령인",
        phone: "연락처",
        address: "주소",
        deliveryMemo: "배송메모",
        paymentInfo: "결제 정보",
        paymentAmount: "결제금액",
        shippingCost: "배송비",
        orderItems: "주문 상품 ({{count}}개)",
        warrantyTargetProduct: "보증서 대상 제품",
      },
      noOrderInfo: {
        title: "주문 정보 없음",
        description: "연결된 주문 정보가 없습니다. 아래에서 주문을 검색하여 연결해주세요.",
        trackingNumberInput: "송장번호 (입력값)",
        orderDateInput: "주문일 (입력값)",
        linkableOrders: "연결 가능한 주문 ({{count}}건)",
        alreadyLinked: "이미 연결됨",
        link: "연결",
        searchOrders: "주문 직접 검색",
      },
      warrantyPeriod: {
        title: "보증 기간",
        startDate: "시작일",
        endDate: "종료일",
        setAfterApproval: "승인 후 설정됨",
      },
      productPhoto: {
        title: "제품 인증 사진",
        uploadedAt: "업로드: {{date}}",
      },
      adminActions: {
        title: "관리자 액션",
        approve: "승인",
        reject: "거절",
      },
      kakaoNotification: {
        title: "카카오 알림톡",
        sent: "발송됨",
        sendNotification: "알림톡 발송",
      },
      logs: {
        title: "처리 이력",
        noLogs: "이력이 없습니다",
      },
      asHistory: {
        title: "A/S 신청 이력",
      },
      searchDialog: {
        title: "주문 검색",
        description: "송장번호, 전화번호, 주문번호, 수령인명으로 검색할 수 있습니다.",
        placeholder: "검색어 입력 (3자 이상)",
        noResults: "검색 결과가 없습니다.",
        orderNumber: "주문번호",
        recipient: "수령인",
        tracking: "송장",
        alreadyLinked: "이미 연결됨",
        link: "연결",
      },
      rejectDialog: {
        title: "보증서 거절",
        description: "{{warrantyNumber}} 보증서를 거절합니다. 고객에게 안내할 거절 사유를 입력해주세요.",
        placeholder: "거절 사유를 입력하세요. (예: 제품 사진이 불명확합니다. 제품 전체가 보이는 사진으로 다시 등록해주세요.)",
      },
    },

    pendingApproval: {
      title: "승인 대기",
      subtitle: "{{count}}건의 보증서가 승인을 기다리고 있습니다",
      backToList: "전체 목록",
      allProcessed: "모든 보증서가 처리되었습니다",
      noPending: "승인 대기 중인 보증서가 없습니다",
      waiting: "대기",
      buyer: "구매자",
      memberName: "회원명",
      unverified: "미인증",
      noProductInfo: "제품 정보 없음",
      noPhoto: "사진 없음",
      checkOrderAndApprove: "주문 정보 확인 후 승인",
      quickApprove: "바로 승인",
      productAuthPhoto: "제품 인증 사진",
    },
  },

  // 고객용 - 보증서 조회
  public: {
    view: {
      digitalWarranty: "디지털 품질보증서",
      brand: "SUNDAY HUG",
      warrantyNumber: "보증서 번호",
      warrantyPeriod: "보증기간",
      remainingDays: "(남은 기간: {{days}}일)",
      status: {
        pending: "승인 대기",
        approved: "유효",
        rejected: "거절됨",
        expired: "만료",
      },
      pendingNotice: {
        title: "관리자 확인 중입니다",
        description: "영업일 기준 1-2일 내 처리됩니다",
      },
      rejectedNotice: {
        title: "보증서 등록이 거절되었습니다",
        reason: "사유: {{reason}}",
        reRegister: "다시 등록하기",
      },
      expiredNotice: "보증 기간이 만료되었습니다",
      actions: {
        requestAS: "A/S 신청",
        manual: "사용설명서",
      },
      contact: "문의: {{phone}}",
    },

    register: {
      title: "보증서 등록",
      header: "등록할 제품을 선택해주세요",
      steps: {
        productSelect: "제품선택",
        infoInput: "정보입력",
        photoUpload: "사진등록",
        complete: "완료",
      },
      productSelection: {
        title: "제품 선택",
        description: "보증서를 등록할 제품을 선택해주세요",
        warrantyPeriod: "보증기간 {{period}}",
        next: "다음: 정보 입력",
        notice: {
          title: "보증서 등록 안내",
          item1: "썬데이허그 정품 구매자 대상",
          item2: "등록 후 관리자 확인을 거쳐 승인됩니다",
          item3: "승인 시 보증기간 동안 무상 A/S 가능",
        },
      },
      buyerInfo: {
        title: "구매자 정보",
        description: "제품 구매자 정보를 입력해주세요",
        name: "이름",
        namePlaceholder: "구매자 이름",
        phone: "연락처",
        phonePlaceholder: "010-1234-5678",
        phoneHint: "승인 결과를 카카오톡으로 안내드립니다",
        purchaseDate: "구매일 (선택)",
        next: "다음: 사진 등록",
        notice: {
          title: "등록 안내",
          item1: "{{productName}} 구매자 대상",
          item2: "보증기간: {{period}}",
          item3: "등록 후 관리자 확인을 거쳐 승인됩니다",
          item4: "승인 결과는 카카오톡으로 안내드립니다",
        },
      },
      photoUpload: {
        title: "제품 사진",
        description: "실제 제품이 보이는 사진을 등록해주세요",
        infoSummary: "입력 정보 요약",
        applicant: "신청자",
        phone: "연락처",
        selectPhoto: "사진 선택",
        fileFormats: "JPG, PNG, WEBP, HEIC (최대 5MB)",
        tips: {
          title: "사진 촬영 팁",
          tip1: "제품 전체가 보이도록 촬영",
          tip2: "밝은 곳에서 선명하게 촬영",
          tip3: "제품 라벨이 보이면 더 좋습니다",
        },
        previous: "이전",
        submit: "보증서 등록",
        uploading: "등록 중...",
      },
      complete: {
        title: "등록 완료!",
        description: "보증서 등록 신청이 완료되었습니다.",
        notificationInfo: "관리자 확인 후 <strong>카카오톡</strong>으로 결과를 안내드립니다.",
        receiptNumber: "접수 번호",
        processingTime: "영업일 기준 1-2일 내 처리됩니다",
        approvalBenefit: "승인 완료 시 1년간 무상 A/S 가능",
        backToHome: "홈으로 돌아가기",
      },
      navigation: {
        home: "홈으로",
        previous: "이전",
      },
      errors: {
        namePhoneRequired: "이름과 연락처를 입력해주세요.",
        photoRequired: "제품 사진을 등록해주세요.",
        fileTooLarge: "파일 크기는 5MB 이하여야 합니다.",
        unsupportedFormat: "JPG, PNG, WEBP, HEIC 형식만 지원합니다.",
        selectPhoto: "사진을 선택해주세요.",
        uploadFailed: "사진 업로드에 실패했습니다. 다시 시도해주세요.",
        networkError: "네트워크 연결을 확인해주세요.",
        serverError: "서버 오류가 발생했습니다.",
      },
    },
  },

  // 카카오 로그인
  kakao: {
    processing: "카카오 로그인 처리 중...",
  },
} as const;
