/**
 * 범용 WebView 스크린
 * 스택 네비게이션에서 사용
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebViewContainer } from '@/components/WebViewContainer';
import { COLORS } from '@/constants/config';
import type { RootStackParamList } from '@/types/bridge';

type Props = NativeStackScreenProps<RootStackParamList, 'WebView'>;

export function WebViewScreen({ route, navigation }: Props) {
  const { url, title } = route.params;

  // 헤더 타이틀 설정
  React.useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    }
  }, [navigation, title]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <WebViewContainer
        url={url}
        showHeader={false}
        onNavigationStateChange={(navState) => {
          // URL 변경 시 타이틀 업데이트
          if (navState.title && navState.title !== title) {
            navigation.setOptions({ title: navState.title });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});



