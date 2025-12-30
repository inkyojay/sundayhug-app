/**
 * 스플래시 스크린
 * 앱 로딩 중 표시
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '@/constants/config';

const { width } = Dimensions.get('window');

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* 로고 아이콘 */}
        <View style={styles.logoIcon}>
          <View style={styles.logoInner} />
        </View>
        
        {/* 브랜드명 */}
        <Text style={styles.brandName}>썬데이허그</Text>
        <Text style={styles.tagline}>Sunday Hug</Text>
      </Animated.View>

      {/* 로딩 인디케이터 */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                width: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    width: width * 0.5,
  },
  loadingBar: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});



