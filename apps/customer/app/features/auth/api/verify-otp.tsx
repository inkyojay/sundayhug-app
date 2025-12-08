/**
 * Phone OTP Verify API
 *
 * POST /api/auth/phone/verify-otp
 * OTP 검증 및 회원가입/로그인 처리
 */
import type { Route } from "./+types/verify-otp";

import { data, redirect } from "react-router";
import { z } from "zod";

import adminClient from "~/core/lib/supa-admin-client.server";
import makeServerClient from "~/core/lib/supa-client.server";

const requestSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  otp: z.string().length(6),
  name: z.string().min(1).optional(),
});

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { phoneNumber, otp, name } = requestSchema.parse(body);

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

    // 기존 사용자 확인 (전화번호로)
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === normalizedPhone || u.user_metadata?.phone === normalizedPhone
    );

    let userId: string;

    if (existingUser) {
      // 기존 사용자 업데이트
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        phone: normalizedPhone,
        phone_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          phone: normalizedPhone,
          phone_verified: true,
        },
      });
      userId = existingUser.id;
    } else {
      // 새 사용자 생성
      const userName = name || `User_${normalizedPhone.slice(-4)}`;
      
      // 임시 이메일 생성 (전화번호 기반)
      const tempEmail = `${normalizedPhone}@phone.sundayhug.com`;

      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          phone: normalizedPhone,
          phone_confirm: true,
          email: tempEmail,
          email_confirm: true,
          app_metadata: {
            provider: "phone",
            providers: ["phone"],
          },
          user_metadata: {
            name: userName,
            full_name: userName,
            phone: normalizedPhone,
            phone_verified: true,
          },
        });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return data(
          { success: false, error: "회원가입에 실패했습니다." },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // Magic Link로 세션 생성
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: existingUser?.email || `${normalizedPhone}@phone.sundayhug.com`,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("Failed to generate link:", linkError);
      return data(
        { success: false, error: "로그인 처리에 실패했습니다." },
        { status: 500 }
      );
    }

    // 세션 생성
    const [client, headers] = makeServerClient(request);
    const { error: verifyError } = await client.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("Failed to verify OTP:", verifyError);
      return data(
        { success: false, error: "세션 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return data(
      {
        success: true,
        message: "인증이 완료되었습니다.",
        isNewUser: !existingUser,
      },
      { headers }
    );
  } catch (error) {
    console.error("Verify OTP error:", error);

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
    message: "POST /api/auth/phone/verify-otp",
  });
}

