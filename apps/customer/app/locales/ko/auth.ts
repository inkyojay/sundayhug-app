/**
 * 인증 관련 번역 - 한국어
 */
export default {
  // 로그인
  login: {
    title: "로그인",
    subtitle: "썬데이허그에 오신 것을 환영합니다",
    email: "이메일",
    password: "비밀번호",
    rememberMe: "로그인 상태 유지",
    forgotPassword: "비밀번호 찾기",
    noAccount: "계정이 없으신가요?",
    signUp: "회원가입",
    button: "로그인",
    orContinueWith: "또는",
    socialLogin: {
      kakao: "카카오로 시작하기",
      naver: "네이버로 시작하기",
      google: "Google로 계속하기",
      apple: "Apple로 계속하기",
    },
  },

  // 회원가입
  register: {
    title: "회원가입",
    subtitle: "썬데이허그와 함께 시작하세요",
    email: "이메일",
    password: "비밀번호",
    confirmPassword: "비밀번호 확인",
    name: "이름",
    phone: "휴대폰 번호",
    agreeTerms: "이용약관에 동의합니다",
    agreePrivacy: "개인정보 처리방침에 동의합니다",
    agreeMarketing: "마케팅 정보 수신에 동의합니다 (선택)",
    hasAccount: "이미 계정이 있으신가요?",
    signIn: "로그인",
    button: "회원가입",
    success: "회원가입이 완료되었습니다!",
  },

  // 비밀번호 찾기
  forgotPassword: {
    title: "비밀번호 찾기",
    subtitle: "가입한 이메일 주소를 입력해주세요",
    email: "이메일",
    button: "인증번호 받기",
    sent: "인증번호가 발송되었습니다",
    checkEmail: "이메일을 확인해주세요",
    backToLogin: "로그인으로 돌아가기",
  },

  // 비밀번호 재설정
  resetPassword: {
    title: "비밀번호 재설정",
    newPassword: "새 비밀번호",
    confirmPassword: "새 비밀번호 확인",
    button: "비밀번호 변경",
    success: "비밀번호가 변경되었습니다",
  },

  // OTP 인증
  otp: {
    title: "인증번호 입력",
    subtitle: "{{phone}}로 발송된 인증번호를 입력해주세요",
    placeholder: "인증번호 6자리",
    resend: "인증번호 다시 받기",
    resendIn: "{{seconds}}초 후 재발송 가능",
    verify: "인증하기",
    expired: "인증번호가 만료되었습니다",
    invalid: "인증번호가 올바르지 않습니다",
  },

  // 유효성 검사 메시지
  validation: {
    emailRequired: "이메일을 입력해주세요",
    emailInvalid: "올바른 이메일 주소를 입력해주세요",
    passwordRequired: "비밀번호를 입력해주세요",
    passwordMin: "비밀번호는 최소 6자 이상이어야 합니다",
    passwordMismatch: "비밀번호가 일치하지 않습니다",
    nameRequired: "이름을 입력해주세요",
    phoneRequired: "휴대폰 번호를 입력해주세요",
    phoneInvalid: "올바른 휴대폰 번호를 입력해주세요",
    termsRequired: "이용약관에 동의해주세요",
    privacyRequired: "개인정보 처리방침에 동의해주세요",
  },

  // 에러 메시지
  errors: {
    loginFailed: "로그인에 실패했습니다",
    invalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다",
    emailExists: "이미 가입된 이메일입니다",
    phoneExists: "이미 등록된 휴대폰 번호입니다",
    networkError: "네트워크 오류가 발생했습니다",
    serverError: "서버 오류가 발생했습니다",
    tryAgain: "잠시 후 다시 시도해주세요",
  },
} as const;
