/**
 * 고객 서비스 번역 - 한국어
 */
export default {
  // 홈 화면
  home: {
    welcome: {
      loggedIn: "{{name}}님.",
      guest: "Sunday Hug.",
    },
    subtitle: "제품 보증서 등록부터 AI 수면 환경 분석까지, 썬데이허그가 함께합니다.",

    // 첫 방문 안내
    firstVisit: {
      title: "처음이신가요?",
      description: "회원가입 후 보증서 등록, 수면 분석 결과 저장 등 더 많은 서비스를 이용하세요.",
    },

    // 서비스 카드
    services: {
      warranty: {
        label: "Product Registration",
        title: "정품 인증",
        description: "구매하신 제품의 시리얼 넘버를 등록하고 프리미엄 보증 혜택을 받아보세요.",
        button: "등록하기",
      },
      sleepAnalysis: {
        label: "AI Sleep Tech",
        title: "수면 분석",
        description: "AI가 우리 아이 수면 환경을 분석하고 맞춤 솔루션을 제공해 드려요.",
        button: "분석하기",
      },
      chat: {
        label: "AI Parenting",
        title: "AI 육아 상담",
        description: "수면, 수유, 발달 고민을 AI가 답변해 드려요",
        button: "상담하기",
      },
      blog: {
        label: "Parenting Guide",
        title: "육아 블로그",
        description: "수면 가이드, 제품 활용법, 육아 꿀팁",
        button: "둘러보기",
      },
    },

    // 이벤트
    event: {
      reviewTitle: "구매 후기 이벤트 참여",
      reviewDescription: "맘카페 후기 작성하고 사은품 받으세요!",
    },

    // 퀵 링크
    quickLinks: {
      manual: "ABC 아기침대 사용 설명서",
      customerService: "고객센터",
      kakaoChat: "카카오톡 상담",
    },
  },

  // 마이페이지
  mypage: {
    title: "마이페이지",
    greeting: "{{name}}님, 안녕하세요!",

    // 메뉴
    menu: {
      profile: "내 정보 관리",
      warranties: "내 보증서",
      analyses: "수면 분석 기록",
      points: "포인트",
      reviews: "내 후기",
      asList: "A/S 신청 내역",
      babyProfiles: "아기 정보 관리",
    },

    // 통계
    stats: {
      warranties: "등록 보증서",
      analyses: "수면 분석",
      points: "보유 포인트",
    },
  },

  // 프로필
  profile: {
    title: "내 정보 변경",
    name: "이름",
    email: "이메일",
    phone: "휴대폰 번호",
    password: "비밀번호 변경",
    currentPassword: "현재 비밀번호",
    newPassword: "새 비밀번호",
    confirmPassword: "새 비밀번호 확인",
    save: "저장하기",
    success: "정보가 수정되었습니다",

    // 아기 정보
    baby: {
      title: "아기 정보",
      add: "아기 정보 추가",
      name: "아기 이름",
      birthDate: "생년월일",
      gender: "성별",
      male: "남아",
      female: "여아",
    },

    // 계정
    account: {
      deleteAccount: "회원 탈퇴",
      deleteWarning: "탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.",
      confirmDelete: "정말 탈퇴하시겠습니까?",
    },
  },

  // 포인트
  points: {
    title: "포인트",
    current: "보유 포인트",
    history: "포인트 내역",
    earn: "적립",
    use: "사용",
    expire: "소멸 예정",
    noHistory: "포인트 내역이 없습니다",
  },
} as const;
