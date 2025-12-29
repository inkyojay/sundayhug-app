#!/bin/bash

# 썬데이허그 모바일 앱 네이티브 프로젝트 설정 스크립트

set -e

echo "🚀 썬데이허그 모바일 앱 네이티브 설정 시작..."

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
  echo "❌ apps/mobile 디렉토리에서 실행해주세요."
  exit 1
fi

# Node 버전 확인
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18 이상이 필요합니다. 현재: $(node -v)"
  exit 1
fi

echo "📦 의존성 설치..."
npm install

# iOS 설정 (macOS에서만)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo ""
  echo "🍎 iOS 설정..."
  
  # Xcode 확인
  if ! command -v xcodebuild &> /dev/null; then
    echo "⚠️  Xcode가 설치되어 있지 않습니다. iOS 빌드를 위해 설치해주세요."
  else
    echo "✅ Xcode: $(xcodebuild -version | head -n1)"
  fi
  
  # CocoaPods 확인
  if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods가 설치되어 있지 않습니다."
    echo "   설치: sudo gem install cocoapods"
  else
    echo "✅ CocoaPods: $(pod --version)"
  fi
  
  # ios 폴더가 없으면 생성 안내
  if [ ! -d "ios" ]; then
    echo ""
    echo "📱 iOS 네이티브 프로젝트 생성이 필요합니다."
    echo "   다음 명령어를 실행하세요:"
    echo ""
    echo "   npx react-native init SundayhugApp --template react-native-template-typescript --skip-install"
    echo "   mv SundayhugApp/ios ./ios"
    echo "   rm -rf SundayhugApp"
    echo "   cd ios && pod install"
    echo ""
  else
    echo ""
    echo "📱 iOS Pod 설치..."
    cd ios && pod install && cd ..
    echo "✅ iOS Pod 설치 완료"
  fi
fi

# Android 설정
echo ""
echo "🤖 Android 설정..."

# Java 확인
if ! command -v java &> /dev/null; then
  echo "⚠️  Java가 설치되어 있지 않습니다."
else
  echo "✅ Java: $(java -version 2>&1 | head -n1)"
fi

# ANDROID_HOME 확인
if [ -z "$ANDROID_HOME" ]; then
  echo "⚠️  ANDROID_HOME 환경변수가 설정되어 있지 않습니다."
  echo "   Android Studio 설치 후 설정해주세요."
else
  echo "✅ ANDROID_HOME: $ANDROID_HOME"
fi

# android 폴더가 없으면 생성 안내
if [ ! -d "android" ]; then
  echo ""
  echo "📱 Android 네이티브 프로젝트 생성이 필요합니다."
  echo "   다음 명령어를 실행하세요:"
  echo ""
  echo "   npx react-native init SundayhugApp --template react-native-template-typescript --skip-install"
  echo "   mv SundayhugApp/android ./android"
  echo "   rm -rf SundayhugApp"
  echo ""
fi

echo ""
echo "✅ 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. Firebase 설정 파일 추가"
echo "   - iOS: ios/SundayhugApp/GoogleService-Info.plist"
echo "   - Android: android/app/google-services.json"
echo ""
echo "2. 카카오 SDK 설정"
echo "   - KAKAO_APP_KEY 환경변수 설정"
echo "   - Info.plist / AndroidManifest.xml 업데이트"
echo ""
echo "3. 앱 실행"
echo "   - iOS: npm run ios"
echo "   - Android: npm run android"
echo ""



