/**
 * 고객 회원가입 페이지 (새로운 디자인)
 * 
 * - 카카오 로그인 (Supabase OAuth)
 * - 이메일 가입 (Supabase Auth) + 전화번호 SMS 인증 필수
 */
import type { Route } from "./+types/register";

import { useState, useEffect } from "react";
import { data, useNavigate, useActionData, Form, useLoaderData, Link } from "react-router";
import { ArrowLeft, Mail, CheckCircle, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "회원가입 | 썬데이허그" },
    { name: "description", content: "썬데이허그 고객 회원가입" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return data({ isLoggedIn: true });
  }
  
  return data({ isLoggedIn: false });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const step = formData.get("step") as string;
  
  const [supabase, headers] = makeServerClient(request);

  if (step === "register") {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (!email || !password) {
      return data({ success: false, error: "이메일과 비밀번호를 입력해주세요." });
    }

    if (!name || name.trim().length < 2) {
      return data({ success: false, error: "이름을 2자 이상 입력해주세요." });
    }

    if (!phone) {
      return data({ success: false, error: "전화번호를 입력해주세요." });
    }

    const normalizedPhone = phone.replace(/-/g, "");

    // 전화번호 중복 체크 (서버에서 한번 더)
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, phone")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existingProfile) {
      return data({ success: false, error: "이미 가입된 전화번호입니다." });
    }

    // adminClient로 사용자 생성 (이메일 인증 없이 바로 가입)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata: {
        name: name.trim(),
        phone: normalizedPhone,
      },
    });

    if (createError) {
      console.error("회원가입 오류:", createError);
      if (createError.message.includes("already been registered")) {
        return data({ success: false, error: "이미 가입된 이메일입니다." });
      }
      return data({ success: false, error: `회원가입 실패: ${createError.message}` });
    }

    if (newUser.user) {
      // profiles 테이블에 저장
      await adminClient
        .from("profiles")
        .upsert({
          id: newUser.user.id,
          name: name.trim(),
          phone: normalizedPhone,
          email: email,
        });
      
      // 바로 로그인 처리
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.error("자동 로그인 오류:", signInError);
        // 로그인 실패해도 가입은 성공이므로 success 반환
      }
    }

    return data({ success: true }, { headers });
  }

  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function CustomerRegisterScreen() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"select" | "email" | "phone" | "complete">("select");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 회원 정보
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // SMS 인증
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (loaderData?.isLoggedIn) {
      navigate("/customer/mypage");
    }
  }, [loaderData, navigate]);

  useEffect(() => {
    if (actionData?.success) {
      setStep("complete");
    } else if (actionData && "error" in actionData && actionData.error) {
      setError(actionData.error as string);
    }
  }, [actionData]);

  // OTP 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleKakaoLogin = async () => {
    // 카카오 REST API 키
    const KAKAO_CLIENT_ID = "2737860d151daba73e31d3df6213a012";
    const REDIRECT_URI = `${window.location.origin}/customer/kakao/callback`;
    
    // 카카오 동의 항목 (scope)
    const scopes = [
      "profile_nickname",
      "profile_image", 
      "account_email",
      "phone_number",
      "name",
      "gender",
      "age_range"
    ].join(",");
    
    // CSRF 방지를 위한 state 생성
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem("kakao_oauth_state", state);
    
    // 카카오 인가 URL로 직접 리다이렉트
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scopes}&state=${state}`;
    
    window.location.href = kakaoAuthUrl;
  };

  const validateAndNext = () => {
    setError(null);
    if (!name || name.trim().length < 2) {
      setError("이름을 2자 이상 입력해주세요.");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("올바른 이메일을 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setStep("phone");
  };

  // 전화번호 중복 체크
  const checkPhoneDuplicate = async (phone: string) => {
    const normalizedPhone = phone.replace(/-/g, "");
    if (normalizedPhone.length < 10) return;

    setIsCheckingPhone(true);
    setPhoneError(null);

    try {
      const response = await fetch("/api/auth/phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });

      const result = await response.json();

      if (result.exists) {
        setPhoneError(result.message);
        setIsOtpSent(false);
        setIsOtpVerified(false);
      }
    } catch (err) {
      console.error("Phone check error:", err);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // SMS 인증번호 발송
  const handleSendOtp = async () => {
    const normalizedPhone = phoneNumber.replace(/-/g, "");
    if (normalizedPhone.length < 10) {
      setPhoneError("올바른 전화번호를 입력해주세요.");
      return;
    }

    // 먼저 중복 체크
    setIsSendingOtp(true);
    setPhoneError(null);

    try {
      // 중복 체크
      const checkResponse = await fetch("/api/auth/phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });

      const checkResult = await checkResponse.json();

      if (checkResult.exists) {
        setPhoneError(checkResult.message);
        setIsSendingOtp(false);
        return;
      }

      // OTP 발송
      const response = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });

      const result = await response.json();

      if (result.success) {
        setIsOtpSent(true);
        setOtpTimer(300); // 5분
        setSuccess("인증번호가 발송되었습니다.");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setPhoneError(result.error || "인증번호 발송에 실패했습니다.");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setPhoneError("인증번호 발송에 실패했습니다.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // SMS 인증번호 확인
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setPhoneError("6자리 인증번호를 입력해주세요.");
      return;
    }

    setIsVerifyingOtp(true);
    setPhoneError(null);

    try {
      const response = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.replace(/-/g, ""),
          otpCode,
          verifyOnly: true, // 단순 검증만 (회원가입은 별도 처리)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsOtpVerified(true);
        setSuccess("전화번호가 인증되었습니다!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setPhoneError(result.error || "인증번호가 일치하지 않습니다.");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setPhoneError("인증 확인에 실패했습니다.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const getBackAction = () => {
    if (step === "select") navigate("/customer");
    else if (step === "email") setStep("select");
    else if (step === "phone") setStep("email");
  };

  // Progress indicator
  const getProgress = () => {
    if (step === "select") return 0;
    if (step === "email") return 1;
    if (step === "phone") return 2;
    return 3;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-md px-6 py-10">
        {/* Back Button */}
        {step !== "complete" && (
          <button
            onClick={getBackAction}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">
              {step === "select" ? "홈으로" : "이전"}
            </span>
          </button>
        )}

        {/* Progress Steps */}
        {step !== "select" && step !== "complete" && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  getProgress() >= s ? "bg-[#FF6B35]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === "complete" ? "가입 완료!" : "회원가입"}
          </h1>
          <p className="text-gray-500">
            {step === "select" && "가입 방법을 선택해주세요"}
            {step === "email" && "기본 정보를 입력해주세요"}
            {step === "phone" && "전화번호 인증을 완료해주세요"}
            {step === "complete" && "썬데이허그에 오신 것을 환영합니다"}
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <FormErrors errors={[error]} />
          </div>
        )}
        {success && (
          <div className="mb-6">
            <FormSuccess message={success} />
          </div>
        )}

        {/* Step 1: 가입 방법 선택 */}
        {step === "select" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] font-medium h-14 rounded-2xl hover:bg-[#FEE500]/90 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
              </svg>
              카카오로 시작하기
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#F5F5F0] px-4 text-sm text-gray-400">또는</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-medium h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Mail className="h-5 w-5" />
              이메일로 가입하기
            </button>

            <p className="text-center text-xs text-gray-400 mt-6">
              가입 시{" "}
              <Link to="/terms" className="underline">이용약관</Link>
              {" "}및{" "}
              <Link to="/privacy" className="underline">개인정보처리방침</Link>
              에 동의합니다.
            </p>
          </div>
        )}

        {/* Step 2: 이메일 가입 정보 입력 */}
        {step === "email" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                이름 또는 닉네임 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="2자 이상 입력"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-sm font-medium text-gray-700">
                비밀번호 확인 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
            </div>

            <Button
              type="button"
              onClick={validateAndNext}
              className="w-full h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-base mt-4"
            >
              다음
            </Button>
          </div>
        )}

        {/* Step 3: 전화번호 인증 (필수) */}
        {step === "phone" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                전화번호 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={phoneNumber}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setPhoneNumber(formatted);
                    setPhoneError(null);
                    setIsOtpSent(false);
                    setIsOtpVerified(false);
                    setOtpCode("");
                  }}
                  maxLength={13}
                  disabled={isOtpVerified}
                  className="flex-1 h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35] disabled:bg-gray-100"
                />
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={phoneNumber.replace(/-/g, "").length < 10 || isSendingOtp || isOtpVerified}
                  className="h-14 px-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isOtpSent ? (
                    "재발송"
                  ) : (
                    "인증요청"
                  )}
                </Button>
              </div>
              {phoneError && (
                <p className="text-sm text-red-500 mt-1">{phoneError}</p>
              )}
            </div>

            {/* OTP 입력 */}
            {isOtpSent && !isOtpVerified && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  인증번호 입력
                  {otpTimer > 0 && (
                    <span className="ml-2 text-[#FF6B35] font-medium">
                      {formatTime(otpTimer)}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="otp"
                    type="text"
                    placeholder="6자리 숫자"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="flex-1 h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35] text-center text-xl tracking-widest"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6 || isVerifyingOtp}
                    className="h-14 px-6 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium disabled:opacity-50"
                  >
                    {isVerifyingOtp ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "확인"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* 인증 완료 표시 */}
            {isOtpVerified && (
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-2xl border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">전화번호 인증이 완료되었습니다</span>
              </div>
            )}

            <Form method="post">
              <input type="hidden" name="step" value="register" />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value={password} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="phone" value={phoneNumber} />
              
              <Button 
                type="submit" 
                disabled={!isOtpVerified}
                className="w-full h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOtpVerified ? "가입 완료" : "전화번호 인증을 완료해주세요"}
              </Button>
            </Form>

            <p className="text-xs text-gray-400 mt-2">
              전화번호는 보증서 등록, A/S 신청 등에 사용됩니다.
            </p>
          </div>
        )}

        {/* Step 4: 완료 */}
        {step === "complete" && (
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-gray-500 mb-8">
              회원가입이 완료되었습니다.<br />
              마이페이지에서 다양한 서비스를 이용하세요!
            </p>
            <Button
              onClick={() => navigate("/customer/mypage")}
              className="w-full h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-base"
            >
              마이페이지로 이동
            </Button>
          </div>
        )}

        {/* 로그인 링크 */}
        {step !== "complete" && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <Link 
              to="/customer/login"
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <div>
                <p className="font-medium text-gray-900">이미 회원이신가요?</p>
                <p className="text-sm text-gray-500 mt-1">로그인하러 가기</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
