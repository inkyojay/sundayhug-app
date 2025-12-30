/**
 * 로그인 스크린
 * 카카오 로그인 + 다른 소셜 로그인 옵션
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, WEB_BASE_URL } from '@/constants/config';
import { loginWithKakao, getKakaoProfile } from '@/services/kakao';

const { width } = Dimensions.get('window');

export function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      // 카카오 SDK 로그인
      const kakaoResult = await loginWithKakao();
      
      if (!kakaoResult) {
        // 사용자가 취소한 경우
        setIsLoading(false);
        return;
      }
      
      // 카카오 프로필 조회
      const profile = await getKakaoProfile();
      
      if (!profile) {
        Alert.alert('오류', '프로필 정보를 가져오는데 실패했습니다.');
        setIsLoading(false);
        return;
      }
      
      // 백엔드 API로 카카오 토큰 전송하여 Supabase 인증
      const response = await fetch(`${WEB_BASE_URL}/api/auth/kakao/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: kakaoResult.accessToken,
          kakaoId: profile.id,
          email: profile.email,
          nickname: profile.nickname,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Server authentication failed');
      }
      
      const authResult = await response.json();
      
      // 로그인 성공
      login(authResult.userId, authResult.accessToken);
      
    } catch (error) {
      console.error('Kakao login error:', error);
      Alert.alert('로그인 실패', '카카오 로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    Alert.alert('알림', '네이버 로그인은 준비 중입니다.');
  };

  const handleAppleLogin = async () => {
    Alert.alert('알림', '애플 로그인은 준비 중입니다.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 영역 */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <View style={styles.logoInner} />
          </View>
        </View>
        <Text style={styles.title}>썬데이허그</Text>
        <Text style={styles.subtitle}>디지털 보증서 & 수면 환경 분석</Text>
      </View>

      {/* 로그인 버튼 영역 */}
      <View style={styles.buttonContainer}>
        {/* 카카오 로그인 */}
        <TouchableOpacity
          style={styles.kakaoButton}
          onPress={handleKakaoLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.kakaoText} />
          ) : (
            <>
              <View style={styles.kakaoIcon}>
                <Text style={styles.kakaoIconText}>💬</Text>
              </View>
              <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 네이버 로그인 */}
        <TouchableOpacity
          style={styles.naverButton}
          onPress={handleNaverLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.naverIcon}>N</Text>
          <Text style={styles.naverButtonText}>네이버로 시작하기</Text>
        </TouchableOpacity>

        {/* 애플 로그인 (iOS만) */}
        <TouchableOpacity
          style={styles.appleButton}
          onPress={handleAppleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.appleIcon}></Text>
          <Text style={styles.appleButtonText}>Apple로 시작하기</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 안내 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          로그인 시{' '}
          <Text style={styles.footerLink}>이용약관</Text>
          {' '}및{' '}
          <Text style={styles.footerLink}>개인정보처리방침</Text>
          에 동의하게 됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  kakaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.kakao,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  kakaoIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoIconText: {
    fontSize: 18,
  },
  kakaoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.kakaoText,
  },
  naverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#03C75A',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  naverIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  naverButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  appleIcon: {
    fontSize: 20,
    color: '#fff',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

