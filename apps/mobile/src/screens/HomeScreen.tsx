/**
 * 홈 스크린 (네이티브)
 * 서비스 허브 - 주요 기능 바로가기
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, WEBVIEW_ROUTES } from '@/constants/config';
import type { RootStackParamList } from '@/types/bridge';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route?: string;
  webviewUrl?: string;
}

const SERVICES: ServiceCard[] = [
  {
    id: 'warranty',
    title: '디지털 보증서',
    description: '제품 보증서 등록 및 조회',
    icon: '🛡️',
    color: '#6366f1',
    webviewUrl: WEBVIEW_ROUTES.warranty_register,
  },
  {
    id: 'sleep',
    title: '수면 환경 분석',
    description: 'AI 수면 환경 분석',
    icon: '🌙',
    color: '#8b5cf6',
    webviewUrl: WEBVIEW_ROUTES.sleep_analyze,
  },
  {
    id: 'blog',
    title: '육아 블로그',
    description: '육아 정보 & 팁',
    icon: '📚',
    color: '#ec4899',
    webviewUrl: WEBVIEW_ROUTES.blog,
  },
  {
    id: 'chat',
    title: 'AI 육아 상담',
    description: 'AI 육아 도우미',
    icon: '💬',
    color: '#14b8a6',
    webviewUrl: WEBVIEW_ROUTES.chat,
  },
];

const QUICK_ACTIONS = [
  {
    id: 'as',
    title: 'A/S 신청 내역',
    icon: '🔧',
    webviewUrl: WEBVIEW_ROUTES.as_list,
  },
  {
    id: 'warranties',
    title: '내 보증서',
    icon: '📋',
    webviewUrl: WEBVIEW_ROUTES.warranties,
  },
  {
    id: 'analyses',
    title: '분석 이력',
    icon: '📊',
    webviewUrl: WEBVIEW_ROUTES.analyses,
  },
  {
    id: 'event',
    title: '이벤트',
    icon: '🎁',
    webviewUrl: WEBVIEW_ROUTES.event_review,
  },
];

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userId } = useAuth();

  const handleServicePress = (service: ServiceCard) => {
    if (service.webviewUrl) {
      navigation.navigate('WebView', {
        url: service.webviewUrl,
        title: service.title,
      });
    }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    navigation.navigate('WebView', {
      url: action.webviewUrl,
      title: action.title,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요 👋</Text>
            <Text style={styles.welcomeText}>썬데이허그에 오신 것을 환영합니다</Text>
          </View>
          <View style={styles.profileIcon}>
            <Text style={styles.profileEmoji}>👤</Text>
          </View>
        </View>

        {/* 서비스 카드 그리드 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서비스</Text>
          <View style={styles.cardGrid}>
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[styles.card, { backgroundColor: service.color + '20' }]}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIcon, { backgroundColor: service.color }]}>
                  <Text style={styles.cardIconText}>{service.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{service.title}</Text>
                <Text style={styles.cardDescription}>{service.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 빠른 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickAction}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 공지사항 배너 */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.banner} activeOpacity={0.8}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerLabel}>공지</Text>
              <Text style={styles.bannerText}>
                썬데이허그 앱이 새롭게 출시되었습니다! 🎉
              </Text>
            </View>
            <Text style={styles.bannerArrow}>→</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: {
    fontSize: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    width: (width - 48 - 36) / 4,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerContent: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerText: {
    fontSize: 14,
    color: COLORS.text,
  },
  bannerArrow: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
});



