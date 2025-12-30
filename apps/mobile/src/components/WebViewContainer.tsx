/**
 * WebView 컨테이너 컴포넌트
 * Native <-> WebView 브릿지 통신 처리
 */

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  BackHandler,
  Platform,
} from 'react-native';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, WEB_BASE_URL } from '@/constants/config';
import type { WebToNativeMessage, NativeToWebMessage, RootStackParamList } from '@/types/bridge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface WebViewContainerProps {
  url: string;
  showHeader?: boolean;
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
}

// WebView에 주입할 브릿지 스크립트
const INJECTED_JAVASCRIPT = `
  (function() {
    // 앱에서 실행 중임을 표시
    window.isReactNativeApp = true;
    
    // 네이티브로 메시지 전송 헬퍼
    window.sendToNative = function(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
      }
    };
    
    // 네이티브에서 메시지 수신 핸들러
    window.handleNativeMessage = function(message) {
      const event = new CustomEvent('nativeMessage', { detail: message });
      window.dispatchEvent(event);
    };
    
    // 카메라 요청 함수
    window.requestNativeCamera = function(mode) {
      window.sendToNative('REQUEST_CAMERA', { mode: mode || 'photo' });
    };
    
    // 카메라 결과 콜백 (네이티브에서 호출)
    window.onCameraResult = null;
    
    // 앱 내 헤더/탭바 숨김을 위한 클래스 추가
    document.documentElement.classList.add('in-app');
    
    // 페이지 로드 완료 알림
    window.sendToNative('PAGE_LOADED', { url: window.location.href });
    
    true;
  })();
`;

export function WebViewContainer({
  url,
  showHeader = true,
  onNavigationStateChange,
}: WebViewContainerProps) {
  const webViewRef = useRef<WebView>(null);
  const navigation = useNavigation<NavigationProp>();
  const { login, logout, accessToken, userId, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  // 뒤로가기 핸들러 (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      if (Platform.OS === 'android') {
        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
      return () => {};
    }, [canGoBack])
  );

  // WebView에 메시지 전송
  const sendToWebView = useCallback((message: NativeToWebMessage) => {
    if (webViewRef.current) {
      const script = `
        if (window.handleNativeMessage) {
          window.handleNativeMessage(${JSON.stringify(message)});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  // WebView에서 메시지 수신
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as WebToNativeMessage;
        
        switch (message.type) {
          case 'REQUEST_CAMERA':
            handleCameraRequest(message.payload.mode);
            break;
            
          case 'REQUEST_PUSH_PERMISSION':
            handlePushPermissionRequest();
            break;
            
          case 'NAVIGATE':
            handleNavigate(message.payload.screen, message.payload.params);
            break;
            
          case 'SET_TAB':
            handleSetTab(message.payload.tab);
            break;
            
          case 'LOGIN_SUCCESS':
            login(message.payload.userId, message.payload.accessToken);
            break;
            
          case 'LOGOUT':
            logout();
            break;
            
          case 'OPEN_EXTERNAL_URL':
            Linking.openURL(message.payload.url);
            break;
            
          case 'SHARE':
            handleShare(message.payload);
            break;
            
          default:
            console.log('Unknown message type:', message);
        }
      } catch (error) {
        console.error('Failed to parse WebView message:', error);
      }
    },
    [login, logout, navigation]
  );

  // 카메라 요청 처리
  const handleCameraRequest = async (mode: 'photo' | 'gallery') => {
    // TODO: react-native-image-picker 연동
    Alert.alert('카메라', `${mode === 'photo' ? '사진 촬영' : '갤러리'} 기능은 준비 중입니다.`);
  };

  // 푸시 알림 권한 요청
  const handlePushPermissionRequest = async () => {
    // TODO: Firebase Messaging 권한 요청
    Alert.alert('알림', '푸시 알림 권한 요청 기능은 준비 중입니다.');
  };

  // 네비게이션 처리
  const handleNavigate = (screen: string, params?: Record<string, unknown>) => {
    if (screen === 'WebView' && params?.url) {
      navigation.navigate('WebView', {
        url: params.url as string,
        title: params.title as string | undefined,
      });
    }
  };

  // 탭 전환
  const handleSetTab = (tab: 'home' | 'warranty' | 'sleep' | 'mypage') => {
    const tabMap = {
      home: 'HomeTab',
      warranty: 'WarrantyTab',
      sleep: 'SleepTab',
      mypage: 'MyPageTab',
    };
    // @ts-ignore - Tab navigation
    navigation.navigate('Main', { screen: tabMap[tab] });
  };

  // 공유 처리
  const handleShare = async (payload: { title: string; message: string; url?: string }) => {
    // TODO: Share API 연동
    Alert.alert('공유', '공유 기능은 준비 중입니다.');
  };

  // 네비게이션 상태 변경
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    onNavigationStateChange?.(navState);
  };

  // URL에 인증 정보 추가
  const getUrlWithAuth = () => {
    const urlObj = new URL(url);
    if (isLoggedIn && accessToken) {
      // 앱에서 열렸음을 표시하는 파라미터 추가
      urlObj.searchParams.set('_app', '1');
    }
    return urlObj.toString();
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: getUrlWithAuth() }}
        style={styles.webView}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        // 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        // 쿠키/캐시
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        // 미디어
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // 보안
        mixedContentMode="compatibility"
        // 에러 처리
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent.statusCode);
        }}
        // 렌더링 컨텐츠
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
      />
      
      {/* 로딩 오버레이 */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});



