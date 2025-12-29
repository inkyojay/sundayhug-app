# 썬데이허그 모바일 앱 (Mobile App) 개발 일지

## 2024-12-29 (일) - React Native 하이브리드 앱 초기 구축 + Android/카카오 SDK 설정

### 개요

기존 `apps/customer` 웹앱을 React Native + WebView 하이브리드 방식으로 iOS/Android 모바일 앱으로 개발.
핵심 UI는 네이티브로, 복잡한 화면은 WebView로 구현하여 개발 효율성과 사용자 경험을 모두 확보.

### 프로젝트 구조

```
apps/mobile/
├── App.tsx                      # 앱 엔트리포인트
├── index.js                     # RN 등록
├── app.json                     # 앱 설정 (com.sundayhug.app)
├── package.json                 # React Native 0.76.5
├── tsconfig.json                # TypeScript 설정
├── metro.config.js              # Metro 번들러 (모노레포용)
├── babel.config.js              # Babel 설정
│
├── src/
│   ├── components/
│   │   ├── TabBarIcon.tsx       # 탭바 아이콘
│   │   └── WebViewContainer.tsx # WebView + 브릿지 통신
│   │
│   ├── constants/
│   │   └── config.ts            # 설정 상수, WebView URL 매핑
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # 인증 상태 (MMKV 저장)
│   │
│   ├── hooks/
│   │   └── useDeepLink.ts       # 딥링크 URL 파싱 및 네비게이션
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx    # Stack Navigator (Auth 분기)
│   │   ├── MainTabNavigator.tsx # Bottom Tab Navigator
│   │   └── linking.ts           # 딥링크 설정
│   │
│   ├── screens/
│   │   ├── SplashScreen.tsx     # 스플래시 (네이티브)
│   │   ├── LoginScreen.tsx      # 로그인 (카카오 SDK)
│   │   ├── HomeScreen.tsx       # 홈 서비스 허브 (네이티브)
│   │   ├── MyPageScreen.tsx     # 마이페이지 (네이티브)
│   │   ├── WarrantyScreen.tsx   # 보증서 (WebView)
│   │   ├── SleepScreen.tsx      # 수면분석 (WebView)
│   │   └── WebViewScreen.tsx    # 범용 WebView
│   │
│   ├── services/
│   │   ├── camera.ts            # react-native-image-picker
│   │   ├── push.ts              # Firebase Cloud Messaging
│   │   └── kakao.ts             # @react-native-kakao/login
│   │
│   └── types/
│       └── bridge.ts            # 브릿지 메시지 타입 정의
│
├── bridge/
│   └── app-bridge.js            # 웹앱용 브릿지 스크립트
│
├── docs/
│   ├── IOS_SETUP.md             # iOS 설정 가이드
│   ├── ANDROID_SETUP.md         # Android 설정 가이드
│   └── WEBAPP_BRIDGE.md         # 웹앱 브릿지 연동 가이드
│
└── scripts/
    └── setup-native.sh          # 네이티브 프로젝트 설정 스크립트
```

### 화면 구현 전략

| 화면 | 구현 방식 | 이유 |
|------|----------|------|
| 스플래시 | Native | 앱 시작 UX, 빠른 로딩 |
| 탭 네비게이션 | Native | iOS/Android 네이티브 UX 필수 |
| 홈 (서비스 허브) | Native | 메인 화면, 빠른 응답성 |
| 로그인/회원가입 | Native | 카카오 SDK 연동, 보안 |
| 마이페이지 메인 | Native | 간단한 메뉴 리스트 |
| 보증서 등록/상세 | WebView | 복잡한 폼, 기존 로직 재사용 |
| 수면 분석 | WebView | 차트, 카드뉴스 등 복잡한 UI |
| 블로그 | WebView | 콘텐츠 중심 |
| AI 육아 상담 | WebView | 채팅 UI 복잡 |
| A/S 신청/목록 | WebView | 복잡한 폼 |

### Native ↔ WebView 브릿지

#### WebView → Native 메시지

| 타입 | 설명 | 페이로드 |
|------|------|----------|
| `REQUEST_CAMERA` | 카메라/갤러리 요청 | `{ mode: 'photo' \| 'gallery' }` |
| `REQUEST_PUSH_PERMISSION` | 푸시 권한 요청 | - |
| `NAVIGATE` | 화면 이동 | `{ screen, params? }` |
| `SET_TAB` | 탭 전환 | `{ tab }` |
| `LOGIN_SUCCESS` | 로그인 성공 | `{ userId, accessToken }` |
| `LOGOUT` | 로그아웃 | - |
| `OPEN_EXTERNAL_URL` | 외부 URL 열기 | `{ url }` |
| `SHARE` | 공유 | `{ title, message, url? }` |

#### Native → WebView 메시지

| 타입 | 설명 | 페이로드 |
|------|------|----------|
| `CAMERA_RESULT` | 카메라 결과 | `{ uri, base64?, fileName? }` |
| `PUSH_TOKEN` | FCM 토큰 | `{ token }` |
| `AUTH_STATE` | 인증 상태 | `{ isLoggedIn, userId?, accessToken? }` |
| `NAVIGATE_BACK` | 뒤로가기 | - |

### 딥링크 설정

#### URL 스킴
- iOS/Android: `sundayhug://`
- Universal Link / App Link: `https://app.sundayhug.com`

#### 딥링크 매핑

| URL | 화면 |
|-----|------|
| `sundayhug://customer` | 홈 탭 |
| `sundayhug://customer/warranty` | 보증서 탭 |
| `sundayhug://customer/warranty/view/{id}` | 보증서 상세 (WebView) |
| `sundayhug://customer/sleep` | 수면분석 탭 |
| `sundayhug://customer/sleep/result/{id}` | 분석 결과 (WebView) |
| `sundayhug://customer/mypage` | 마이페이지 탭 |
| `sundayhug://customer/mypage/warranty/{id}` | 내 보증서 상세 (WebView) |

### 푸시 알림 시나리오

| 이벤트 | 알림 내용 | 딥링크 |
|--------|----------|--------|
| 보증서 등록 완료 | "보증서가 등록되었습니다" | `/customer/mypage/warranty/{id}` |
| A/S 접수 완료 | "A/S 신청이 접수되었습니다" | `/customer/mypage/as` |
| A/S 상태 변경 | "A/S 진행 상태가 변경되었습니다" | `/customer/mypage/as` |
| 수면 분석 완료 | "수면 환경 분석이 완료되었습니다" | `/customer/sleep/result/{id}` |

### 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| React Native | 0.76.5 | 앱 프레임워크 (New Architecture) |
| React Navigation | 7.x | 네비게이션 |
| react-native-webview | 13.x | WebView 컨테이너 |
| @react-native-firebase/messaging | 21.x | 푸시 알림 (FCM) |
| react-native-image-picker | 7.x | 카메라/갤러리 |
| @react-native-kakao/login | 2.x | 카카오 로그인 |
| react-native-mmkv | 3.x | 로컬 스토리지 (토큰 저장) |
| react-native-safe-area-context | 4.x | Safe Area 처리 |
| react-native-screens | 4.x | 네이티브 스크린 최적화 |

### 생성된 파일 목록

#### 설정 파일
- `package.json` - 의존성 정의
- `app.json` - 앱 설정 (Bundle ID: com.sundayhug.app)
- `tsconfig.json` - TypeScript 설정
- `metro.config.js` - Metro 번들러 (모노레포 지원)
- `babel.config.js` - Babel 설정 (module-resolver)
- `.eslintrc.js` - ESLint 설정
- `.gitignore` - Git 무시 파일

#### 소스 코드 (src/)
- `constants/config.ts` - 색상, URL 매핑, 설정 상수
- `types/bridge.ts` - 브릿지 메시지 타입 정의
- `contexts/AuthContext.tsx` - 인증 상태 관리 (MMKV)
- `navigation/RootNavigator.tsx` - 루트 Stack Navigator
- `navigation/MainTabNavigator.tsx` - Bottom Tab Navigator
- `navigation/linking.ts` - 딥링크 설정
- `hooks/useDeepLink.ts` - 딥링크 처리 훅
- `components/TabBarIcon.tsx` - 탭바 아이콘
- `components/WebViewContainer.tsx` - WebView + 브릿지
- `screens/SplashScreen.tsx` - 스플래시
- `screens/LoginScreen.tsx` - 로그인 (카카오)
- `screens/HomeScreen.tsx` - 홈 서비스 허브
- `screens/MyPageScreen.tsx` - 마이페이지
- `screens/WarrantyScreen.tsx` - 보증서 (WebView)
- `screens/SleepScreen.tsx` - 수면분석 (WebView)
- `screens/WebViewScreen.tsx` - 범용 WebView
- `services/camera.ts` - 카메라/갤러리 서비스
- `services/push.ts` - 푸시 알림 서비스 (FCM)
- `services/kakao.ts` - 카카오 로그인 서비스

#### 브릿지 & 문서
- `bridge/app-bridge.js` - 웹앱용 브릿지 스크립트
- `docs/IOS_SETUP.md` - iOS 설정 가이드
- `docs/ANDROID_SETUP.md` - Android 설정 가이드
- `docs/WEBAPP_BRIDGE.md` - 웹앱 브릿지 연동 가이드
- `scripts/setup-native.sh` - 네이티브 설정 스크립트

### Android 네이티브 프로젝트 설정 (완료)

#### 생성된 네이티브 폴더
- `android/` - Android 네이티브 프로젝트
- `ios/` - iOS 네이티브 프로젝트

#### Android 설정 내용

**패키지 정보:**
- Package Name: `com.sundayhug.app`
- Version: 1.0.0
- Min SDK: 24 (Android 7.0)
- Target SDK: 36

**수정된 파일:**
- `android/build.gradle` - 카카오 SDK Maven repository 추가
- `android/app/build.gradle` - 패키지명 변경, manifestPlaceholders 추가
- `android/app/src/main/AndroidManifest.xml` - 권한 및 딥링크 스킴 추가
- `android/app/src/main/res/values/strings.xml` - 앱 이름 및 카카오 앱 키
- `android/app/src/main/java/com/sundayhug/app/*.kt` - 패키지명 변경

### 카카오 로그인 SDK 설정 (완료)

**카카오 개발자센터 등록 정보:**
- 앱 이름: 썬데이허그
- 네이티브 앱 키: `a8d8f11febcb6c3d3a6c69507648c60e`
- 패키지명: `com.sundayhug.app`
- 키 해시: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`

**사용 라이브러리:**
- `@react-native-seoul/kakao-login`: ^5.4.1

### 다음 단계 (TODO)

#### 즉시 필요
1. [x] ~~iOS/Android 네이티브 프로젝트 생성~~ ✅
2. [x] ~~카카오 개발자센터에서 앱 등록 및 키 발급~~ ✅
3. [ ] Android 에뮬레이터 또는 실제 기기에서 테스트
4. [ ] Firebase 프로젝트 설정 및 설정 파일 추가
5. [ ] iOS TestFlight 배포 (Apple Developer 승인 후)
6. [ ] Play Store 내부 테스트 배포

#### 웹앱 연동 (선택)
- [ ] `apps/customer`에 `bridge/app-bridge.js` 적용
- [ ] 카메라 요청 시 네이티브 연동 (수면 분석 페이지)
- [ ] 로그인 성공 시 앱에 알림

#### 추후 개선
- [ ] 대시보드에 푸시 알림 관리 기능 추가
- [ ] 앱 아이콘 및 스플래시 이미지 제작
- [ ] 앱스토어 스크린샷 및 메타데이터 준비

### 기존 서비스 영향

**✅ 기존 서비스 무영향**
- `apps/customer` 웹앱: 수정 없음
- `apps/dashboard` 대시보드: 수정 없음
- `packages/*` 공유 패키지: 수정 없음
- 데이터베이스 스키마: 변경 없음

모든 모바일 앱 코드는 `apps/mobile` 폴더에 독립적으로 생성됨.

### 환경변수 (추가 필요)

```bash
# Firebase (iOS/Android 각각 설정 파일로 관리)
# - ios/SundayhugApp/GoogleService-Info.plist
# - android/app/google-services.json

# 카카오 SDK
KAKAO_APP_KEY=your_kakao_app_key
```

### 참고 문서

- [React Native 공식 문서](https://reactnative.dev/)
- [React Navigation 문서](https://reactnavigation.org/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [카카오 로그인 SDK](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [TestFlight 가이드](https://developer.apple.com/testflight/)


