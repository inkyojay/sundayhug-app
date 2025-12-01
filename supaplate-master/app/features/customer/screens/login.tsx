/**
 * 고객 통합 로그인 페이지 (Supabase Auth 통합)
 * 
 * - 카카오 로그인 (Supabase OAuth)
 * - 이메일 로그인 (Supabase Auth)
 */
import type { Route } from "./+types/login";

import { useState, useEffect } from "react";
import { data, useNavigate, useActionData, Form, useLoaderData } from "react-router";
import { ArrowLeftIcon, MailIcon } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Separator } from "~/core/components/ui/separator";
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
  
  // 이미 로그인되어 있으면 마이페이지로 리다이렉트
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

  // Supabase Auth로 로그인
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

  // 이미 로그인 상태면 마이페이지로 리다이렉트
  useEffect(() => {
    if (loaderData?.isLoggedIn) {
      navigate("/customer/mypage");
    }
  }, [loaderData, navigate]);

  useEffect(() => {
    if (actionData?.success) {
      // 로그인 성공 시 마이페이지로 이동
      navigate("/customer/mypage");
    } else if (actionData && "error" in actionData) {
      setError(actionData.error);
    }
  }, [actionData, navigate]);

  // 카카오 로그인 (Supabase OAuth)
  const handleKakaoLogin = async () => {
    // Supabase OAuth를 통한 카카오 로그인
    const redirectUrl = `${window.location.origin}/customer/auth/callback`;
    window.location.href = `/auth/social/start/kakao?redirectTo=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => showEmailForm ? setShowEmailForm(false) : navigate("/customer")}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {showEmailForm ? "이전" : "돌아가기"}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>
              {showEmailForm ? "이메일로 로그인합니다" : "로그인 방법을 선택해주세요"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4">
                <FormErrors errors={[error]} />
              </div>
            )}

            {!showEmailForm ? (
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
                  카카오로 로그인
                </Button>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    또는
                  </span>
                </div>

                {/* 이메일 로그인 */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full h-12"
                >
                  <MailIcon className="h-5 w-5 mr-2" />
                  이메일로 로그인
                </Button>
              </div>
            ) : (
              <Form method="post" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="비밀번호"
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  로그인
                </Button>
              </Form>
            )}

            {/* 회원가입 링크 */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              아직 회원이 아니신가요?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/customer/register")}
              >
                회원가입
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
