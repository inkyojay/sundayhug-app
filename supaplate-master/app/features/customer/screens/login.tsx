/**
 * 고객 통합 로그인 페이지
 * 
 * - 카카오 로그인
 * - 네이버 로그인
 * - 이메일 로그인
 */
import type { Route } from "./+types/login";

import { useState, useEffect } from "react";
import { data, useNavigate, useActionData, Form } from "react-router";
import { ArrowLeftIcon, Loader2Icon, MailIcon } from "lucide-react";
import bcrypt from "bcryptjs";

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

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const [supabase] = makeServerClient(request);

  if (!email || !password) {
    return data({ success: false, error: "이메일과 비밀번호를 입력해주세요." });
  }

  // 이메일로 회원 조회
  const { data: member, error } = await supabase
    .from("warranty_members")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !member) {
    return data({ success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  if (!member.password_hash) {
    return data({ success: false, error: "소셜 로그인으로 가입한 계정입니다. 카카오/네이버로 로그인해주세요." });
  }

  const isValidPassword = await bcrypt.compare(password, member.password_hash);
  if (!isValidPassword) {
    return data({ success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  // 마지막 로그인 시간 업데이트
  await supabase
    .from("warranty_members")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", member.id);

  return data({ 
    success: true, 
    memberId: member.id,
    memberName: member.name || member.email,
    memberPhone: member.phone || "",
  });
}

export default function CustomerLoginScreen() {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인 상태면 마이페이지로 리다이렉트
  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (customerId) {
      navigate("/customer/mypage");
    }
  }, [navigate]);

  useEffect(() => {
    if (actionData?.success && "memberId" in actionData) {
      localStorage.setItem("customerId", actionData.memberId);
      localStorage.setItem("customerName", ("memberName" in actionData ? actionData.memberName : "") || "");
      localStorage.setItem("customerPhone", ("memberPhone" in actionData ? actionData.memberPhone : "") || "");
      navigate("/customer/mypage");
    } else if (actionData && "error" in actionData) {
      setError(actionData.error);
    }
  }, [actionData, navigate]);

  const handleKakaoLogin = () => {
    const KAKAO_CLIENT_ID = "7474843a05c3daf50d1253676e6badbd";
    const REDIRECT_URI = `${window.location.origin}/customer/kakao/callback`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleNaverLogin = () => {
    const NAVER_CLIENT_ID = "vg2MoKtr_rnX60RKdUKi";
    const REDIRECT_URI = `${window.location.origin}/customer/naver/callback`;
    const STATE = Math.random().toString(36).substring(7);
    localStorage.setItem("naver_state", STATE);
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;
    window.location.href = naverAuthUrl;
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

                {/* 네이버 로그인 - 비활성화
                <Button
                  type="button"
                  onClick={handleNaverLogin}
                  className="w-full bg-[#03C75A] text-white hover:bg-[#03C75A]/90 h-12"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2 fill-current">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                  네이버로 로그인
                </Button>
                */}

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
