/**
 * 고객 회원가입 페이지 (새로운 디자인)
 * 
 * - 카카오 로그인 (Supabase OAuth)
 * - 이메일 가입 (Supabase Auth)
 */
import type { Route } from "./+types/register";

import { useState, useEffect } from "react";
import { data, useNavigate, useActionData, Form, useLoaderData, Link } from "react-router";
import { ArrowLeft, Mail, CheckCircle, ChevronRight } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import makeServerClient from "~/core/lib/supa-client.server";

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

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
          phone: phone ? phone.replace(/-/g, "") : null,
        },
      },
    });

    if (authError) {
      console.error("회원가입 오류:", authError);
      if (authError.message.includes("already registered")) {
        return data({ success: false, error: "이미 가입된 이메일입니다." });
      }
      return data({ success: false, error: `회원가입 실패: ${authError.message}` });
    }

    if (authData.user) {
      const normalizedPhone = phone ? phone.replace(/-/g, "") : null;
      
      await supabase
        .from("profiles")
        .update({
          name: name || null,
          phone: normalizedPhone,
        })
        .eq("id", authData.user.id);
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

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleKakaoLogin = async () => {
    const redirectUrl = `${window.location.origin}/customer/auth/callback`;
    window.location.href = `/auth/social/start/kakao?redirectTo=${encodeURIComponent(redirectUrl)}`;
  };

  const validateAndNext = () => {
    setError(null);
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
            {step === "phone" && "전화번호를 입력해주세요 (선택)"}
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
              <Link to="/customer/terms" className="underline">이용약관</Link>
              {" "}및{" "}
              <Link to="/customer/privacy" className="underline">개인정보처리방침</Link>
              에 동의합니다.
            </p>
          </div>
        )}

        {/* Step 2: 이메일 가입 정보 입력 */}
        {step === "email" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                이메일 *
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
                비밀번호 *
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
                비밀번호 확인 *
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
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                이름 (선택)
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

        {/* Step 3: 전화번호 입력 (선택) */}
        {step === "phone" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                전화번호 (선택)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="010-1234-5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                maxLength={13}
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
              <p className="text-xs text-gray-400 mt-2">
                전화번호는 A/S 신청 등에 사용됩니다. 나중에 입력해도 됩니다.
              </p>
            </div>

            <Form method="post">
              <input type="hidden" name="step" value="register" />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value={password} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="phone" value={phoneNumber} />
              
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-base"
              >
                가입 완료
              </Button>
            </Form>
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
