/**
 * 카카오 로그인 콜백 (Supabase Auth 연동)
 * 
 * 1. 카카오 인가 코드로 토큰 교환
 * 2. 토큰으로 사용자 정보 조회
 * 3. Supabase Admin API로 사용자 생성/로그인
 * 4. profiles에 추가 정보 저장
 */
import type { Route } from "./+types/kakao-callback";

import { redirect, data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

// 카카오 API 설정 (카카오 개발자 콘솔에서 확인)
const KAKAO_CLIENT_ID = "2737860d151daba73e31d3df6213a012";
const KAKAO_CLIENT_SECRET = "HexFevCinjno2w3zvLIMtE0lUos1gk5Q";

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    name?: string;
    phone_number?: string;
    gender?: string;
    age_range?: string;
    birthday?: string;
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  
  if (error || !code) {
    console.error("[Kakao Callback] 인가 코드 없음 또는 에러:", error);
    return redirect("/customer/login?error=kakao_failed");
  }
  
  const REDIRECT_URI = `${url.origin}/customer/kakao/callback`;
  
  try {
    // 1. 인가 코드로 토큰 교환
    console.log("[Kakao Callback] 토큰 교환 시작...");
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });
    
    const tokenData: KakaoTokenResponse = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("[Kakao Callback] 토큰 발급 실패:", tokenData);
      return redirect("/customer/login?error=kakao_token_failed");
    }
    
    console.log("[Kakao Callback] 토큰 발급 성공, scope:", tokenData.scope);
    
    // 2. 사용자 정보 요청
    console.log("[Kakao Callback] 사용자 정보 요청...");
    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });
    
    const userData: KakaoUserResponse = await userResponse.json();
    
    if (!userData.id) {
      console.error("[Kakao Callback] 사용자 정보 조회 실패:", userData);
      return redirect("/customer/login?error=kakao_user_failed");
    }
    
    const kakaoAccount = userData.kakao_account || {};
    const kakaoId = String(userData.id);
    const kakaoEmail = kakaoAccount.email;
    const kakaoNickname = kakaoAccount.profile?.nickname || null;
    const kakaoProfileImage = kakaoAccount.profile?.profile_image_url || null;
    const kakaoName = kakaoAccount.name || kakaoNickname;
    const kakaoPhone = kakaoAccount.phone_number?.replace(/^\+82 /, "0").replace(/-/g, "") || null;
    const kakaoGender = kakaoAccount.gender || null;
    const kakaoAgeRange = kakaoAccount.age_range || null;
    const kakaoBirthday = kakaoAccount.birthday || null;
    
    console.log("[Kakao Callback] 수집된 정보:", {
      kakaoId,
      email: kakaoEmail,
      nickname: kakaoNickname,
      name: kakaoName,
      phone: kakaoPhone,
      gender: kakaoGender,
      ageRange: kakaoAgeRange,
    });
    
    if (!kakaoEmail) {
      console.error("[Kakao Callback] 이메일 없음 - 동의 필요");
      return redirect("/customer/login?error=kakao_email_required");
    }
    
    // 3. Supabase에서 기존 사용자 확인 또는 생성
    console.log("[Kakao Callback] Supabase 사용자 확인/생성...");
    
    // 카카오 ID 기반 고유 비밀번호 (변경 불가능한 고정값)
    const kakaoPassword = `kakao_${kakaoId}_sundayhug_2024!`;
    
    let userId: string;
    let isNewUser = false;
    
    // profiles 테이블에서 이메일로 기존 사용자 확인 (더 빠르고 확실함)
    console.log("[Kakao Callback] profiles에서 이메일로 사용자 조회...");
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", kakaoEmail)
      .maybeSingle();
    
    if (existingProfile) {
      // 기존 사용자 - 비밀번호 업데이트
      console.log("[Kakao Callback] 기존 사용자 발견 (profiles):", existingProfile.id);
      userId = existingProfile.id;
      
      // 비밀번호 업데이트 (카카오 로그인용)
      await adminClient.auth.admin.updateUserById(userId, {
        password: kakaoPassword,
        user_metadata: {
          provider: "kakao",
          kakao_id: kakaoId,
        },
      });
    } else {
      // 새 사용자 생성
      console.log("[Kakao Callback] 새 사용자 생성...");
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: kakaoEmail,
        password: kakaoPassword,
        email_confirm: true,
        user_metadata: {
          name: kakaoName,
          avatar_url: kakaoProfileImage,
          provider: "kakao",
          kakao_id: kakaoId,
        },
      });
      
      if (createError || !newUser?.user) {
        console.error("[Kakao Callback] 사용자 생성 실패:", createError);
        return redirect("/customer/login?error=create_failed");
      }
      
      userId = newUser.user.id;
      isNewUser = true;
      console.log("[Kakao Callback] 새 사용자 생성 완료:", userId);
    }
    
    // 4. profiles 테이블에 추가 정보 저장/업데이트
    console.log("[Kakao Callback] profiles 업데이트...");
    
    // 기존 프로필 확인
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (profileData) {
      // 기존 프로필 업데이트
      await adminClient
        .from("profiles")
        .update({
          name: kakaoName || profileData.name,
          email: kakaoEmail,
          phone: kakaoPhone || profileData.phone,
          kakao_id: kakaoId,
          kakao_nickname: kakaoNickname,
          kakao_profile_image: kakaoProfileImage,
          gender: kakaoGender || profileData.gender,
          age_range: kakaoAgeRange || profileData.age_range,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      // 새 프로필 생성
      await adminClient
        .from("profiles")
        .insert({
          id: userId,
          name: kakaoName || "사용자",
          email: kakaoEmail,
          phone: kakaoPhone,
          kakao_id: kakaoId,
          kakao_nickname: kakaoNickname,
          kakao_profile_image: kakaoProfileImage,
          gender: kakaoGender,
          age_range: kakaoAgeRange,
          is_active: true,
          last_login_at: new Date().toISOString(),
        });
    }
    
    console.log("[Kakao Callback] profiles 업데이트 완료");
    
    // 5. Supabase 세션 생성 (비밀번호 로그인)
    console.log("[Kakao Callback] 세션 생성...");
    
    const [supabase, headers] = makeServerClient(request);
    
    // 비밀번호로 로그인하여 세션 생성
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: kakaoEmail,
      password: kakaoPassword,
    });
    
    if (signInError || !signInData.session) {
      console.error("[Kakao Callback] 로그인 실패:", signInError);
      return redirect("/customer/login?error=login_failed");
    }
    
    console.log("[Kakao Callback] 세션 생성 완료:", signInData.user?.id);
    
    // 6. 마이페이지로 리다이렉트
    return redirect("/customer/mypage", { headers });
    
  } catch (error) {
    console.error("[Kakao Callback] 에러:", error);
    return redirect("/customer/login?error=kakao_error");
  }
}

export default function KakaoCallbackPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
        <p className="text-gray-600">카카오 로그인 처리 중...</p>
      </div>
    </div>
  );
}

