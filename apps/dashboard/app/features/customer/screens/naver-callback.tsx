/**
 * 네이버 로그인 콜백 페이지
 */
import type { Route } from "./+types/naver-callback";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2Icon } from "lucide-react";

import { Card, CardContent } from "~/core/components/ui/card";

import { AuthStatusCard } from "../components";

export function meta(): Route.MetaDescriptors {
  return [{ title: "네이버 로그인 | 썬데이허그" }];
}

export default function NaverCallbackScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setError("네이버 로그인이 취소되었습니다.");
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setError("잘못된 접근입니다.");
      return;
    }

    // state 검증
    const savedState = localStorage.getItem("naver_state");
    if (state !== savedState) {
      setStatus("error");
      setError("보안 검증에 실패했습니다.");
      return;
    }
    localStorage.removeItem("naver_state");

    // 네이버 로그인 처리
    handleNaverLogin(code);
  }, [searchParams]);

  const handleNaverLogin = async (code: string) => {
    try {
      const tokenResponse = await fetch("/api/auth/naver/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        throw new Error("토큰 발급에 실패했습니다.");
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.success) {
        throw new Error(tokenData.error || "로그인에 실패했습니다.");
      }

      // 로그인 성공
      setUserName(tokenData.memberName || "회원");
      setStatus("success");

      // localStorage에 회원 정보 저장
      localStorage.setItem("customerId", tokenData.memberId);
      localStorage.setItem("customerName", tokenData.memberName || "");
      localStorage.setItem("customerPhone", tokenData.memberPhone || "");

      // 마이페이지로 이동
      setTimeout(() => {
        navigate("/customer/mypage");
      }, 1500);
    } catch (err) {
      console.error("Naver login error:", err);
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "로그인 처리 중 오류가 발생했습니다."
      );
    }
  };

  if (status === "success") {
    return (
      <AuthStatusCard
        status="success"
        title="로그인 성공!"
        message="환영합니다"
        userName={userName}
      />
    );
  }

  if (status === "error") {
    return (
      <AuthStatusCard
        status="error"
        title="로그인 실패"
        message={error || "알 수 없는 오류가 발생했습니다."}
        buttonLabel="다시 시도"
        onButtonClick={() => navigate("/customer/register")}
      />
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2Icon className="h-12 w-12 mx-auto animate-spin text-[#03C75A]" />
          <p className="mt-4 text-lg font-medium">네이버 로그인 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </CardContent>
      </Card>
    </div>
  );
}

