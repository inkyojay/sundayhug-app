/**
 * 공통 UI 번역 - 한국어
 */
export default {
  // 버튼
  buttons: {
    submit: "확인",
    cancel: "취소",
    save: "저장",
    delete: "삭제",
    edit: "수정",
    close: "닫기",
    back: "뒤로",
    next: "다음",
    previous: "이전",
    confirm: "확인",
    login: "로그인",
    logout: "로그아웃",
    register: "회원가입",
    send: "보내기",
    upload: "업로드",
    download: "다운로드",
    share: "공유",
    copy: "복사",
    retry: "다시 시도",
    continue: "계속하기",
    start: "시작하기",
    complete: "완료",
  },

  // 네비게이션
  navigation: {
    home: "홈",
    mypage: "마이페이지",
    settings: "설정",
    profile: "프로필",
    notifications: "알림",
    help: "도움말",
    about: "소개",
    contact: "문의하기",
    terms: "이용약관",
    privacy: "개인정보처리방침",
  },

  // 상태
  status: {
    loading: "로딩 중...",
    saving: "저장 중...",
    processing: "처리 중...",
    uploading: "업로드 중...",
    success: "성공",
    error: "오류가 발생했습니다",
    empty: "데이터가 없습니다",
    notFound: "찾을 수 없습니다",
  },

  // 언어 선택
  languages: {
    ko: "한국어",
    en: "English",
    ja: "日本語",
    vi: "Tiếng Việt",
    "zh-TW": "繁體中文",
    "zh-CN": "简体中文",
    ar: "العربية",
    select: "언어 선택",
  },

  // 시간/날짜
  time: {
    today: "오늘",
    yesterday: "어제",
    tomorrow: "내일",
    now: "지금",
    ago: "전",
    later: "후",
    minutes: "분",
    hours: "시간",
    days: "일",
    weeks: "주",
    months: "개월",
    years: "년",
  },

  // 폼 공통
  form: {
    required: "필수 항목입니다",
    optional: "선택",
    placeholder: {
      email: "이메일을 입력하세요",
      password: "비밀번호를 입력하세요",
      name: "이름을 입력하세요",
      phone: "전화번호를 입력하세요",
      search: "검색어를 입력하세요",
    },
  },

  // 확인/경고 메시지
  messages: {
    confirmDelete: "정말 삭제하시겠습니까?",
    confirmLogout: "로그아웃 하시겠습니까?",
    saved: "저장되었습니다",
    deleted: "삭제되었습니다",
    copied: "복사되었습니다",
    linkCopied: "링크가 복사되었습니다",
  },

  // 브랜드
  brand: {
    name: "썬데이허그",
    tagline: "아기의 편안한 잠을 위해",
    customerService: "썬데이허그 고객 서비스",
  },
} as const;
