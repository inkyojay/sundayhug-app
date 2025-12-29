# Android 설정 가이드

## 1. 네이티브 프로젝트 생성

```bash
cd apps/mobile
npx react-native init SundayhugApp --template react-native-template-typescript --directory temp-android

# android 폴더만 복사
mv temp-android/android ./android
rm -rf temp-android
```

## 2. AndroidManifest.xml 설정

`android/app/src/main/AndroidManifest.xml`:

### 권한

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 딥링크

```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask">
  
  <!-- 커스텀 URL 스킴 -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="sundayhug" />
  </intent-filter>
  
  <!-- App Links -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="app.sundayhug.com" />
  </intent-filter>
  
  <!-- 카카오 로그인 -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="kakao{KAKAO_APP_KEY}" android:host="oauth" />
  </intent-filter>
</activity>
```

## 3. strings.xml 설정

`android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">썬데이허그</string>
    <string name="kakao_app_key">{YOUR_KAKAO_APP_KEY}</string>
</resources>
```

## 4. build.gradle 설정

`android/app/build.gradle`:

```groovy
android {
    defaultConfig {
        applicationId "com.sundayhug.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        
        // 카카오 SDK
        manifestPlaceholders = [
            kakaoScheme: "kakao${project.properties['KAKAO_APP_KEY']}"
        ]
    }
    
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

## 5. Firebase 설정

1. Firebase Console에서 Android 앱 추가
2. 패키지명: `com.sundayhug.app`
3. `google-services.json` 다운로드
4. `android/app/` 폴더에 복사

`android/build.gradle`에 추가:

```groovy
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

`android/app/build.gradle`에 추가:

```groovy
apply plugin: 'com.google.gms.google-services'
```

## 6. ProGuard 설정

`android/app/proguard-rules.pro`:

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Kakao SDK
-keep class com.kakao.** { *; }
-dontwarn com.kakao.**

# Firebase
-keep class com.google.firebase.** { *; }
```

## 7. 앱 아이콘

`android/app/src/main/res/` 폴더에 다음 크기 아이콘 추가:

- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

### Adaptive Icon

`mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

## 8. 스플래시 스크린

`android/app/src/main/res/drawable/launch_screen.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splashscreen_bg"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/splash_logo"/>
    </item>
</layer-list>
```

## 9. 릴리즈 키스토어 생성

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/release.keystore \
  -alias sundayhug \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

## 10. 빌드

### 개발 빌드

```bash
npm run android
```

### 릴리즈 APK

```bash
cd android
./gradlew assembleRelease
# 결과: android/app/build/outputs/apk/release/app-release.apk
```

### 릴리즈 AAB (Play Store)

```bash
cd android
./gradlew bundleRelease
# 결과: android/app/build/outputs/bundle/release/app-release.aab
```

## 11. Play Store 제출

### 필요 정보

- 앱 이름: 썬데이허그
- 간단한 설명: 디지털 보증서 등록 및 AI 수면 환경 분석 서비스
- 자세한 설명: 썬데이허그 제품 보증서 등록, 수면 환경 분석, A/S 신청 등
- 카테고리: 라이프스타일
- 콘텐츠 등급: 전체이용가
- 개인정보처리방침: https://app.sundayhug.com/privacy

### 스크린샷

- 휴대전화: 최소 2장 (1080x1920 이상)
- 7인치 태블릿: 선택
- 10인치 태블릿: 선택

### 출시 전 체크리스트

- [ ] 앱 서명 키 안전하게 보관
- [ ] 릴리즈 빌드 테스트
- [ ] 딥링크 테스트
- [ ] 푸시 알림 테스트
- [ ] 카카오 로그인 테스트



