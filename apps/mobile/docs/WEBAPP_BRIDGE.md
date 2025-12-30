# 웹앱 브릿지 설정 가이드

이 가이드는 기존 customer 웹앱에 모바일 앱 브릿지를 추가하는 방법을 설명합니다.

> ⚠️ **중요**: 이 코드는 `window.ReactNativeWebView`가 존재할 때만 동작하므로, 웹 브라우저에서 직접 접속 시에는 전혀 영향이 없습니다.

## 옵션 1: Public 스크립트로 추가 (권장)

### 1. 스크립트 파일 복사

`apps/mobile/bridge/app-bridge.js` 파일을 `apps/customer/public/scripts/app-bridge.js`로 복사합니다.

### 2. root.tsx에 스크립트 태그 추가

```tsx
// apps/customer/app/root.tsx의 <head> 안에 추가
<script src="/scripts/app-bridge.js" defer />
```

---

## 옵션 2: 레이아웃에 인라인 스크립트 추가

### customer.layout.tsx 수정

```tsx
// apps/customer/app/features/customer/layouts/customer.layout.tsx

import { useEffect } from "react";

// 컴포넌트 내부에 추가
useEffect(() => {
  // 앱 WebView에서만 실행
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    setupAppBridge();
  }
}, []);
```

---

## 브릿지 기능 설명

### 앱에서 웹으로 전송되는 메시지

| 타입 | 설명 | 페이로드 |
|------|------|----------|
| `CAMERA_RESULT` | 카메라/갤러리 결과 | `{ uri, base64?, fileName? }` |
| `PUSH_TOKEN` | FCM 토큰 | `{ token }` |
| `AUTH_STATE` | 인증 상태 | `{ isLoggedIn, userId?, accessToken? }` |
| `NAVIGATE_BACK` | 뒤로가기 | - |

### 웹에서 앱으로 전송되는 메시지

| 타입 | 설명 | 페이로드 |
|------|------|----------|
| `REQUEST_CAMERA` | 카메라 요청 | `{ mode: 'photo' \| 'gallery' }` |
| `REQUEST_PUSH_PERMISSION` | 푸시 권한 요청 | - |
| `NAVIGATE` | 화면 이동 | `{ screen, params? }` |
| `SET_TAB` | 탭 전환 | `{ tab: 'home' \| 'warranty' \| 'sleep' \| 'mypage' }` |
| `LOGIN_SUCCESS` | 로그인 성공 | `{ userId, accessToken }` |
| `LOGOUT` | 로그아웃 | - |
| `OPEN_EXTERNAL_URL` | 외부 URL 열기 | `{ url }` |
| `SHARE` | 공유 | `{ title, message, url? }` |

---

## 사용 예시

### 카메라 요청 (수면 분석 페이지)

```tsx
// apps/customer/app/features/sleep-analysis/components/upload-form.tsx

const requestCamera = () => {
  if ((window as any).isReactNativeApp) {
    // 앱에서 열렸을 때: 네이티브 카메라 사용
    (window as any).sendToNative('REQUEST_CAMERA', { mode: 'photo' });
  } else {
    // 웹에서 열렸을 때: 기존 input[type=file] 사용
    fileInputRef.current?.click();
  }
};

// 카메라 결과 수신
useEffect(() => {
  const handleCameraResult = (event: CustomEvent) => {
    const { uri, base64 } = event.detail.payload;
    // 이미지 처리
  };

  window.addEventListener('nativeMessage', handleCameraResult as EventListener);
  return () => {
    window.removeEventListener('nativeMessage', handleCameraResult as EventListener);
  };
}, []);
```

### 로그인 성공 시 앱에 알림

```tsx
// apps/customer/app/features/customer/screens/kakao-callback.tsx

// 로그인 성공 후
if ((window as any).isReactNativeApp) {
  (window as any).sendToNative('LOGIN_SUCCESS', {
    userId: user.id,
    accessToken: session.access_token,
  });
}
```

### 헤더/탭바 숨김 (앱에서 열렸을 때)

```css
/* apps/customer/app/app.css */

/* 앱에서 열렸을 때 웹 헤더/탭바 숨김 */
.in-app header,
.in-app nav.fixed.bottom-0 {
  display: none !important;
}

.in-app main {
  padding-bottom: 0 !important;
}
```

---

## 테스트 방법

### 1. 웹에서 브릿지 시뮬레이션

브라우저 콘솔에서:

```javascript
// 앱 환경 시뮬레이션
window.ReactNativeWebView = { postMessage: console.log };
window.isReactNativeApp = true;

// 브릿지 함수 테스트
window.sendToNative('REQUEST_CAMERA', { mode: 'photo' });
```

### 2. 앱에서 테스트

개발 모드로 앱 실행 후 WebView 화면에서 기능 테스트

---

## 주의사항

1. **조건부 실행**: 모든 브릿지 코드는 `window.ReactNativeWebView` 또는 `window.isReactNativeApp` 체크 후 실행
2. **폴백 처리**: 앱이 아닐 때는 기존 웹 기능 사용
3. **에러 처리**: try-catch로 브릿지 에러 처리
4. **버전 관리**: 앱/웹 버전 불일치 시 대응 로직 필요



