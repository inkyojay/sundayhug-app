/**
 * Cafe24 연동 상태 페이지
 * /dashboard/integrations/cafe24
 * 
 * Vercel 대시보드 내에서 직접 Cafe24 OAuth 인증 처리
 */
import type { Route } from "./+types/cafe24-status";

import { data, useSearchParams } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  ExternalLink,
  AlertTriangle,
  ShoppingBag,
  KeyRound,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { CAFE24_CONFIG, isTokenExpired } from "../lib/cafe24.server";

const MALL_ID = CAFE24_CONFIG.mallId;

interface TokenData {
  mall_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string | null;
  issued_at: string | null;
  scope: string | null;
  updated_at: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase, headers] = makeServerClient(request);
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  let tokenData: TokenData | null = null;
  let error: string | null = null;
  let configValid = true;
  let missingConfig: string[] = [];

  // 설정 확인
  const required = ["clientId", "clientSecret", "authServer"];
  missingConfig = required.filter(
    (key) => !CAFE24_CONFIG[key as keyof typeof CAFE24_CONFIG]
  );
  configValid = missingConfig.length === 0;

  // Supabase에서 토큰 조회
  const { data: dbData, error: dbError } = await supabase
    .from("cafe24_tokens")
    .select("*")
    .eq("mall_id", MALL_ID)
    .single();

  if (dbError && dbError.code !== "PGRST116") {
    error = dbError.message;
  } else if (dbData) {
    tokenData = dbData;
  }

  return data({
    tokenData,
    error,
    configValid,
    missingConfig,
  }, { headers });
}

export default function Cafe24StatusPage({ loaderData }: Route.ComponentProps) {
  const { tokenData, error, configValid, missingConfig } = loaderData;
  const [searchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // URL 파라미터에서 결과 메시지 처리
  useEffect(() => {
    const success = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (success === "authenticated") {
      setNotification({ type: "success", message: "Cafe24 인증이 완료되었습니다!" });
    } else if (errorParam) {
      setNotification({ type: "error", message: `인증 오류: ${decodeURIComponent(errorParam)}` });
    }

    // 3초 후 알림 제거
    if (success || errorParam) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // 토큰 상태 계산
  const now = new Date();
  const expiresAt = tokenData?.expires_at ? new Date(tokenData.expires_at) : null;
  const expired = tokenData ? isTokenExpired(tokenData.expires_at) : true;
  const remainingSeconds = expiresAt 
    ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) 
    : 0;
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const needsRefresh = remainingSeconds < 300 && !expired;

  // 토큰 갱신 핸들러
  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/integrations/cafe24/refresh", {
        method: "POST",
      });
      const result = await response.json();
      if (result.success) {
        setNotification({ type: "success", message: "토큰이 갱신되었습니다!" });
        // 페이지 새로고침으로 데이터 갱신
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setNotification({ type: "error", message: result.error || "토큰 갱신 실패" });
      }
    } catch (err) {
      setNotification({ type: "error", message: "토큰 갱신 중 오류가 발생했습니다." });
    } finally {
      setIsRefreshing(false);
    }
  };

  // 인증 시작 핸들러
  const handleStartAuth = () => {
    window.location.href = "/api/integrations/cafe24/auth/start";
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cafe24 연동</h1>
          <p className="text-muted-foreground">썬데이허그 Cafe24 쇼핑몰 API 연동 상태</p>
        </div>
        <Badge variant={tokenData && !expired ? "default" : "secondary"}>
          {tokenData && !expired ? "연결됨" : "연결 안됨"}
        </Badge>
      </div>

      {/* 알림 메시지 */}
      {notification && (
        <Card className={notification.type === "success" ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-destructive bg-red-50 dark:bg-red-950"}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className={notification.type === "success" ? "text-green-700 dark:text-green-300" : "text-destructive"}>
                {notification.message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 설정 오류 경고 */}
      {!configValid && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-300">환경 변수 설정 필요</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  다음 환경 변수가 설정되지 않았습니다:
                </p>
                <ul className="mt-2 list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                  {missingConfig.map((key) => (
                    <li key={key}>
                      <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
                        CAFE24_{key.toUpperCase().replace("ID", "_ID").replace("SECRET", "_SECRET").replace("SERVER", "_SERVER")}
                      </code>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  Vercel 대시보드에서 환경 변수를 추가해주세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 토큰 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            API 토큰 상태
          </CardTitle>
          <CardDescription>
            쇼핑몰 ID: {MALL_ID}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenData ? (
            <>
              {/* 연결 상태 */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {expired ? (
                    <XCircle className="h-8 w-8 text-destructive" />
                  ) : needsRefresh ? (
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {expired ? "토큰 만료됨" : needsRefresh ? "갱신 필요" : "연결됨"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {expired 
                        ? "재인증이 필요합니다" 
                        : `남은 시간: ${remainingMinutes}분 ${remainingSeconds % 60}초`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefreshToken}
                    disabled={isRefreshing || !tokenData.refresh_token}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                    토큰 갱신
                  </Button>
                  <Button 
                    variant={expired ? "default" : "outline"}
                    size="sm"
                    onClick={handleStartAuth}
                    disabled={!configValid}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    재인증
                  </Button>
                </div>
              </div>

              {/* 토큰 상세 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Access Token</p>
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {tokenData.access_token.substring(0, 30)}...
                  </code>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Refresh Token</p>
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {tokenData.refresh_token.substring(0, 30)}...
                  </code>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">발급 시간</p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {tokenData.issued_at 
                      ? new Date(tokenData.issued_at).toLocaleString("ko-KR")
                      : "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">만료 시간</p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {expiresAt 
                      ? expiresAt.toLocaleString("ko-KR")
                      : "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">권한 범위 (Scope)</p>
                  <p className="text-sm">{tokenData.scope || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">마지막 업데이트</p>
                  <p className="text-sm">
                    {new Date(tokenData.updated_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">토큰이 등록되지 않았습니다</p>
              <p className="text-muted-foreground mb-4">
                Cafe24 API 연동을 위해 인증이 필요합니다.
              </p>
              <Button onClick={handleStartAuth} disabled={!configValid}>
                <KeyRound className="h-4 w-4 mr-2" />
                Cafe24 인증하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API 사용법 */}
      <Card>
        <CardHeader>
          <CardTitle>API 사용법</CardTitle>
          <CardDescription>대시보드에서 Cafe24 토큰을 사용하는 방법</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-2">1. 토큰 조회 (자동 갱신)</p>
              <code className="block p-3 bg-muted rounded text-sm">
                GET /api/integrations/cafe24/token?auto_refresh=true
              </code>
            </div>
            <div>
              <p className="font-medium mb-2">2. 토큰 수동 갱신</p>
              <code className="block p-3 bg-muted rounded text-sm">
                POST /api/integrations/cafe24/refresh
              </code>
            </div>
            <div>
              <p className="font-medium mb-2">응답 예시</p>
              <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "mall_id": "sundayhugkr",
    "access_token": "xxx...",
    "authorization_header": "Bearer xxx...",
    "is_expired": false,
    "remaining_seconds": 3200
  }
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 필요한 환경 변수 */}
      <Card>
        <CardHeader>
          <CardTitle>필요한 환경 변수</CardTitle>
          <CardDescription>Vercel에서 설정해야 하는 환경 변수 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <code>CAFE24_CLIENT_ID</code>
              <Badge variant={CAFE24_CONFIG.clientId ? "default" : "destructive"}>
                {CAFE24_CONFIG.clientId ? "설정됨" : "미설정"}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <code>CAFE24_CLIENT_SECRET</code>
              <Badge variant={CAFE24_CONFIG.clientSecret ? "default" : "destructive"}>
                {CAFE24_CONFIG.clientSecret ? "설정됨" : "미설정"}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <code>CAFE24_AUTH_SERVER</code>
              <Badge variant={CAFE24_CONFIG.authServer ? "default" : "destructive"}>
                {CAFE24_CONFIG.authServer ? "설정됨" : "미설정"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
