/**
 * 앱 설정 상수
 */

// 웹앱 베이스 URL
export const WEB_BASE_URL = __DEV__
  ? 'http://localhost:5173' // 개발 서버
  : 'https://app.sundayhug.com';

// 딥링크 스킴
export const DEEP_LINK_SCHEME = 'sundayhug';

// 앱 버전
export const APP_VERSION = '1.0.0';

// 색상 테마
export const COLORS = {
  primary: '#6366f1', // Indigo
  primaryDark: '#4f46e5',
  background: '#1a1a2e',
  backgroundLight: '#16213e',
  surface: '#0f3460',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  border: '#334155',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  kakao: '#FEE500',
  kakaoText: '#000000',
} as const;

// 탭 설정
export const TABS = {
  home: {
    name: 'HomeTab',
    label: '홈',
    icon: 'home',
  },
  warranty: {
    name: 'WarrantyTab',
    label: '보증서',
    icon: 'shield-checkmark',
  },
  sleep: {
    name: 'SleepTab',
    label: '수면분석',
    icon: 'moon',
  },
  mypage: {
    name: 'MyPageTab',
    label: '마이페이지',
    icon: 'person',
  },
} as const;

// WebView 라우트 매핑
export const WEBVIEW_ROUTES = {
  // 보증서
  warranty_register: `${WEB_BASE_URL}/customer/warranty`,
  warranty_detail: (id: string) => `${WEB_BASE_URL}/customer/warranty/view/${id}`,
  
  // 수면 분석
  sleep_analyze: `${WEB_BASE_URL}/customer/sleep/analyze`,
  sleep_result: (id: string) => `${WEB_BASE_URL}/customer/sleep/result/${id}`,
  
  // 블로그
  blog: `${WEB_BASE_URL}/customer/blog`,
  blog_post: (id: string) => `${WEB_BASE_URL}/customer/blog/${id}`,
  
  // AI 상담
  chat: `${WEB_BASE_URL}/customer/chat`,
  chat_room: (sessionId: string) => `${WEB_BASE_URL}/customer/chat/${sessionId}`,
  
  // A/S
  as_request: (warrantyId: string) => `${WEB_BASE_URL}/customer/as/${warrantyId}`,
  as_list: `${WEB_BASE_URL}/customer/mypage/as`,
  
  // 마이페이지 상세
  warranties: `${WEB_BASE_URL}/customer/mypage/warranties`,
  warranty_mypage: (id: string) => `${WEB_BASE_URL}/customer/mypage/warranty/${id}`,
  analyses: `${WEB_BASE_URL}/customer/mypage/analyses`,
  points: `${WEB_BASE_URL}/customer/mypage/points`,
  
  // 이벤트
  event_review: `${WEB_BASE_URL}/customer/event/review`,
} as const;



