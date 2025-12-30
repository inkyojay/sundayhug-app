# iOS 설정 가이드

## 1. 네이티브 프로젝트 생성

```bash
cd apps/mobile
npx react-native init SundayhugApp --template react-native-template-typescript --directory temp-ios

# ios 폴더만 복사
mv temp-ios/ios ./ios
rm -rf temp-ios
```

## 2. CocoaPods 설치

```bash
cd ios
pod install
```

## 3. Info.plist 설정

`ios/SundayhugApp/Info.plist`에 다음 항목 추가:

### 카메라 권한

```xml
<key>NSCameraUsageDescription</key>
<string>수면 환경 분석을 위해 카메라 접근이 필요합니다.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>수면 환경 사진을 선택하기 위해 사진 라이브러리 접근이 필요합니다.</string>
```

### 딥링크 URL 스킴

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>sundayhug</string>
      <string>kakao{KAKAO_APP_KEY}</string>
    </array>
  </dict>
</array>
```

### Universal Links (Associated Domains)

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:app.sundayhug.com</string>
</array>
```

### 카카오 SDK

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>kakaokompassauth</string>
  <string>kakaolink</string>
  <string>kakaoplus</string>
</array>

<key>KAKAO_APP_KEY</key>
<string>{YOUR_KAKAO_APP_KEY}</string>
```

## 4. AppDelegate 설정

`ios/SundayhugApp/AppDelegate.mm` 수정:

```objc
#import <React/RCTLinkingManager.h>
#import <RNKakaoLogins.h>

// 딥링크 처리
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  // 카카오 로그인 처리
  if ([RNKakaoLogins isKakaoTalkLoginUrl:url]) {
    return [RNKakaoLogins handleOpenUrl:url];
  }
  
  return [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links 처리
- (BOOL)application:(UIApplication *)application
continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}
```

## 5. Firebase 설정

1. Firebase Console에서 iOS 앱 추가
2. `GoogleService-Info.plist` 다운로드
3. `ios/SundayhugApp/` 폴더에 복사

## 6. 앱 아이콘

`ios/SundayhugApp/Images.xcassets/AppIcon.appiconset/`에 다음 크기 이미지 추가:

- 20x20 @1x, @2x, @3x
- 29x29 @1x, @2x, @3x
- 40x40 @1x, @2x, @3x
- 60x60 @2x, @3x
- 76x76 @1x, @2x
- 83.5x83.5 @2x
- 1024x1024 (App Store)

## 7. 스플래시 스크린

LaunchScreen.storyboard 커스터마이징 또는 react-native-splash-screen 사용

## 8. 빌드 및 배포

### 개발 빌드

```bash
npm run ios
```

### 릴리즈 빌드

```bash
cd ios
xcodebuild -workspace SundayhugApp.xcworkspace \
  -scheme SundayhugApp \
  -configuration Release \
  -archivePath build/SundayhugApp.xcarchive \
  archive
```

### TestFlight 업로드

1. Xcode에서 Archive
2. Organizer에서 Distribute App
3. App Store Connect 선택
4. 업로드 완료 후 TestFlight에서 배포

## 9. App Store 제출

### 필요 정보

- 앱 이름: 썬데이허그
- 부제: 디지털 보증서 & 수면 환경 분석
- 카테고리: 라이프스타일
- 연령 등급: 4+
- 개인정보처리방침 URL: https://app.sundayhug.com/privacy
- 지원 URL: https://sundayhug.com

### 스크린샷

- 6.7인치 (iPhone 15 Pro Max): 1290 x 2796
- 6.5인치 (iPhone 14 Plus): 1284 x 2778
- 5.5인치 (iPhone 8 Plus): 1242 x 2208

### 심사 노트

- 테스트 계정 정보 제공 (카카오 로그인)
- WebView 사용 설명 (기존 웹 서비스와의 연동)



