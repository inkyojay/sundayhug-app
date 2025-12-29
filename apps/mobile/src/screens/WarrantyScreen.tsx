/**
 * 보증서 탭 스크린 (WebView)
 * 보증서 등록 페이지를 WebView로 표시
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebViewContainer } from '@/components/WebViewContainer';
import { COLORS, WEBVIEW_ROUTES } from '@/constants/config';

export function WarrantyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebViewContainer
        url={WEBVIEW_ROUTES.warranty_register}
        showHeader={false}
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



