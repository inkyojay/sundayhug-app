/**
 * 네이버 로그인 콜백 페이지
 */
import type { Route } from "./+types/naver-callback";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2Icon, CheckCircleIcon, XCircleIcon } from "lucide-react";

import { Card, CardContent } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";

const NAVER_CLIENT_ID = "vg2MoKtr_rnX60RKdUKi";
const NAVER_CLIENT_SECRET = "JdHjpNFM4C";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "네이버 로그인 | 썬데이허그" },
  ];
}

export default function NaverCallbackScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
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
      // 1. 액세스 토큰 요청 (클라이언트에서 직접 호출 - CORS 문제로 서버 API 필요)
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

      // 마이페이지로 이동
      setTimeout(() => {
        navigate("/customer/mypage");
      }, 1500);
    } catch (err) {
      console.error("Naver login error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "로그인 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2Icon className="h-12 w-12 mx-auto animate-spin text-[#03C75A]" />
              <p className="mt-4 text-lg font-medium">네이버 로그인 중...</p>
              <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <p className="mt-4 text-lg font-medium">로그인 성공!</p>
              <p className="text-sm text-muted-foreground">
                {userName}님 환영합니다
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
              <p className="mt-4 text-lg font-medium">로그인 실패</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                className="mt-4"
                onClick={() => navigate("/customer/register")}
              >
                다시 시도
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

