/**
 * 마이페이지 스크린 (네이티브)
 * 사용자 정보 및 메뉴
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, WEBVIEW_ROUTES, APP_VERSION } from '@/constants/config';
import type { RootStackParamList } from '@/types/bridge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  webviewUrl?: string;
  action?: () => void;
}

export function MyPageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userId, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: 'warranties',
      title: '내 보증서',
      icon: '📋',
      webviewUrl: WEBVIEW_ROUTES.warranties,
    },
    {
      id: 'analyses',
      title: '수면 분석 이력',
      icon: '📊',
      webviewUrl: WEBVIEW_ROUTES.analyses,
    },
    {
      id: 'as',
      title: 'A/S 신청 내역',
      icon: '🔧',
      webviewUrl: WEBVIEW_ROUTES.as_list,
    },
    {
      id: 'points',
      title: '포인트',
      icon: '💰',
      webviewUrl: WEBVIEW_ROUTES.points,
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      id: 'notification',
      title: '알림 설정',
      icon: '🔔',
      action: () => Alert.alert('알림 설정', '준비 중입니다.'),
    },
    {
      id: 'terms',
      title: '이용약관',
      icon: '📄',
      action: () => navigation.navigate('WebView', {
        url: 'https://app.sundayhug.com/terms',
        title: '이용약관',
      }),
    },
    {
      id: 'privacy',
      title: '개인정보처리방침',
      icon: '🔒',
      action: () => navigation.navigate('WebView', {
        url: 'https://app.sundayhug.com/privacy',
        title: '개인정보처리방침',
      }),
    },
    {
      id: 'logout',
      title: '로그아웃',
      icon: '🚪',
      action: handleLogout,
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.webviewUrl) {
      navigation.navigate('WebView', {
        url: item.webviewUrl,
        title: item.title,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 헤더 */}
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileEmoji}>👤</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>회원</Text>
            <Text style={styles.profileId}>
              {userId ? `ID: ${userId.slice(0, 8)}...` : '로그인됨'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert('프로필 수정', '준비 중입니다.')}
          >
            <Text style={styles.editButtonText}>수정</Text>
          </TouchableOpacity>
        </View>

        {/* 메인 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 설정 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>설정</Text>
          <View style={styles.menuCard}>
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < settingsItems.length - 1 && styles.menuItemBorder,
                  item.id === 'logout' && styles.logoutItem,
                ]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.menuTitle,
                    item.id === 'logout' && styles.logoutText,
                  ]}
                >
                  {item.title}
                </Text>
                {item.id !== 'logout' && (
                  <Text style={styles.menuArrow}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 앱 정보 */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>썬데이허그 v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileId: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  menuArrow: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: COLORS.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 24,
  },
  appInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});



