/**
 * 비밀번호 찾기 페이지
 * 
 * 플로우:
 * 1. 이메일 입력
 * 2. 등록된 전화번호로 OTP 발송
 * 3. OTP 인증
 * 4. 새 비밀번호 설정
 */
import type { Route } from "./+types/forgot-password";

import { Link, useFetcher, data } from "react-router";
import { ArrowLeft, Mail, Phone, Lock, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "비밀번호 찾기 | 썬데이허그" },
    { name: "description", content: "비밀번호를 잊으셨나요? 휴대폰 인증으로 비밀번호를 재설정하세요." },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  // 서버 전용 모듈은 action 내에서 동적 import
  const { default: adminClient } = await import("~/core/lib/supa-admin-client.server");
  
  const formData = await request.formData();
  const step = formData.get("step") as string;

  // Step 1: 이메일로 계정 찾기
  if (step === "findAccount") {
    const email = formData.get("email") as string;
    
    if (!email) {
      return data({ success: false, error: "이메일을 입력해주세요." });
    }

    // 이메일로 사용자 찾기
    const { data: users, error } = await adminClient.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      return data({ success: false, error: "가입되지 않은 이메일입니다." });
    }

    // 전화번호 확인
    const phone = user.user_metadata?.phone || user.phone;
    if (!phone) {
      return data({ success: false, error: "등록된 전화번호가 없습니다. 고객센터로 문의해주세요." });
    }

    // 전화번호 마스킹 (010-****-5837)
    const maskedPhone = phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3");

    return data({ 
      success: true, 
      maskedPhone,
      userId: user.id,
      phone, // 실제 전화번호는 서버에서만 사용
    });
  }

  // Step 2: OTP 발송
  if (step === "sendOtp") {
    const phone = formData.get("phone") as string;
    
    if (!phone) {
      return data({ success: false, error: "전화번호 정보가 없습니다." });
    }

    const normalizedPhone = phone.replace(/-/g, "").replace(/\s/g, "");

    // OTP 생성 (6자리)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

    // OTP 저장
    await adminClient
      .from("phone_otp_verifications")
      .insert({
        phone_number: normalizedPhone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
      });

    // SMS 발송
    try {
      const { sendSmsOTP } = await import("~/shared/services/notification");
      const result = await sendSmsOTP(normalizedPhone, otp);
      
      if (!result.success) {
        return data({ success: false, error: result.error || "SMS 발송에 실패했습니다." });
      }
      
      return data({ success: true, expiresIn: 300 });
    } catch (error) {
      console.error("SMS 발송 오류:", error);
      return data({ success: false, error: "인증번호 발송에 실패했습니다." });
    }
  }

  // Step 3: OTP 인증
  if (step === "verifyOtp") {
    const phone = formData.get("phone") as string;
    const otp = formData.get("otp") as string;

    if (!phone || !otp) {
      return data({ success: false, error: "인증 정보가 부족합니다." });
    }

    const normalizedPhone = phone.replace(/-/g, "").replace(/\s/g, "");

    // OTP 확인
    const { data: otpRecord, error } = await adminClient
      .from("phone_otp_verifications")
      .select("*")
      .eq("phone_number", normalizedPhone)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !otpRecord) {
      return data({ success: false, error: "인증번호가 올바르지 않거나 만료되었습니다." });
    }

    // 시도 횟수 확인
    if (otpRecord.attempts >= 5) {
      return data({ success: false, error: "인증 시도 횟수를 초과했습니다." });
    }

    // OTP 인증 완료 처리
    await adminClient
      .from("phone_otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    return data({ success: true, verified: true });
  }

  // Step 4: 비밀번호 변경
  if (step === "resetPassword") {
    const userId = formData.get("userId") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!userId || !newPassword) {
      return data({ success: false, error: "필수 정보가 부족합니다." });
    }

    if (newPassword.length < 6) {
      return data({ success: false, error: "비밀번호는 6자 이상이어야 합니다." });
    }

    if (newPassword !== confirmPassword) {
      return data({ success: false, error: "비밀번호가 일치하지 않습니다." });
    }

    // 비밀번호 변경
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("비밀번호 변경 오류:", error);
      return data({ success: false, error: "비밀번호 변경에 실패했습니다." });
    }

    return data({ success: true, passwordChanged: true });
  }

  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function ForgotPasswordScreen() {
  const fetcher = useFetcher();
  
  // 상태 관리
  const [step, setStep] = useState<"email" | "otp" | "newPassword" | "complete">("email");
  const [email, setEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLoading = fetcher.state !== "idle";

  // 카운트다운
  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdown]);

  // fetcher 결과 처리
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data as { success: boolean; error?: string; step?: string; email?: string };
      
      if (!result.success) {
        setError(result.error);
        return;
      }

      setError(null);

      // Step 1 완료: 계정 찾기 성공
      if (result.maskedPhone) {
        setMaskedPhone(result.maskedPhone);
        setPhone(result.phone);
        setUserId(result.userId);
        setStep("otp");
      }

      // OTP 발송 성공
      if (result.expiresIn) {
        setOtpSent(true);
        setCountdown(result.expiresIn);
      }

      // OTP 인증 성공
      if (result.verified) {
        setStep("newPassword");
      }

      // 비밀번호 변경 성공
      if (result.passwordChanged) {
        setStep("complete");
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Step 1: 이메일로 계정 찾기
  const handleFindAccount = () => {
    setError(null);
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    fetcher.submit(
      { step: "findAccount", email },
      { method: "post" }
    );
  };

  // Step 2: OTP 발송
  const handleSendOtp = () => {
    setError(null);
    fetcher.submit(
      { step: "sendOtp", phone },
      { method: "post" }
    );
  };

  // Step 3: OTP 인증
  const handleVerifyOtp = () => {
    setError(null);
    if (!otp || otp.length !== 6) {
      setError("6자리 인증번호를 입력해주세요.");
      return;
    }
    fetcher.submit(
      { step: "verifyOtp", phone, otp },
      { method: "post" }
    );
  };

  // Step 4: 비밀번호 변경
  const handleResetPassword = () => {
    setError(null);
    if (!newPassword) {
      setError("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    fetcher.submit(
      { step: "resetPassword", userId, newPassword, confirmPassword },
      { method: "post" }
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/login"
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">비밀번호 찾기</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">휴대폰 인증으로 비밀번호를 재설정하세요</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["email", "otp", "newPassword", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s 
                  ? "bg-[#FF6B35] text-white" 
                  : ["email", "otp", "newPassword", "complete"].indexOf(step) > i
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              }`}>
                {["email", "otp", "newPassword", "complete"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-1 ${
                ["email", "otp", "newPassword", "complete"].indexOf(step) > i
                  ? "bg-green-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`} />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg">
          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: 이메일 입력 */}
          {step === "email" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">이메일 입력</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  가입하신 이메일을 입력해주세요
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="mt-2 h-12"
                />
              </div>

              <Button
                onClick={handleFindAccount}
                disabled={isLoading || !email}
                className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "다음"}
              </Button>
            </div>
          )}

          {/* Step 2: OTP 인증 */}
          {step === "otp" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">휴대폰 인증</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  등록된 번호 <span className="font-bold text-[#FF6B35]">{maskedPhone}</span>로
                  <br />인증번호를 발송합니다
                </p>
              </div>

              {!otpSent ? (
                <Button
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "인증번호 받기"}
                </Button>
              ) : (
                <>
                  <div>
                    <Label htmlFor="otp" className="text-gray-700 dark:text-gray-200">인증번호</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6자리 입력"
                      maxLength={6}
                      className="mt-2 h-12 text-center text-2xl tracking-widest"
                    />
                    {countdown > 0 && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        남은 시간: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSendOtp}
                      disabled={isLoading || countdown > 0}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      재발송
                    </Button>
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={isLoading || otp.length !== 6}
                      className="flex-1 h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "확인"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: 새 비밀번호 설정 */}
          {step === "newPassword" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">새 비밀번호 설정</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  새로운 비밀번호를 입력해주세요
                </p>
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-gray-700 dark:text-gray-200">새 비밀번호</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6자 이상"
                  className="mt-2 h-12"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-200">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 다시 입력"
                  className="mt-2 h-12"
                />
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "비밀번호 변경"}
              </Button>
            </div>
          )}

          {/* Step 4: 완료 */}
          {step === "complete" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                비밀번호가 변경되었습니다
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                새 비밀번호로 로그인해주세요
              </p>
              <Button asChild className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                <Link to="/customer/login">로그인하기</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Footer Link */}
        {step !== "complete" && (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
            비밀번호가 기억나셨나요?{" "}
            <Link to="/customer/login" className="text-[#FF6B35] hover:underline font-medium">
              로그인하기
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

