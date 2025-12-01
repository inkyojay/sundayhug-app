/**
 * 고객 회원가입 페이지
 * 
 * - 카카오 로그인
 * - 네이버 로그인
 * - 이메일 가입 (전화번호 인증 필수)
 */
import type { Route } from "./+types/register";

import { useState, useEffect } from "react";
import { data, useNavigate, useActionData, Form } from "react-router";
import { ArrowLeftIcon, Loader2Icon, CheckCircleIcon, MailIcon } from "lucide-react";
import bcrypt from "bcryptjs";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Separator } from "~/core/components/ui/separator";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "회원가입 | 썬데이허그" },
    { name: "description", content: "썬데이허그 고객 회원가입" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const step = formData.get("step") as string;
  
  const [supabase] = makeServerClient(request);

  if (step === "register") {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (!email || !password || !phone) {
      return data({ success: false, error: "모든 필수 항목을 입력해주세요." });
    }

    // 이메일 중복 확인
    const { data: existingUser } = await supabase
      .from("warranty_members")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return data({ success: false, error: "이미 가입된 이메일입니다." });
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedPhone = phone.replace(/-/g, "");

    // 회원 생성
    const { data: member, error } = await supabase
      .from("warranty_members")
      .insert({
        email,
        phone: normalizedPhone,
        password_hash: passwordHash,
        name: name || null,
      })
      .select()
      .single();

    if (error) {
      console.error("회원가입 오류:", error);
      return data({ success: false, error: "회원가입에 실패했습니다." });
    }

    return data({ 
      success: true, 
      memberId: member.id,
      memberName: member.name || member.email,
    });
  }

  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function CustomerRegisterScreen() {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"select" | "email" | "phone-verify" | "complete">("select");

  // 이미 로그인 상태면 마이페이지로 리다이렉트
  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (customerId) {
      navigate("/customer/mypage");
    }
  }, [navigate]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 전화번호 인증
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 회원 정보
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (actionData?.success) {
      setStep("complete");
      if ("memberId" in actionData && actionData.memberId) {
        localStorage.setItem("customerId", actionData.memberId);
        localStorage.setItem("customerName", ("memberName" in actionData ? actionData.memberName : "") || "");
      }
    } else if (actionData && "error" in actionData && actionData.error) {
      setError(actionData.error);
    }
  }, [actionData]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOtp = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "인증번호 발송에 실패했습니다.");
        return;
      }

      setSuccess("인증번호가 발송되었습니다.");
      setCountdown(300);
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "인증에 실패했습니다.");
        return;
      }

      setSuccess("전화번호 인증 완료!");
      setPhoneVerified(true);
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const KAKAO_CLIENT_ID = "7474843a05c3daf50d1253676e6badbd";
    const REDIRECT_URI = `${window.location.origin}/customer/kakao/callback`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleNaverLogin = () => {
    const NAVER_CLIENT_ID = "vg2MoKtr_rnX60RKdUKi";
    const REDIRECT_URI = `${window.location.origin}/customer/naver/callback`;
    const STATE = Math.random().toString(36).substring(7); // CSRF 방지
    
    // state를 localStorage에 저장 (콜백에서 검증용)
    localStorage.setItem("naver_state", STATE);
    
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;
    window.location.href = naverAuthUrl;
  };

  const validateForm = () => {
    if (!email || !email.includes("@")) {
      setError("올바른 이메일을 입력해주세요.");
      return false;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return false;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return false;
    }
    if (!phoneVerified) {
      setError("전화번호 인증이 필요합니다.");
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === "select") navigate("/customer");
            else if (step === "email") setStep("select");
            else if (step === "phone-verify") setStep("email");
          }}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {step === "select" ? "돌아가기" : "이전 단계"}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              {step === "select" && "가입 방법을 선택해주세요"}
              {step === "email" && "이메일로 가입합니다"}
              {step === "phone-verify" && "전화번호 인증이 필요합니다"}
              {step === "complete" && "회원가입이 완료되었습니다"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4">
                <FormErrors errors={[error]} />
              </div>
            )}
            {success && (
              <div className="mb-4">
                <FormSuccess message={success} />
              </div>
            )}

            {/* Step 1: 가입 방법 선택 */}
            {step === "select" && (
              <div className="space-y-4">
                {/* 카카오 로그인 */}
                <Button
                  type="button"
                  onClick={handleKakaoLogin}
                  className="w-full bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 h-12"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2 fill-current">
                    <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
                  </svg>
                  카카오로 시작하기
                </Button>

                {/* 네이버 로그인 */}
                <Button
                  type="button"
                  onClick={handleNaverLogin}
                  className="w-full bg-[#03C75A] text-white hover:bg-[#03C75A]/90 h-12"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2 fill-current">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                  네이버로 시작하기
                </Button>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    또는
                  </span>
                </div>

                {/* 이메일 가입 */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("email")}
                  className="w-full h-12"
                >
                  <MailIcon className="h-5 w-5 mr-2" />
                  이메일로 가입하기
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  가입 시{" "}
                  <a href="/terms" className="underline">이용약관</a>
                  {" "}및{" "}
                  <a href="/privacy" className="underline">개인정보처리방침</a>
                  에 동의합니다.
                </p>
              </div>
            )}

            {/* Step 2: 이메일 가입 정보 입력 */}
            {step === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">비밀번호 확인 *</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">이름 (선택)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => {
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
                    setError(null);
                    setStep("phone-verify");
                  }}
                  className="w-full"
                >
                  다음: 전화번호 인증
                </Button>
              </div>
            )}

            {/* Step 3: 전화번호 인증 */}
            {step === "phone-verify" && (
              <div className="space-y-4">
                {!phoneVerified ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">전화번호 *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="010-1234-5678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                          maxLength={13}
                          className="flex-1"
                          disabled={countdown > 0}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendOtp}
                          disabled={phoneNumber.length < 13 || isLoading || countdown > 0}
                        >
                          {countdown > 0 ? formatCountdown(countdown) : "인증요청"}
                        </Button>
                      </div>
                    </div>

                    {countdown > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="otp">인증번호</Label>
                        <div className="flex gap-2">
                          <Input
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            placeholder="6자리 입력"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                            maxLength={6}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otp.length !== 6 || isLoading}
                          >
                            {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "확인"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500 mb-2" />
                    <p className="font-medium text-green-600">전화번호 인증 완료</p>
                    <p className="text-sm text-muted-foreground">{phoneNumber}</p>
                  </div>
                )}

                {phoneVerified && (
                  <Form method="post" onSubmit={(e) => {
                    if (!validateForm()) {
                      e.preventDefault();
                    }
                  }}>
                    <input type="hidden" name="step" value="register" />
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="password" value={password} />
                    <input type="hidden" name="name" value={name} />
                    <input type="hidden" name="phone" value={phoneNumber} />
                    
                    <Button type="submit" className="w-full">
                      회원가입 완료
                    </Button>
                  </Form>
                )}
              </div>
            )}

            {/* Step 4: 완료 */}
            {step === "complete" && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                  회원가입이 완료되었습니다.
                  <br />
                  마이페이지에서 다양한 서비스를 이용하세요!
                </p>
                <Button
                  onClick={() => navigate("/customer/mypage")}
                  className="w-full"
                >
                  마이페이지로 이동
                </Button>
              </div>
            )}

            {/* 로그인 링크 */}
            {step !== "complete" && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                이미 회원이신가요?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate("/customer/login")}
                >
                  로그인
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
