/**
 * 고객 통합 로그인 페이지 (새로운 디자인)
 * 
 * - 카카오 로그인 (Supabase OAuth)
 * - 이메일 로그인 (Supabase Auth)
 */
import type { Route } from "./+types/login";

import { useState, useEffect } from "react";
import { data, useNavigate, useActionData, Form, useLoaderData, Link } from "react-router";
import { ArrowLeft, Mail, ChevronRight } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import FormErrors from "~/core/components/form-error";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "로그인 | 썬데이허그" },
    { name: "description", content: "썬데이허그 고객 로그인" },
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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const [supabase, headers] = makeServerClient(request);

  if (!email || !password) {
    return data({ success: false, error: "이메일과 비밀번호를 입력해주세요." });
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return data({ success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  return data({ success: true }, { headers });
}

export default function CustomerLoginScreen() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaderData?.isLoggedIn) {
      navigate("/customer/mypage");
    }
  }, [loaderData, navigate]);

  useEffect(() => {
    if (actionData?.success) {
      navigate("/customer/mypage");
    } else if (actionData && "error" in actionData && actionData.error) {
      setError(actionData.error as string);
    }
  }, [actionData, navigate]);

  const handleKakaoLogin = async () => {
    const redirectUrl = `${window.location.origin}/customer/auth/callback`;
    window.location.href = `/auth/social/start/kakao?redirectTo=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-md px-6 py-10">
        {/* Back Button */}
        <button
          onClick={() => showEmailForm ? setShowEmailForm(false) : navigate("/customer")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">
            {showEmailForm ? "이전" : "홈으로"}
          </span>
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            로그인
          </h1>
          <p className="text-gray-500">
            {showEmailForm ? "이메일로 로그인합니다" : "로그인 방법을 선택해주세요"}
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <FormErrors errors={[error]} />
          </div>
        )}

        {!showEmailForm ? (
          <div className="space-y-4">
            {/* 카카오 로그인 */}
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] font-medium h-14 rounded-2xl hover:bg-[#FEE500]/90 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
              </svg>
              카카오로 로그인
            </button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#F5F5F0] px-4 text-sm text-gray-400">
                  또는
                </span>
              </div>
            </div>

            {/* 이메일 로그인 */}
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-medium h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Mail className="h-5 w-5" />
              이메일로 로그인
            </button>
          </div>
        ) : (
          <Form method="post" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                이메일
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                required
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                비밀번호
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="비밀번호"
                required
                className="h-14 rounded-2xl border-gray-200 bg-white px-4 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-base"
            >
              로그인
            </Button>
          </Form>
        )}

        {/* 회원가입 링크 */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <Link 
            to="/customer/register"
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors group"
          >
            <div>
              <p className="font-medium text-gray-900">아직 회원이 아니신가요?</p>
              <p className="text-sm text-gray-500 mt-1">회원가입하고 다양한 혜택을 받으세요</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
