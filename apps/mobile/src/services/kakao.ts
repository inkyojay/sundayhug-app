/**
 * 카카오 로그인 서비스
 * @react-native-seoul/kakao-login 래퍼
 */

import { Alert } from 'react-native';
import {
  login as kakaoLogin,
  logout as kakaoLogout,
  unlink as kakaoUnlink,
  getProfile as kakaoGetProfile,
  KakaoOAuthToken,
  KakaoProfile,
} from '@react-native-seoul/kakao-login';

export interface KakaoUserProfile {
  id: string;
  email?: string;
  nickname?: string;
  profileImageUrl?: string;
  thumbnailImageUrl?: string;
}

export interface KakaoLoginResult {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  scopes?: string[];
}

/**
 * 카카오 로그인
 */
export async function loginWithKakao(): Promise<KakaoLoginResult | null> {
  try {
    // 카카오톡 앱이 설치되어 있으면 카카오톡으로 로그인
    // 설치되어 있지 않으면 카카오계정으로 로그인
    const result: KakaoOAuthToken = await kakaoLogin();
    
    console.log('Kakao login success:', {
      accessToken: result.accessToken.slice(0, 20) + '...',
      expiresAt: result.accessTokenExpiresAt,
    });
    
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      idToken: result.idToken,
      accessTokenExpiresAt: new Date(result.accessTokenExpiresAt),
      refreshTokenExpiresAt: new Date(result.refreshTokenExpiresAt),
      scopes: result.scopes,
    };
  } catch (error: any) {
    console.error('Kakao login error:', error);
    
    // 사용자 취소
    if (error.message?.includes('cancelled') || error.code === 'E_CANCELLED_OPERATION') {
      return null;
    }
    
    // 기타 에러
    Alert.alert(
      '로그인 실패',
      '카카오 로그인에 실패했습니다. 다시 시도해주세요.',
      [{ text: '확인' }]
    );
    
    return null;
  }
}

/**
 * 카카오 로그아웃
 */
export async function logoutFromKakao(): Promise<boolean> {
  try {
    await kakaoLogout();
    console.log('Kakao logout success');
    return true;
  } catch (error) {
    console.error('Kakao logout error:', error);
    return false;
  }
}

/**
 * 카카오 연결 해제 (탈퇴)
 */
export async function unlinkKakao(): Promise<boolean> {
  try {
    await kakaoUnlink();
    console.log('Kakao unlink success');
    return true;
  } catch (error) {
    console.error('Kakao unlink error:', error);
    return false;
  }
}

/**
 * 카카오 사용자 프로필 조회
 */
export async function getKakaoProfile(): Promise<KakaoUserProfile | null> {
  try {
    const profile: KakaoProfile = await kakaoGetProfile();
    
    return {
      id: String(profile.id),
      email: profile.email,
      nickname: profile.nickname,
      profileImageUrl: profile.profileImageUrl,
      thumbnailImageUrl: profile.thumbnailImageUrl,
    };
  } catch (error) {
    console.error('Failed to get Kakao profile:', error);
    return null;
  }
}

/**
 * Supabase와 카카오 토큰 연동
 * 카카오 토큰을 사용하여 Supabase에 로그인
 */
export async function loginToSupabaseWithKakao(
  kakaoAccessToken: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ userId: string; accessToken: string } | null> {
  try {
    // 카카오 프로필 조회
    const profile = await getKakaoProfile();
    if (!profile) {
      throw new Error('Failed to get Kakao profile');
    }

    // Supabase에 카카오 토큰으로 로그인 요청
    // 실제 구현에서는 백엔드 API를 통해 처리해야 함
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        // 실제로는 백엔드에서 카카오 토큰 검증 후 Supabase 토큰 발급
        provider: 'kakao',
        access_token: kakaoAccessToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Supabase login failed');
    }

    const data = await response.json();
    
    return {
      userId: data.user.id,
      accessToken: data.access_token,
    };
  } catch (error) {
    console.error('Failed to login to Supabase with Kakao:', error);
    return null;
  }
}
