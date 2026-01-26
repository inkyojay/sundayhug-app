import type { Translation } from "./types";

const ko: Translation = {
  home: {
    title: "슈파플레이트",
    subtitle: "빌드하는 시간이야!",
  },
  navigation: {
    kr: "한국어",
    es: "스페인어",
    en: "영어",
  },
  errors: {
    // 일반 에러
    general: {
      unknown: "알 수 없는 오류가 발생했습니다",
      network: "네트워크 연결을 확인해주세요",
      server: "서버 오류가 발생했습니다",
      timeout: "요청 시간이 초과되었습니다",
      unauthorized: "로그인이 필요합니다",
      forbidden: "접근 권한이 없습니다",
      notFound: "페이지를 찾을 수 없습니다",
      maintenance: "서비스 점검 중입니다",
      tryAgain: "잠시 후 다시 시도해주세요",
    },

    // HTTP 상태 코드
    http: {
      400: "잘못된 요청입니다",
      401: "로그인이 필요합니다",
      403: "접근 권한이 없습니다",
      404: "요청하신 페이지를 찾을 수 없습니다",
      408: "요청 시간이 초과되었습니다",
      429: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요",
      500: "서버 오류가 발생했습니다",
      502: "서버와의 연결에 실패했습니다",
      503: "서비스를 일시적으로 사용할 수 없습니다",
      504: "서버 응답 시간이 초과되었습니다",
    },

    // 폼 유효성 검사
    validation: {
      required: "필수 항목입니다",
      email: "올바른 이메일 주소를 입력해주세요",
      phone: "올바른 전화번호를 입력해주세요",
      password: "비밀번호는 최소 6자 이상이어야 합니다",
      passwordMatch: "비밀번호가 일치하지 않습니다",
      minLength: "최소 {{min}}자 이상 입력해주세요",
      maxLength: "최대 {{max}}자까지 입력 가능합니다",
      number: "숫자만 입력 가능합니다",
      date: "올바른 날짜를 선택해주세요",
      file: {
        size: "파일 크기는 {{max}}MB 이하여야 합니다",
        type: "지원하지 않는 파일 형식입니다",
      },
    },

    // 인증 관련
    auth: {
      loginRequired: "로그인이 필요한 서비스입니다",
      sessionExpired: "세션이 만료되었습니다. 다시 로그인해주세요",
      invalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다",
      accountLocked: "계정이 잠겼습니다. 고객센터에 문의해주세요",
      emailNotVerified: "이메일 인증이 필요합니다",
    },

    // 권한 관련
    permission: {
      denied: "권한이 없습니다",
      camera: "카메라 접근 권한이 필요합니다",
      microphone: "마이크 접근 권한이 필요합니다",
      location: "위치 접근 권한이 필요합니다",
      storage: "저장소 접근 권한이 필요합니다",
      notification: "알림 권한이 필요합니다",
    },

    // 액션
    actions: {
      retry: "다시 시도",
      goBack: "뒤로 가기",
      goHome: "홈으로 가기",
      login: "로그인하기",
      contact: "고객센터 문의",
      refresh: "새로고침",
    },

    // 404 페이지
    notFound: {
      title: "페이지를 찾을 수 없습니다",
      description: "요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.",
      suggestions: [
        "URL 주소를 다시 확인해주세요",
        "홈페이지에서 원하는 내용을 검색해보세요",
        "문제가 계속되면 고객센터로 문의해주세요",
      ],
    },

    // 일반 에러 페이지
    error: {
      title: "오류",
      errorCode: "오류 코드",
    },

    // 500 페이지
    serverError: {
      title: "서버 오류가 발생했습니다",
      description: "일시적인 오류입니다. 잠시 후 다시 시도해주세요.",
    },

    // 점검 페이지
    maintenance: {
      title: "서비스 점검 중입니다",
      description: "더 나은 서비스를 위해 점검 중입니다. 빠른 시일 내에 정상화하겠습니다.",
      estimatedTime: "예상 종료 시간: {{time}}",
    },
  },
};

export default ko;
