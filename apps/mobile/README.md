# 썬데이허그 모바일 앱

React Native + WebView 하이브리드 앱

## 기술 스택

- **React Native** 0.76.5 (New Architecture)
- **Navigation**: React Navigation 7
- **WebView**: react-native-webview
- **Push**: Firebase Cloud Messaging
- **Camera**: react-native-image-picker
- **Storage**: react-native-mmkv

## 프로젝트 구조

```
src/
├── components/       # 공통 컴포넌트
│   ├── TabBarIcon.tsx
│   └── WebViewContainer.tsx
├── constants/        # 상수 및 설정
│   └── config.ts
├── contexts/         # React Context
│   └── AuthContext.tsx
├── navigation/       # 네비게이션 설정
│   ├── RootNavigator.tsx
│   ├── MainTabNavigator.tsx
│   └── linking.ts
├── screens/          # 화면 컴포넌트
│   ├── SplashScreen.tsx
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx       # 네이티브
│   ├── MyPageScreen.tsx     # 네이티브
│   ├── WarrantyScreen.tsx   # WebView
│   ├── SleepScreen.tsx      # WebView
│   └── WebViewScreen.tsx    # 범용 WebView
├── services/         # 네이티브 서비스
│   ├── camera.ts
│   └── push.ts
└── types/            # TypeScript 타입
    └── bridge.ts
```

## 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- Xcode 15+ (iOS)
- Android Studio (Android)
- CocoaPods (iOS)

### 설치

```bash
# 의존성 설치
cd apps/mobile
npm install

# iOS Pod 설치
cd ios && pod install && cd ..
```

### 실행

```bash
# Metro 번들러 시작
npm start

# iOS 실행
npm run ios

# Android 실행
npm run android
```

## 화면 구현 전략

| 화면 | 구현 방식 | 이유 |
|------|----------|------|
| 홈 | Native | 메인 화면, 빠른 로딩 |
| 로그인 | Native | 카카오 SDK 연동 |
| 마이페이지 | Native | 간단한 메뉴 |
| 보증서 등록/상세 | WebView | 복잡한 폼 |
| 수면 분석 | WebView | 복잡한 시각화 |
| 블로그 | WebView | 콘텐츠 중심 |
| AI 상담 | WebView | 채팅 UI |

## Native - WebView 브릿지

### WebView → Native

```javascript
// WebView에서 네이티브로 메시지 전송
window.sendToNative('REQUEST_CAMERA', { mode: 'photo' });
```

### Native → WebView

```javascript
// 카메라 결과 수신
window.addEventListener('nativeMessage', (event) => {
  const { type, payload } = event.detail;
  if (type === 'CAMERA_RESULT') {
    // 이미지 처리
  }
});
```

## 환경 변수

Firebase 설정 파일 추가 필요:

- iOS: `ios/GoogleService-Info.plist`
- Android: `android/app/google-services.json`

카카오 SDK 설정:

- iOS: `ios/SundayhugApp/Info.plist`에 카카오 앱 키 추가
- Android: `android/app/src/main/res/values/strings.xml`에 카카오 앱 키 추가

## 배포

### iOS (TestFlight)

```bash
# Xcode에서 Archive 후 App Store Connect 업로드
cd ios && xcodebuild -workspace SundayhugApp.xcworkspace -scheme SundayhugApp -configuration Release
```

### Android (Play Store)

```bash
# APK/AAB 빌드
cd android && ./gradlew assembleRelease
# 또는
cd android && ./gradlew bundleRelease
```

## 딥링크

- iOS: `sundayhug://`
- Android: `sundayhug://`
- Universal Link: `https://app.sundayhug.com`

예시:
- `sundayhug://customer/warranty` → 보증서 탭
- `sundayhug://customer/mypage/warranty/123` → 보증서 상세

## 푸시 알림

| 이벤트 | 알림 내용 |
|--------|----------|
| 보증서 등록 완료 | "보증서가 등록되었습니다" |
| A/S 접수 완료 | "A/S 신청이 접수되었습니다" |
| 수면 분석 완료 | "수면 환경 분석이 완료되었습니다" |



