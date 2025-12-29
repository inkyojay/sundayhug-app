/**
 * 딥링크 처리 훅
 * URL 스킴 및 Universal Link 처리
 */

import { useEffect, useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WEBVIEW_ROUTES, WEB_BASE_URL } from '@/constants/config';
import type { RootStackParamList } from '@/types/bridge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DeepLinkRoute {
  screen: keyof RootStackParamList;
  params?: Record<string, unknown>;
}

/**
 * URL 경로를 화면으로 매핑
 */
function parseDeepLinkUrl(url: string): DeepLinkRoute | null {
  try {
    // URL 파싱
    let pathname = '';
    let searchParams = new URLSearchParams();
    
    if (url.startsWith('sundayhug://')) {
      // 커스텀 스킴
      const withoutScheme = url.replace('sundayhug://', '');
      const [path, query] = withoutScheme.split('?');
      pathname = '/' + path;
      if (query) searchParams = new URLSearchParams(query);
    } else {
      // Universal Link
      const parsed = new URL(url);
      pathname = parsed.pathname;
      searchParams = parsed.searchParams;
    }
    
    // 경로 정규화
    pathname = pathname.replace(/^\/+|\/+$/g, '');
    const segments = pathname.split('/');
    
    // 탭 라우트 매핑
    const tabRoutes: Record<string, 'HomeTab' | 'WarrantyTab' | 'SleepTab' | 'MyPageTab'> = {
      'customer': 'HomeTab',
      'customer/warranty': 'WarrantyTab',
      'customer/sleep': 'SleepTab',
      'customer/mypage': 'MyPageTab',
    };
    
    // 정확한 탭 매칭
    if (tabRoutes[pathname]) {
      return {
        screen: 'Main',
        params: { screen: tabRoutes[pathname] },
      };
    }
    
    // 보증서 상세
    if (segments[0] === 'customer' && segments[1] === 'warranty' && segments[2] === 'view') {
      const id = segments[3];
      return {
        screen: 'WebView',
        params: {
          url: WEBVIEW_ROUTES.warranty_detail(id),
          title: '보증서 상세',
        },
      };
    }
    
    // 마이페이지 보증서 상세
    if (segments[0] === 'customer' && segments[1] === 'mypage' && segments[2] === 'warranty') {
      const id = segments[3];
      return {
        screen: 'WebView',
        params: {
          url: WEBVIEW_ROUTES.warranty_mypage(id),
          title: '보증서 상세',
        },
      };
    }
    
    // 수면 분석 결과
    if (segments[0] === 'customer' && segments[1] === 'sleep' && segments[2] === 'result') {
      const id = segments[3];
      return {
        screen: 'WebView',
        params: {
          url: WEBVIEW_ROUTES.sleep_result(id),
          title: '수면 분석 결과',
        },
      };
    }
    
    // 블로그 포스트
    if (segments[0] === 'customer' && segments[1] === 'blog' && segments[2]) {
      const postId = segments[2];
      return {
        screen: 'WebView',
        params: {
          url: WEBVIEW_ROUTES.blog_post(postId),
          title: '블로그',
        },
      };
    }
    
    // A/S 신청
    if (segments[0] === 'customer' && segments[1] === 'as' && segments[2]) {
      const warrantyId = segments[2];
      return {
        screen: 'WebView',
        params: {
          url: WEBVIEW_ROUTES.as_request(warrantyId),
          title: 'A/S 신청',
        },
      };
    }
    
    // 채팅방
    if (segments[0] === 'customer' && segments[1] === 'chat' && segments[2]) {
      const sessionId = segments[2];
      return {
        screen: 'WebView',
        params: {
          url: WEBVIEW_ROUTES.chat_room(sessionId),
          title: 'AI 상담',
        },
      };
    }
    
    // 로그인
    if (pathname === 'login' || pathname === 'customer/login') {
      return {
        screen: 'Login',
      };
    }
    
    // 기타 경로는 WebView로
    if (pathname.startsWith('customer/')) {
      return {
        screen: 'WebView',
        params: {
          url: `${WEB_BASE_URL}/${pathname}`,
        },
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}

/**
 * 딥링크 처리 훅
 */
export function useDeepLink() {
  const navigation = useNavigation<NavigationProp>();

  // 딥링크 처리 함수
  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url) return;
      
      console.log('Handling deep link:', url);
      
      const route = parseDeepLinkUrl(url);
      
      if (!route) {
        console.log('No matching route for deep link');
        return;
      }
      
      console.log('Navigating to:', route);
      
      // @ts-ignore - 동적 네비게이션
      navigation.navigate(route.screen, route.params);
    },
    [navigation]
  );

  // 앱 시작 시 초기 URL 확인
  useEffect(() => {
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('Initial URL:', initialUrl);
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Failed to get initial URL:', error);
      }
    };

    getInitialURL();
  }, [handleDeepLink]);

  // 앱 실행 중 딥링크 수신
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Received URL:', url);
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  return { handleDeepLink };
}

/**
 * 딥링크 URL 생성 유틸리티
 */
export const DeepLinkBuilder = {
  // 홈
  home: () => 'sundayhug://customer',
  
  // 보증서
  warranty: () => 'sundayhug://customer/warranty',
  warrantyDetail: (id: string) => `sundayhug://customer/warranty/view/${id}`,
  
  // 수면 분석
  sleep: () => 'sundayhug://customer/sleep',
  sleepResult: (id: string) => `sundayhug://customer/sleep/result/${id}`,
  
  // 마이페이지
  mypage: () => 'sundayhug://customer/mypage',
  mypageWarranty: (id: string) => `sundayhug://customer/mypage/warranty/${id}`,
  
  // 블로그
  blog: () => 'sundayhug://customer/blog',
  blogPost: (id: string) => `sundayhug://customer/blog/${id}`,
  
  // A/S
  asRequest: (warrantyId: string) => `sundayhug://customer/as/${warrantyId}`,
  asList: () => 'sundayhug://customer/mypage/as',
};



