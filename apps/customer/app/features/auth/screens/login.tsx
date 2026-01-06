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
import { useTranslation } from "react-i18next";
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

  return redirect("/dashboard", { headers });
}

/**
 * 로그인 컴포넌트
 */
export default function Login({ actionData }: Route.ComponentProps) {
  const { t } = useTranslation(["auth", "common"]);
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
            {t("auth:login.title")}
          </CardTitle>
          <CardDescription className="text-base">
            {t("auth:login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form
            className="flex w-full flex-col gap-5"
            method="post"
            ref={formRef}
          >
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="email">{t("auth:login.email")}</Label>
              <Input
                id="email"
                name="email"
                required
                type="email"
                placeholder={t("common:form.placeholder.email")}
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.email ? (
                <FormErrors errors={actionData.fieldErrors.email} />
              ) : null}
            </div>
            <div className="flex flex-col items-start space-y-2">
              <div className="flex w-full items-center justify-between">
                <Label htmlFor="password">{t("auth:login.password")}</Label>
                <Link
                  to="/auth/forgot-password/reset"
                  className="text-muted-foreground text-underline hover:text-foreground self-end text-sm underline transition-colors"
                  tabIndex={-1}
                  viewTransition
                >
                  {t("auth:login.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                required
                type="password"
                placeholder={t("common:form.placeholder.password")}
              />

              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.password ? (
                <FormErrors errors={actionData.fieldErrors.password} />
              ) : null}
            </div>
            <FormButton label={t("auth:login.button")} className="w-full" />
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
          {/* 소셜 로그인 (필요시 활성화) */}
          {/* <SignInButtons /> */}
        </CardContent>
      </Card>
      {/* 내부 시스템이므로 회원가입 링크 제거 */}
      <p className="text-muted-foreground text-sm">
        {t("auth:login.noAccount")} 관리자에게 문의하세요
      </p>
    </div>
  );
}
