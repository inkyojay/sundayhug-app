/**
 * 푸시 알림 서비스
 * Firebase Cloud Messaging + APNs
 */

import { Platform, Alert, Linking } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { MMKV } from 'react-native-mmkv';

// 저장소
const storage = new MMKV({ id: 'sundayhug-push' });

// 저장소 키
const STORAGE_KEYS = {
  FCM_TOKEN: 'fcmToken',
  PERMISSION_REQUESTED: 'permissionRequested',
} as const;

export interface PushNotification {
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

/**
 * 푸시 알림 권한 요청
 */
export async function requestPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    storage.set(STORAGE_KEYS.PERMISSION_REQUESTED, true);
    
    if (enabled) {
      console.log('Push notification permission granted');
      return true;
    } else {
      console.log('Push notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Failed to request push permission:', error);
    return false;
  }
}

/**
 * 푸시 알림 권한 상태 확인
 */
export async function checkPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('Failed to check push permission:', error);
    return false;
  }
}

/**
 * FCM 토큰 가져오기
 */
export async function getToken(): Promise<string | null> {
  try {
    // 캐시된 토큰 확인
    const cachedToken = storage.getString(STORAGE_KEYS.FCM_TOKEN);
    
    // 새 토큰 가져오기
    const token = await messaging().getToken();
    
    // 토큰이 변경되었으면 저장
    if (token !== cachedToken) {
      storage.set(STORAGE_KEYS.FCM_TOKEN, token);
      console.log('FCM Token updated:', token.slice(0, 20) + '...');
    }
    
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * 토큰 갱신 리스너 등록
 */
export function onTokenRefresh(callback: (token: string) => void): () => void {
  return messaging().onTokenRefresh((token) => {
    storage.set(STORAGE_KEYS.FCM_TOKEN, token);
    console.log('FCM Token refreshed:', token.slice(0, 20) + '...');
    callback(token);
  });
}

/**
 * 포그라운드 메시지 리스너 등록
 */
export function onForegroundMessage(
  callback: (notification: PushNotification) => void
): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground message received:', remoteMessage);
    
    const notification: PushNotification = {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data as Record<string, string>,
    };
    
    callback(notification);
  });
}

/**
 * 백그라운드/종료 상태에서 알림 탭 핸들러
 */
export function onNotificationOpenedApp(
  callback: (notification: PushNotification) => void
): () => void {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Notification opened app:', remoteMessage);
    
    const notification: PushNotification = {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data as Record<string, string>,
    };
    
    callback(notification);
  });
}

/**
 * 앱 종료 상태에서 열린 초기 알림 확인
 */
export async function getInitialNotification(): Promise<PushNotification | null> {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    
    if (remoteMessage) {
      console.log('Initial notification:', remoteMessage);
      
      return {
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data as Record<string, string>,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get initial notification:', error);
    return null;
  }
}

/**
 * 백그라운드 메시지 핸들러 등록 (index.js에서 호출)
 */
export function setBackgroundMessageHandler(
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => Promise<void>
): void {
  messaging().setBackgroundMessageHandler(handler);
}

/**
 * 알림에서 딥링크 추출
 */
export function getDeepLinkFromNotification(
  notification: PushNotification
): string | null {
  const { data } = notification;
  
  if (!data) return null;
  
  // 딥링크 URL이 있는 경우
  if (data.deepLink) {
    return data.deepLink;
  }
  
  // 화면 정보가 있는 경우 딥링크 생성
  if (data.screen) {
    const params = data.params ? `?${data.params}` : '';
    return `sundayhug://${data.screen}${params}`;
  }
  
  return null;
}

/**
 * 푸시 알림 설정 화면 열기
 */
export function openNotificationSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

/**
 * 푸시 알림 초기화 (앱 시작 시 호출)
 */
export async function initializePush(
  onNotificationReceived: (notification: PushNotification) => void,
  onNotificationOpened: (notification: PushNotification) => void
): Promise<string | null> {
  // 권한 확인
  const hasPermission = await checkPermission();
  
  if (!hasPermission) {
    const permissionRequested = storage.getBoolean(STORAGE_KEYS.PERMISSION_REQUESTED);
    
    if (!permissionRequested) {
      // 처음 실행 시 권한 요청
      await requestPermission();
    }
  }
  
  // 토큰 가져오기
  const token = await getToken();
  
  // 포그라운드 메시지 리스너
  onForegroundMessage(onNotificationReceived);
  
  // 알림 탭 리스너
  onNotificationOpenedApp(onNotificationOpened);
  
  // 앱 종료 상태에서 열린 초기 알림 확인
  const initialNotification = await getInitialNotification();
  if (initialNotification) {
    onNotificationOpened(initialNotification);
  }
  
  return token;
}



