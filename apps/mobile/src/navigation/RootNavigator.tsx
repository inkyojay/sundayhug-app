/**
 * 루트 네비게이터
 * Stack Navigator (Auth) + Tab Navigator (Main)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '@/screens/LoginScreen';
import { WebViewScreen } from '@/screens/WebViewScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { COLORS } from '@/constants/config';
import type { RootStackParamList } from '@/types/bridge';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isLoading, isLoggedIn } = useAuth();

  // 로딩 중일 때 스플래시 표시
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      {isLoggedIn ? (
        // 로그인 상태
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="WebView"
            component={WebViewScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: COLORS.background },
              headerTintColor: COLORS.text,
              headerTitleStyle: { fontWeight: '600' },
              animation: 'slide_from_bottom',
            }}
          />
        </>
      ) : (
        // 비로그인 상태
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}



