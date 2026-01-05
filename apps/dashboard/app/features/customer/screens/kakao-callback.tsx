/**
 * 카카오 로그인 콜백 (Supabase Auth 연동)
 *
 * 1. 카카오 인가 코드로 토큰 교환
 * 2. 토큰으로 사용자 정보 조회
 * 3. Supabase Admin API로 사용자 생성/로그인
 * 4. profiles에 추가 정보 저장
 */
import type { Route } from "./+types/kakao-callback";

import { redirect } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

import {
  exchangeKakaoToken,
  getKakaoUserInfo,
  parseKakaoUserInfo,
  upsertKakaoUser,
  createKakaoSession,
} from "../lib/customer.server";
import { LoadingSpinner } from "../components";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    console.error("[Kakao Callback] 인가 코드 없음 또는 에러:", error);
    return redirect("/customer/login?error=kakao_failed");
  }

  const REDIRECT_URI = `${url.origin}/customer/kakao/callback`;

  try {
    // 1. 인가 코드로 토큰 교환
    console.log("[Kakao Callback] 토큰 교환 시작...");
    const tokenData = await exchangeKakaoToken(code, REDIRECT_URI);

    if (!tokenData) {
      return redirect("/customer/login?error=kakao_token_failed");
    }

    console.log("[Kakao Callback] 토큰 발급 성공, scope:", tokenData.scope);

    // 2. 사용자 정보 요청
    console.log("[Kakao Callback] 사용자 정보 요청...");
    const userData = await getKakaoUserInfo(tokenData.access_token);

    if (!userData) {
      return redirect("/customer/login?error=kakao_user_failed");
    }

    const kakaoInfo = parseKakaoUserInfo(userData);

    console.log("[Kakao Callback] 수집된 정보:", {
      kakaoId: kakaoInfo.kakaoId,
      email: kakaoInfo.kakaoEmail,
      nickname: kakaoInfo.kakaoNickname,
      name: kakaoInfo.kakaoName,
      phone: kakaoInfo.kakaoPhone,
      gender: kakaoInfo.kakaoGender,
      ageRange: kakaoInfo.kakaoAgeRange,
    });

    if (!kakaoInfo.kakaoEmail) {
      console.error("[Kakao Callback] 이메일 없음 - 동의 필요");
      return redirect("/customer/login?error=kakao_email_required");
    }

    // 3. Supabase에서 기존 사용자 확인 또는 생성
    console.log("[Kakao Callback] Supabase 사용자 확인/생성...");
    const userResult = await upsertKakaoUser(adminClient, kakaoInfo);

    if (!userResult) {
      return redirect("/customer/login?error=create_failed");
    }

    console.log(
      `[Kakao Callback] ${userResult.isNewUser ? "새 사용자 생성" : "기존 사용자 발견"}:`,
      userResult.userId
    );

    // 4. Supabase 세션 생성 (비밀번호 로그인)
    console.log("[Kakao Callback] 세션 생성...");

    const [supabase, headers] = makeServerClient(request);

    const signInData = await createKakaoSession(
      supabase,
      kakaoInfo.kakaoEmail,
      kakaoInfo.kakaoId
    );

    if (!signInData) {
      return redirect("/customer/login?error=login_failed");
    }

    console.log("[Kakao Callback] 세션 생성 완료:", signInData.user?.id);

    // 5. 마이페이지로 리다이렉트
    return redirect("/customer/mypage", { headers });
  } catch (error) {
    console.error("[Kakao Callback] 에러:", error);
    return redirect("/customer/login?error=kakao_error");
  }
}

export default function KakaoCallbackPage() {
  return <LoadingSpinner message="카카오 로그인 처리 중..." variant="kakao" />;
}

