/**
 * Phone Number Check API
 *
 * POST /api/auth/phone/check
 * 전화번호 중복 체크 (profiles 테이블에서)
 */
import type { Route } from "./+types/check-phone";

import { data } from "react-router";
import { z } from "zod";

import adminClient from "~/core/lib/supa-admin-client.server";

const requestSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
});

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { phoneNumber } = requestSchema.parse(body);

    // 전화번호 정규화
    const normalizedPhone = phoneNumber.replace(/-/g, "").replace(/\s/g, "");

    // profiles 테이블에서 전화번호 중복 확인
    const { data: existingProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, phone, kakao_id, naver_id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (profileError) {
      console.error("Phone check error:", profileError);
      return data(
        { success: false, error: "전화번호 확인에 실패했습니다." },
        { status: 500 }
      );
    }

    if (existingProfile) {
      // 카카오/네이버 로그인 계정인지 확인
      const isKakaoUser = !!existingProfile.kakao_id;
      const isNaverUser = !!existingProfile.naver_id;
      
      let message = "이미 가입된 전화번호입니다.";
      if (isKakaoUser) {
        message = "이미 카카오 계정으로 가입된 전화번호입니다. 카카오 로그인을 이용해주세요.";
      } else if (isNaverUser) {
        message = "이미 네이버 계정으로 가입된 전화번호입니다. 네이버 로그인을 이용해주세요.";
      }

      return data({
        success: false,
        exists: true,
        isKakaoUser,
        isNaverUser,
        message,
      });
    }

    return data({
      success: true,
      exists: false,
      message: "사용 가능한 전화번호입니다.",
    });
  } catch (error) {
    console.error("Check phone error:", error);

    if (error instanceof z.ZodError) {
      return data(
        { success: false, error: "올바른 전화번호를 입력해주세요." },
        { status: 400 }
      );
    }

    return data(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function loader() {
  return data({
    message: "POST /api/auth/phone/check",
  });
}


