/**
 * 수면 분석 번역 - 한국어
 */
export default {
  // 메인
  title: "수면 환경 분석",
  subtitle: "AI가 아이의 수면 환경을 분석해 드려요",

  // 허브 페이지
  hub: {
    title: "수면 분석",
    description: "우리 아이 수면 환경, AI가 분석해 드릴게요",
    startButton: "분석 시작하기",
    historyButton: "분석 기록 보기",

    // 안내
    guide: {
      title: "이렇게 촬영해 주세요",
      tips: [
        "아기 침대 전체가 보이게 촬영해 주세요",
        "침구류와 주변 환경이 잘 보이면 좋아요",
        "자연광이나 밝은 조명 아래서 촬영해 주세요",
      ],
    },
  },

  // 업로드
  upload: {
    title: "사진 업로드",
    description: "아기의 수면 환경 사진을 업로드해 주세요",
    button: "사진 선택",
    dragDrop: "또는 여기에 파일을 끌어다 놓으세요",
    maxSize: "최대 10MB",
    formats: "JPG, PNG 형식",
    analyzing: "AI가 분석 중이에요...",
    analyzingDescription: "잠시만 기다려 주세요. 보통 30초 정도 소요됩니다.",
  },

  // 결과
  result: {
    title: "분석 결과",
    overallScore: "종합 점수",
    date: "분석일",

    // 점수 레벨
    score: {
      excellent: "훌륭해요! 아주 안전한 환경이에요",
      good: "좋아요! 안전한 환경이에요",
      fair: "괜찮아요, 하지만 개선하면 더 좋아요",
      poor: "주의가 필요해요",
      critical: "즉시 개선이 필요해요",
    },

    // 분석 항목
    categories: {
      sleepSurface: "수면 표면",
      bedding: "침구류",
      surroundings: "주변 환경",
      temperature: "온도/환기",
      lighting: "조명",
    },

    // 피드백
    feedback: {
      title: "개선 제안",
      good: "잘하고 있어요",
      improve: "개선이 필요해요",
      tips: "팁",
    },

    // 공유
    share: {
      button: "결과 공유하기",
      instagram: "인스타그램 스토리",
      kakao: "카카오톡으로 공유",
      save: "이미지로 저장",
    },

    // 다시 분석
    reanalyze: "다시 분석하기",
    saveResult: "결과 저장하기",
  },

  // 기록
  history: {
    title: "분석 기록",
    empty: "아직 분석 기록이 없어요",
    startFirst: "첫 번째 분석을 시작해 보세요!",
    viewDetail: "상세 보기",
    delete: "삭제",
    confirmDelete: "이 분석 기록을 삭제하시겠습니까?",
  },

  // 수면 예보
  forecast: {
    title: "오늘의 수면 예보",
    temperature: "기온",
    humidity: "습도",
    recommendation: "추천 설정",
    sleepwear: "추천 수면복",
    bedding: "추천 이불",
  },

  // 에러
  errors: {
    uploadFailed: "사진 업로드에 실패했습니다",
    analysisFailed: "분석에 실패했습니다",
    invalidImage: "올바른 이미지 파일을 선택해 주세요",
    imageTooLarge: "이미지 크기가 너무 큽니다 (최대 10MB)",
    tryAgain: "다시 시도해 주세요",
  },
} as const;
