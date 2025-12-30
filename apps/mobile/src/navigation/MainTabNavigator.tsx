/**
 * 메인 탭 네비게이터
 * 홈 / 보증서 / 수면분석 / 마이페이지
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '@/screens/HomeScreen';
import { WarrantyScreen } from '@/screens/WarrantyScreen';
import { SleepScreen } from '@/screens/SleepScreen';
import { MyPageScreen } from '@/screens/MyPageScreen';
import { TabBarIcon } from '@/components/TabBarIcon';
import { COLORS, TABS } from '@/constants/config';
import type { MainTabParamList } from '@/types/bridge';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ],
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name={TABS.home.name as 'HomeTab'}
        component={HomeScreen}
        options={{
          tabBarLabel: TABS.home.label,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name={TABS.warranty.name as 'WarrantyTab'}
        component={WarrantyScreen}
        options={{
          tabBarLabel: TABS.warranty.label,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="shield-checkmark" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name={TABS.sleep.name as 'SleepTab'}
        component={SleepScreen}
        options={{
          tabBarLabel: TABS.sleep.label,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="moon" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name={TABS.mypage.name as 'MyPageTab'}
        component={MyPageScreen}
        options={{
          tabBarLabel: TABS.mypage.label,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.backgroundLight,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 60,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});



