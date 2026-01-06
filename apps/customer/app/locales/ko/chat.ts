/**
 * AI 상담 번역 - 한국어
 */
export default {
  // 메인
  title: "AI 육아 상담",
  subtitle: "AI 상담사가 육아 고민을 함께 나눠요",

  // 세션 목록
  sessions: {
    title: "상담 내역",
    newChat: "새 상담 시작",
    empty: "아직 상담 내역이 없어요",
    startFirst: "첫 상담을 시작해 보세요!",
    continueChat: "이어서 대화하기",
    deleteChat: "삭제",
    confirmDelete: "이 대화를 삭제하시겠습니까?",
  },

  // 채팅방
  room: {
    title: "AI 상담",
    newSession: "새 상담",
    placeholder: "메시지를 입력하세요...",
    send: "보내기",
    typing: "답변 작성 중...",

    // 환영 메시지
    welcome: {
      greeting: "안녕하세요! AI 육아 상담사예요.",
      withBaby: "{{name}}({{months}}개월)에 대해 궁금한 점이 있으시면 편하게 물어봐 주세요!",
      suggestions: ["밤에 자주 깨요", "이유식 시작 시기", "수면 교육 방법"],
    },

    // 액션 버튼
    actions: {
      playAudio: "음성으로 듣기",
      stopAudio: "재생 중지",
      copy: "복사",
      copied: "복사됨!",
      helpful: "도움이 됐어요",
      notHelpful: "도움이 안 됐어요",
    },

    // 음성 입력
    voice: {
      recording: "녹음 중...",
      processing: "변환 중...",
      tapToStop: "다시 클릭하면 종료됩니다",
      error: "음성 입력에 실패했습니다",
    },

    // 이미지
    image: {
      attach: "이미지 첨부",
      preview: "미리보기",
      remove: "삭제",
      analyzing: "이미지 분석 중...",
    },

    // 출처
    sources: {
      title: "참고 자료",
    },

    // 면책 조항
    disclaimer: "AI가 생성한 답변은 참고용이며, 전문의 상담을 대체하지 않습니다.",
  },

  // 아기 프로필 등록
  babyProfile: {
    title: "아기 정보 등록",
    subtitle: "맞춤형 상담을 위해 아기 정보를 알려주세요",
    name: "아기 이름",
    namePlaceholder: "예: 콩이",
    nameOptional: "선택",
    birthDate: "생년월일",
    birthDateRequired: "필수",
    feedingType: "수유 방식",
    feedingPlaceholder: "선택해주세요",
    feedingOptions: {
      breast: "모유",
      formula: "분유",
      mixed: "혼합",
    },
    submit: "상담 시작하기",
    saving: "저장 중...",
    validation: {
      birthDateRequired: "생년월일을 입력해주세요",
    },
  },

  // 아기 선택
  selectBaby: {
    title: "아이 선택",
    subtitle: "어떤 아이에 대해 상담하시겠어요?",
    addNew: "새 아이 등록",
  },

  // 주제
  topics: {
    sleep: "수면",
    feeding: "수유/이유식",
    development: "발달",
    health: "건강",
    behavior: "행동",
    other: "기타",
  },

  // 에러
  errors: {
    sendFailed: "메시지 전송에 실패했습니다",
    loadFailed: "대화를 불러오는데 실패했습니다",
    voiceFailed: "음성 인식에 실패했습니다",
    networkError: "네트워크 오류가 발생했습니다",
    tryAgain: "다시 시도해 주세요",
  },
} as const;
