/**
 * 네이버 커머스 API 인증 시작
 * 
 * Client Credentials 방식으로 토큰을 발급받고 저장합니다.
 * POST /api/integrations/naver/auth/start
 */
import { data, redirect } from "react-router";

import type { Route } from "./+types/naver-auth-start";

import { refreshNaverToken, testConnection } from "../lib/naver.server";

/**
 * GET - 연동 시작 (토큰 발급)
 */
export async function loader({ request }: Route.LoaderArgs) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    const errorMessage = encodeURIComponent("네이버 API credentials가 설정되지 않았습니다.");
    return redirect(`/dashboard/integrations/naver?error=${errorMessage}`);
  }

  console.log("🔑 네이버 토큰 발급 시작...");

  // 토큰 발급 시도
  const token = await refreshNaverToken();

  if (!token) {
    const errorMessage = encodeURIComponent("토큰 발급에 실패했습니다. credentials를 확인해주세요.");
    return redirect(`/dashboard/integrations/naver?error=${errorMessage}`);
  }

  console.log("✅ 네이버 토큰 발급 성공");

  // 성공 시 상태 페이지로 리다이렉트
  return redirect("/dashboard/integrations/naver?success=연동이 완료되었습니다");
}

/**
 * POST - 연동 테스트
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "test") {
    const result = await testConnection();
    return data(result);
  }

  if (actionType === "connect") {
    const token = await refreshNaverToken();
    
    if (!token) {
      return data({ 
        success: false, 
        message: "토큰 발급에 실패했습니다. credentials를 확인해주세요." 
      });
    }

    return data({ 
      success: true, 
      message: "연동이 완료되었습니다." 
    });
  }

  return data({ success: false, message: "잘못된 요청입니다." });
}

