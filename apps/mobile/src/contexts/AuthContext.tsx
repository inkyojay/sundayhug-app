/**
 * 인증 상태 관리 Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MMKV } from 'react-native-mmkv';

// 저장소 인스턴스
const storage = new MMKV({ id: 'sundayhug-auth' });

// 저장소 키
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER_ID: 'userId',
  IS_LOGGED_IN: 'isLoggedIn',
} as const;

interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  accessToken: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (userId: string, accessToken: string) => void;
  logout: () => void;
  refreshToken: (newToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    userId: null,
    accessToken: null,
    isLoading: true,
  });

  // 초기 로드
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const isLoggedIn = storage.getBoolean(STORAGE_KEYS.IS_LOGGED_IN) ?? false;
        const userId = storage.getString(STORAGE_KEYS.USER_ID) ?? null;
        const accessToken = storage.getString(STORAGE_KEYS.ACCESS_TOKEN) ?? null;

        setState({
          isLoggedIn,
          userId,
          accessToken,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load auth state:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthState();
  }, []);

  // 로그인
  const login = useCallback((userId: string, accessToken: string) => {
    try {
      storage.set(STORAGE_KEYS.IS_LOGGED_IN, true);
      storage.set(STORAGE_KEYS.USER_ID, userId);
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

      setState({
        isLoggedIn: true,
        userId,
        accessToken,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    try {
      storage.delete(STORAGE_KEYS.IS_LOGGED_IN);
      storage.delete(STORAGE_KEYS.USER_ID);
      storage.delete(STORAGE_KEYS.ACCESS_TOKEN);

      setState({
        isLoggedIn: false,
        userId: null,
        accessToken: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  }, []);

  // 토큰 갱신
  const refreshToken = useCallback((newToken: string) => {
    try {
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, newToken);
      setState(prev => ({ ...prev, accessToken: newToken }));
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}



