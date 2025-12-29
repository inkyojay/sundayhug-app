/**
 * Native <-> WebView 브릿지 메시지 타입
 */

// Native -> WebView 메시지
export type NativeToWebMessage =
  | { type: 'CAMERA_RESULT'; payload: { uri: string; base64?: string; fileName?: string } }
  | { type: 'PUSH_TOKEN'; payload: { token: string } }
  | { type: 'AUTH_STATE'; payload: { isLoggedIn: boolean; userId?: string; accessToken?: string } }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'APP_STATE'; payload: { isActive: boolean } };

// WebView -> Native 메시지
export type WebToNativeMessage =
  | { type: 'REQUEST_CAMERA'; payload: { mode: 'photo' | 'gallery' } }
  | { type: 'REQUEST_PUSH_PERMISSION' }
  | { type: 'NAVIGATE'; payload: { screen: string; params?: Record<string, unknown> } }
  | { type: 'SET_TAB'; payload: { tab: 'home' | 'warranty' | 'sleep' | 'mypage' } }
  | { type: 'LOGIN_SUCCESS'; payload: { userId: string; accessToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'OPEN_EXTERNAL_URL'; payload: { url: string } }
  | { type: 'SHARE'; payload: { title: string; message: string; url?: string } };

// 브릿지 이벤트 핸들러 타입
export interface BridgeHandlers {
  onCameraRequest?: (mode: 'photo' | 'gallery') => void;
  onPushPermissionRequest?: () => void;
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
  onSetTab?: (tab: 'home' | 'warranty' | 'sleep' | 'mypage') => void;
  onLoginSuccess?: (userId: string, accessToken: string) => void;
  onLogout?: () => void;
  onOpenExternalUrl?: (url: string) => void;
  onShare?: (title: string, message: string, url?: string) => void;
}

// 내비게이션 파라미터 타입
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  WebView: { url: string; title?: string };
  Camera: { mode: 'photo' | 'gallery'; returnScreen?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  WarrantyTab: undefined;
  SleepTab: undefined;
  MyPageTab: undefined;
};



