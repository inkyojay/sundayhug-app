/**
 * Sundayhug 내부 관리 시스템 - 회원가입
 * 
 * 기능:
 * - 이메일/비밀번호로 가입
 * - 가입 후 관리자 승인 필요
 * - 승인 전까지 로그인 불가
 */
import type { Route } from "./+types/register";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Form, Link, data, redirect } from "react-router";
import { z } from "zod";

import FormButton from "~/core/components/form-button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
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

/**
 * Meta 함수
 */
export const meta: Route.MetaFunction = () => {
  return [
    {
      title: `가입하기 | Sundayhug Admin`,
    },
  ];
};

/**
 * 폼 유효성 검사 스키마
 */
const registerSchema = z.object({
  name: z.string().min(2, { message: "이름은 최소 2자 이상이어야 합니다" }),
  email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요" }),
  password: z
    .string()
    .min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다" }),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

/**
 * 회원가입 액션
 * - Admin API 사용으로 이메일 인증 불필요
 * - 가입 후 관리자 승인 필요 (approval_status = pending)
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const {
    data: validData,
    success,
    error,
  } = registerSchema.safeParse(Object.fromEntries(formData));

  if (!success) {
    return data({ fieldErrors: error.flatten().fieldErrors }, { status: 400 });
  }

  const [client, headers] = makeServerClient(request);
  
  // Admin API로 사용자 생성 (이메일 인증 건너뛰기)
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();
  
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email: validData.email,
    password: validData.password,
    email_confirm: true, // 이메일 인증 건너뛰기
    user_metadata: {
      name: validData.name,
    },
  });

  if (createError) {
    let errorMessage = createError.message;
    if (errorMessage.includes("already been registered") || errorMessage.includes("already exists")) {
      errorMessage = "이미 가입된 이메일입니다";
    }
    return data({ error: errorMessage }, { status: 400 });
  }

  // profiles 테이블에 사용자 정보 저장 (approval_status = pending)
  if (authData.user) {
    await adminClient.from("profiles").upsert({
      id: authData.user.id,
      email: validData.email,
      name: validData.name,
      role: "customer", // 기본 역할은 고객
      approval_status: "pending", // 승인 대기
    });
  }

  return data({ success: true }, { headers });
}

/**
 * 회원가입 컴포넌트
 */
export default function Register({ actionData }: Route.ComponentProps) {
  // 가입 성공 시 안내 메시지 표시
  if (actionData && "success" in actionData && actionData.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-semibold">
              가입 신청 완료
            </CardTitle>
            <CardDescription className="text-base text-center">
              가입 신청이 완료되었습니다.<br />
              관리자 승인 후 로그인이 가능합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">승인 대기 중</AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-300">
                관리자가 가입 신청을 검토 중입니다.<br />
                승인이 완료되면 로그인할 수 있습니다.
              </AlertDescription>
            </Alert>
            <Link
              to="/login"
              className="w-full text-center bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              로그인 페이지로 돌아가기
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-2xl font-semibold">
            가입하기
          </CardTitle>
          <CardDescription className="text-base text-center">
            Sundayhug 관리 시스템에 가입합니다<br />
            <span className="text-amber-600 dark:text-amber-400">가입 후 관리자 승인이 필요합니다</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form
            className="flex w-full flex-col gap-4"
            method="post"
          >
            {/* 이름 */}
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                required
                type="text"
                placeholder="홍길동"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.name ? (
                <FormErrors errors={actionData.fieldErrors.name} />
              ) : null}
            </div>

            {/* 이메일 */}
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

            {/* 비밀번호 */}
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                required
                type="password"
                placeholder="6자 이상 입력"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.password ? (
                <FormErrors errors={actionData.fieldErrors.password} />
              ) : null}
            </div>

            {/* 비밀번호 확인 */}
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                required
                type="password"
                placeholder="비밀번호 다시 입력"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors.passwordConfirm ? (
                <FormErrors errors={actionData.fieldErrors.passwordConfirm} />
              ) : null}
            </div>

            <FormButton label="가입 신청하기" className="w-full mt-2" />

            {actionData && "error" in actionData ? (
              <FormErrors errors={[actionData.error]} />
            ) : null}
          </Form>
        </CardContent>
      </Card>

      {/* 로그인 링크 */}
      <p className="text-muted-foreground text-sm">
        이미 계정이 있으신가요?{" "}
        <Link
          to="/login"
          className="text-primary hover:underline font-medium"
        >
          로그인하기
        </Link>
      </p>
    </div>
  );
}

