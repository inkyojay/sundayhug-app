/**
 * Sundayhug 내부 관리 시스템 - 로그인
 * 
 * 내부 활용 버전:
 * - 회원가입 링크 제거
 * - 한국어 UI
 * - 소셜 로그인 (선택적)
 */
import type { Route } from "./+types/login";

import { AlertCircle, Loader2Icon } from "lucide-react";
import { useRef } from "react";
import { Form, Link, data, redirect, useFetcher } from "react-router";
import { z } from "zod";

import FormButton from "~/core/components/form-button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";

import FormErrors from "../../../core/components/form-error";
import { SignInButtons } from "../components/auth-login-buttons";

/**
 * Meta 함수
 */
export const meta: Route.MetaFunction = () => {
  return [
    {
      title: `로그인 | Sundayhug Admin`,
    },
  ];
};

/**
 * 폼 유효성 검사 스키마
 */
const loginSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요" }),
  password: z
    .string()
    .min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다" }),
});

/**
 * 로그인 액션
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const {
    data: validData,
    success,
    error,
  } = loginSchema.safeParse(Object.fromEntries(formData));

  if (!success) {
    return data({ fieldErrors: error.flatten().fieldErrors }, { status: 400 });
  }

  const [client, headers] = makeServerClient(request);
  const { error: signInError } = await client.auth.signInWithPassword({
    ...validData,
  });

  if (signInError) {
    // 에러 메시지 한국어 변환
    let errorMessage = signInError.message;
    if (errorMessage === "Invalid login credentials") {
      errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다";
    } else if (errorMessage === "Email not confirmed") {
      errorMessage = "이메일 인증이 필요합니다";
    }
    return data({ error: errorMessage }, { status: 400 });
  }

  // 로그인 후 승인 상태 확인
  const { data: { user } } = await client.auth.getUser();
  if (user) {
    const { data: profile } = await client
      .from("profiles")
      .select("role, approval_status")
      .eq("id", user.id)
      .single();

    // 승인 대기 중인 경우
    if (profile?.approval_status === "pending") {
      await client.auth.signOut();
      return data({ error: "가입 승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다." }, { status: 400 });
    }

    // 승인 거절된 경우
    if (profile?.approval_status === "rejected") {
      await client.auth.signOut();
      return data({ error: "가입이 거절되었습니다. 관리자에게 문의하세요." }, { status: 400 });
    }

    // 관리자 또는 최고관리자가 아닌 경우 (대시보드 접근 불가)
    const allowedRoles = ["admin", "super_admin"];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      await client.auth.signOut();
      return data({ error: "관리자 권한이 없습니다. 승인 후 다시 시도해주세요." }, { status: 400 });
    }
  }

  return redirect("/dashboard", { headers });
}

/**
 * 로그인 컴포넌트
 */
export default function Login({ actionData }: Route.ComponentProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fetcher = useFetcher();

  const onResendClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.delete("password");
    fetcher.submit(formData, {
      method: "post",
      action: "/auth/api/resend",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-2xl font-semibold">
            Sundayhug Admin
          </CardTitle>
          <CardDescription className="text-base">
            내부 관리 시스템에 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form
            className="flex w-full flex-col gap-5"
            method="post"
            ref={formRef}
          >
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                required
                type="email"
                placeholder="example@sundayhug.com"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.email ? (
                <FormErrors errors={actionData.fieldErrors.email} />
              ) : null}
            </div>
            <div className="flex flex-col items-start space-y-2">
              <div className="flex w-full items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link
                  to="/auth/forgot-password/reset"
                  className="text-muted-foreground text-underline hover:text-foreground self-end text-sm underline transition-colors"
                  tabIndex={-1}
                  viewTransition
                >
                  비밀번호 찾기
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                required
                type="password"
                placeholder="비밀번호를 입력하세요"
              />

              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.password ? (
                <FormErrors errors={actionData.fieldErrors.password} />
              ) : null}
            </div>
            <FormButton label="로그인" className="w-full" />
            {actionData && "error" in actionData ? (
              actionData.error === "이메일 인증이 필요합니다" ? (
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>이메일 인증 필요</AlertTitle>
                  <AlertDescription className="flex flex-col items-start gap-2">
                    로그인 전에 이메일 인증을 완료해주세요.
                    <Button
                      variant="outline"
                      className="text-foreground flex items-center justify-between gap-2"
                      onClick={onResendClick}
                    >
                      인증 이메일 재전송
                      {fetcher.state === "submitting" ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : null}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <FormErrors errors={[actionData.error]} />
              )
            ) : null}
          </Form>
          {/* 소셜 로그인 - 카카오 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="bg-input h-px w-full"></span>
              <span className="text-muted-foreground text-xs">또는</span>
              <span className="bg-input h-px w-full"></span>
            </div>
            <Link
              to="/auth/social/start/kakao"
              className="flex items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 py-2.5 text-[#191919] font-medium hover:bg-[#FDD800] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 0.6C4.029 0.6 0 3.713 0 7.539C0 9.877 1.558 11.939 3.931 13.153L2.933 16.844C2.845 17.163 3.213 17.416 3.489 17.23L7.873 14.295C8.241 14.337 8.617 14.358 9 14.358C13.971 14.358 18 11.245 18 7.419C18 3.593 13.971 0.6 9 0.6Z" fill="#191919"/>
              </svg>
              <span>카카오로 시작하기</span>
            </Link>
          </div>
        </CardContent>
      </Card>
      {/* 가입하기 링크 */}
      <p className="text-muted-foreground text-sm">
        계정이 없으신가요?{" "}
        <Link
          to="/register"
          className="text-primary hover:underline font-medium"
        >
          가입하기
        </Link>
      </p>
    </div>
  );
}
