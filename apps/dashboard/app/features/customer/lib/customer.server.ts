/**
 * Customer 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  KakaoTokenResponse,
  KakaoUserResponse,
  CustomerMember,
  AsRequestFormData,
  AuthCallbackResult,
} from "./customer.shared";

// ============================================
// Auth 관련 로직
// ============================================

/**
 * 현재 로그인한 사용자 정보 조회
 */
export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 레이아웃용 사용자 정보 조회
 */
export async function getLayoutUserInfo(supabase: SupabaseClient) {
  const user = await getCurrentUser(supabase);

  if (user) {
    const name =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0];
    return {
      isLoggedIn: true,
      userName: name || "회원",
      isVip: true, // TODO: 실제 VIP 여부 체크
    };
  }

  return {
    isLoggedIn: false,
    userName: null,
    isVip: false,
  };
}

/**
 * OAuth 코드를 세션으로 교환
 */
export async function exchangeCodeForSession(
  supabase: SupabaseClient,
  code: string
): Promise<AuthCallbackResult> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// 카카오 로그인 관련 로직
// ============================================

const KAKAO_CLIENT_ID = "2737860d151daba73e31d3df6213a012";
const KAKAO_CLIENT_SECRET = "HexFevCinjno2w3zvLIMtE0lUos1gk5Q";

/**
 * 카카오 토큰 교환
 */
export async function exchangeKakaoToken(
  code: string,
  redirectUri: string
): Promise<KakaoTokenResponse | null> {
  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KAKAO_CLIENT_ID,
      client_secret: KAKAO_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const data: KakaoTokenResponse = await response.json();

  if (!data.access_token) {
    console.error("[Kakao] 토큰 발급 실패:", data);
    return null;
  }

  return data;
}

/**
 * 카카오 사용자 정보 조회
 */
export async function getKakaoUserInfo(
  accessToken: string
): Promise<KakaoUserResponse | null> {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  const data: KakaoUserResponse = await response.json();

  if (!data.id) {
    console.error("[Kakao] 사용자 정보 조회 실패:", data);
    return null;
  }

  return data;
}

/**
 * 카카오 사용자 정보 파싱
 */
export function parseKakaoUserInfo(userData: KakaoUserResponse) {
  const kakaoAccount = userData.kakao_account || {};
  const kakaoId = String(userData.id);
  const kakaoEmail = kakaoAccount.email;
  const kakaoNickname = kakaoAccount.profile?.nickname || null;
  const kakaoProfileImage = kakaoAccount.profile?.profile_image_url || null;
  const kakaoName = kakaoAccount.name || kakaoNickname;
  const kakaoPhone =
    kakaoAccount.phone_number?.replace(/^\+82 /, "0").replace(/-/g, "") || null;
  const kakaoGender = kakaoAccount.gender || null;
  const kakaoAgeRange = kakaoAccount.age_range || null;
  const kakaoBirthday = kakaoAccount.birthday || null;

  return {
    kakaoId,
    kakaoEmail,
    kakaoNickname,
    kakaoProfileImage,
    kakaoName,
    kakaoPhone,
    kakaoGender,
    kakaoAgeRange,
    kakaoBirthday,
  };
}

/**
 * 카카오 사용자 생성 또는 업데이트
 */
export async function upsertKakaoUser(
  adminClient: SupabaseClient,
  kakaoInfo: ReturnType<typeof parseKakaoUserInfo>
): Promise<{ userId: string; isNewUser: boolean } | null> {
  const {
    kakaoId,
    kakaoEmail,
    kakaoNickname,
    kakaoProfileImage,
    kakaoName,
    kakaoPhone,
    kakaoGender,
    kakaoAgeRange,
  } = kakaoInfo;

  if (!kakaoEmail) {
    console.error("[Kakao] 이메일 없음 - 동의 필요");
    return null;
  }

  // 카카오 ID 기반 고유 비밀번호
  const kakaoPassword = `kakao_${kakaoId}_sundayhug_2024!`;

  // 이메일로 기존 사용자 확인
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email === kakaoEmail
  );

  let userId: string;
  let isNewUser = false;

  if (existingUser) {
    // 기존 사용자 - 비밀번호 업데이트
    userId = existingUser.id;

    await adminClient.auth.admin.updateUserById(userId, {
      password: kakaoPassword,
      user_metadata: {
        ...existingUser.user_metadata,
        provider: "kakao",
        kakao_id: kakaoId,
      },
    });
  } else {
    // 새 사용자 생성
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
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

    if (createError || !newUser.user) {
      console.error("[Kakao] 사용자 생성 실패:", createError);
      return null;
    }

    userId = newUser.user.id;
    isNewUser = true;
  }

  // profiles 테이블 업데이트
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existingProfile) {
    await adminClient
      .from("profiles")
      .update({
        name: kakaoName || existingProfile.name,
        email: kakaoEmail,
        phone: kakaoPhone || existingProfile.phone,
        kakao_id: kakaoId,
        kakao_nickname: kakaoNickname,
        kakao_profile_image: kakaoProfileImage,
        gender: kakaoGender || existingProfile.gender,
        age_range: kakaoAgeRange || existingProfile.age_range,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } else {
    await adminClient.from("profiles").insert({
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

  return { userId, isNewUser };
}

/**
 * 카카오 로그인 세션 생성
 */
export async function createKakaoSession(
  supabase: SupabaseClient,
  kakaoEmail: string,
  kakaoId: string
) {
  const kakaoPassword = `kakao_${kakaoId}_sundayhug_2024!`;

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: kakaoEmail,
      password: kakaoPassword,
    });

  if (signInError || !signInData.session) {
    console.error("[Kakao] 로그인 실패:", signInError);
    return null;
  }

  return signInData;
}

// ============================================
// 보증서 관련 로직
// ============================================

/**
 * 사용자의 보증서 조회
 */
export async function getWarrantyById(
  supabase: SupabaseClient,
  warrantyId: string,
  userId: string
) {
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", warrantyId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("보증서 조회 오류:", error);
    return null;
  }

  return warranty;
}

// ============================================
// A/S 신청 관련 로직
// ============================================

/**
 * A/S 신청 생성
 */
export async function createAsRequest(
  supabase: SupabaseClient,
  formData: AsRequestFormData
) {
  const { warrantyId, requestType, issueDescription, contactName, contactPhone, contactAddress } =
    formData;

  const { data: asRequest, error } = await supabase
    .from("as_requests")
    .insert({
      warranty_id: warrantyId,
      request_type: requestType,
      issue_description: issueDescription,
      contact_name: contactName,
      contact_phone: contactPhone.replace(/-/g, ""),
      contact_address: contactAddress || null,
      status: "received",
    })
    .select()
    .single();

  if (error) {
    console.error("A/S 신청 오류:", error);
    return { success: false, error: "A/S 신청에 실패했습니다. 다시 시도해주세요." };
  }

  return { success: true, asRequestId: asRequest.id };
}

// ============================================
// 회원 정보 관련 로직
// ============================================

/**
 * 회원 정보 조회
 */
export async function getMemberById(
  supabase: SupabaseClient,
  memberId: string
): Promise<CustomerMember | null> {
  const { data: member, error } = await supabase
    .from("warranty_members")
    .select(
      "id, name, email, phone, baby_name, baby_birth_date, baby_gender, password_hash, kakao_id, naver_id"
    )
    .eq("id", memberId)
    .single();

  if (error) {
    console.error("Failed to load member:", error);
    return null;
  }

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    baby_name: member.baby_name,
    baby_birth_date: member.baby_birth_date,
    baby_gender: member.baby_gender,
    has_password: !!member.password_hash,
    has_kakao: !!member.kakao_id,
    has_naver: !!member.naver_id,
  };
}
