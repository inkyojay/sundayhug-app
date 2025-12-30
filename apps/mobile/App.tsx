/**
 * 썬데이허그 모바일 앱
 * React Native + WebView 하이브리드 앱
 */

import React, { useEffect } from 'react';
import { StatusBar, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { AuthProvider } from '@/contexts/AuthContext';
import { initializePush, PushNotification, getDeepLinkFromNotification } from '@/services/push';
import { COLORS } from '@/constants/config';

function App(): React.JSX.Element {
  // 푸시 알림 초기화
  useEffect(() => {
    const setupPush = async () => {
      try {
        const token = await initializePush(
          // 포그라운드에서 알림 수신
          (notification: PushNotification) => {
            console.log('Foreground notification:', notification);
            // 인앱 알림 표시
            if (notification.title || notification.body) {
              Alert.alert(
                notification.title || '알림',
                notification.body || '',
                [{ text: '확인' }]
              );
            }
          },
          // 알림 탭하여 앱 열기
          (notification: PushNotification) => {
            console.log('Notification opened:', notification);
            const deepLink = getDeepLinkFromNotification(notification);
            if (deepLink) {
              // 딥링크 처리는 NavigationContainer의 linking으로 자동 처리
              console.log('Deep link from notification:', deepLink);
            }
          }
        );
        
        if (token) {
          console.log('FCM Token:', token.slice(0, 20) + '...');
          // TODO: 서버에 토큰 등록
        }
      } catch (error) {
        console.error('Failed to initialize push:', error);
      }
    };

    setupPush();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

