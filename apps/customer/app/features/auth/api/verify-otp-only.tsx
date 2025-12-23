/**
 * Phone OTP Verify Only API (회원가입용)
 *
 * POST /api/auth/phone/verify-otp-only
 * OTP 검증만 수행 (회원가입/로그인 처리 없음)
 */
import type { Route } from "./+types/verify-otp-only";

import { data } from "react-router";
import { z } from "zod";

import adminClient from "~/core/lib/supa-admin-client.server";

const requestSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  otp: z.string().length(6),
});

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { phoneNumber, otp } = requestSchema.parse(body);

    // 전화번호 정규화
    const normalizedPhone = phoneNumber.replace(/-/g, "").replace(/\s/g, "");

    // OTP 검증
    const { data: otpRecord, error: otpError } = await adminClient
      .from("phone_otp_verifications")
      .select("*")
      .eq("phone_number", normalizedPhone)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      // 시도 횟수 증가
      await adminClient
        .from("phone_otp_verifications")
        .update({ attempts: (otpRecord?.attempts || 0) + 1 })
        .eq("phone_number", normalizedPhone)
        .eq("verified", false);

      return data(
        { success: false, error: "인증번호가 올바르지 않거나 만료되었습니다." },
        { status: 400 }
      );
    }

    // 시도 횟수 확인 (최대 5회)
    if (otpRecord.attempts >= 5) {
      return data(
        { success: false, error: "인증 시도 횟수를 초과했습니다. 새 인증번호를 요청해주세요." },
        { status: 400 }
      );
    }

    // OTP 검증 완료 처리
    await adminClient
      .from("phone_otp_verifications")
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    console.log("[OTP-Only] 전화번호 인증 완료:", normalizedPhone);

    return data({
      success: true,
      message: "전화번호 인증이 완료되었습니다.",
    });
  } catch (error) {
    console.error("[OTP-Only] Verify error:", error);

    if (error instanceof z.ZodError) {
      return data(
        { success: false, error: "올바른 정보를 입력해주세요." },
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
    message: "POST /api/auth/phone/verify-otp-only",
  });
}

