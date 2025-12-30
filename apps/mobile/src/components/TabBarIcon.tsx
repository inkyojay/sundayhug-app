/**
 * 탭바 아이콘 컴포넌트
 * 간단한 SVG 아이콘 (라이브러리 의존성 최소화)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TabBarIconProps {
  name: 'home' | 'shield-checkmark' | 'moon' | 'person';
  color: string;
  size: number;
}

export function TabBarIcon({ name, color, size }: TabBarIconProps) {
  // 간단한 도형으로 아이콘 표현 (추후 벡터 아이콘으로 교체 가능)
  const iconStyle = {
    width: size * 0.8,
    height: size * 0.8,
    borderColor: color,
  };

  switch (name) {
    case 'home':
      return (
        <View style={[styles.iconContainer, { width: size, height: size }]}>
          <View
            style={[
              styles.homeIcon,
              iconStyle,
              {
                borderBottomColor: color,
                borderLeftColor: color,
                borderRightColor: color,
              },
            ]}
          />
        </View>
      );
    case 'shield-checkmark':
      return (
        <View style={[styles.iconContainer, { width: size, height: size }]}>
          <View
            style={[
              styles.shieldIcon,
              {
                width: size * 0.7,
                height: size * 0.8,
                backgroundColor: color,
                opacity: 0.9,
              },
            ]}
          />
        </View>
      );
    case 'moon':
      return (
        <View style={[styles.iconContainer, { width: size, height: size }]}>
          <View
            style={[
              styles.moonIcon,
              {
                width: size * 0.7,
                height: size * 0.7,
                borderColor: color,
                borderWidth: 2,
              },
            ]}
          />
        </View>
      );
    case 'person':
      return (
        <View style={[styles.iconContainer, { width: size, height: size }]}>
          <View
            style={[
              styles.personHead,
              {
                width: size * 0.35,
                height: size * 0.35,
                backgroundColor: color,
              },
            ]}
          />
          <View
            style={[
              styles.personBody,
              {
                width: size * 0.6,
                height: size * 0.3,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  shieldIcon: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  moonIcon: {
    borderRadius: 100,
    borderTopRightRadius: 0,
  },
  personHead: {
    borderRadius: 100,
    marginBottom: 2,
  },
  personBody: {
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
});



