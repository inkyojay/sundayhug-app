/**
 * 딥링크 설정
 * sundayhug://path 형식의 딥링크 처리
 */

import { LinkingOptions } from '@react-navigation/native';
import { DEEP_LINK_SCHEME } from '@/constants/config';
import type { RootStackParamList } from '@/types/bridge';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    `${DEEP_LINK_SCHEME}://`,
    'https://app.sundayhug.com',
    'http://localhost:5173',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: 'customer',
          WarrantyTab: 'customer/warranty',
          SleepTab: 'customer/sleep',
          MyPageTab: 'customer/mypage',
        },
      },
      WebView: {
        path: 'webview',
        parse: {
          url: (url: string) => decodeURIComponent(url),
        },
      },
      Login: 'login',
    },
  },
  // 딥링크로 앱이 열릴 때 로그 (디버깅용)
  getInitialURL: async () => {
    // 앱이 딥링크로 열렸을 때 초기 URL 반환
    return null;
  },
  subscribe: (listener) => {
    // 앱이 실행 중일 때 딥링크 수신
    // 추후 Linking API 연결
    return () => {};
  },
};

/**
 * 딥링크 URL에서 화면 정보 파싱
 */
export function parseDeepLink(url: string): { screen: string; params?: Record<string, string> } | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, '');
    const params: Record<string, string> = {};
    
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // 경로별 화면 매핑
    if (path.startsWith('customer/warranty/view/')) {
      const id = path.split('/').pop();
      return { screen: 'WebView', params: { url, id } };
    }
    
    if (path.startsWith('customer/sleep/result/')) {
      const id = path.split('/').pop();
      return { screen: 'WebView', params: { url, id } };
    }

    if (path.startsWith('customer/mypage/warranty/')) {
      const id = path.split('/').pop();
      return { screen: 'WebView', params: { url, id } };
    }

    // 기본 탭 매핑
    const tabMap: Record<string, string> = {
      'customer': 'HomeTab',
      'customer/warranty': 'WarrantyTab',
      'customer/sleep': 'SleepTab',
      'customer/mypage': 'MyPageTab',
    };

    if (tabMap[path]) {
      return { screen: tabMap[path] };
    }

    // 기타 경로는 WebView로
    return { screen: 'WebView', params: { url } };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}



