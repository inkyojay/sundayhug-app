/**
 * Phone OTP Send API
 *
 * POST /api/auth/phone/send-otp
 * 전화번호로 카카오 알림톡 OTP 발송
 */
import type { Route } from "./+types/send-otp";

import { data } from "react-router";
import { z } from "zod";

import adminClient from "~/core/lib/supa-admin-client.server";
import { generateOTP, sendAlimtalkOTP, sendSmsOTP } from "../lib/solapi.server";

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

    // 최근 1분 이내 요청 확인 (스팸 방지)
    const { data: recentOtp } = await adminClient
      .from("phone_otp_verifications")
      .select("*")
      .eq("phone_number", normalizedPhone)
      .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
      .single();

    if (recentOtp) {
      return data(
        { success: false, error: "1분 후에 다시 시도해주세요." },
        { status: 429 }
      );
    }

    // 6자리 OTP 생성
    const otp = generateOTP();

    // 5분 후 만료
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // DB에 OTP 저장
    const { error: insertError } = await adminClient
      .from("phone_otp_verifications")
      .insert({
        phone_number: normalizedPhone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to save OTP:", insertError);
      return data(
        { success: false, error: "인증번호 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    // SMS로 먼저 발송 (알림톡은 채널 친구만 수신 가능)
    console.log("📱 SMS 발송 시작:", normalizedPhone);
    let sendResult = await sendSmsOTP(normalizedPhone, otp);

    // SMS 실패 시 알림톡으로 시도
    if (!sendResult.success) {
      console.log("📲 SMS 실패, 알림톡 시도...");
      sendResult = await sendAlimtalkOTP(normalizedPhone, otp);
    }

    if (!sendResult.success) {
      return data(
        { success: false, error: sendResult.error || "인증번호 발송에 실패했습니다." },
        { status: 500 }
      );
    }

    return data({
      success: true,
      message: "인증번호가 발송되었습니다.",
      expiresIn: 300, // 5분
    });
  } catch (error) {
    console.error("Send OTP error:", error);

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
    message: "POST /api/auth/phone/send-otp",
  });
}

