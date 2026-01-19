/**
 * 네이버 스마트스토어 연동 상태 페이지
 * 
 * 네이버 커머스 API 연동 상태를 확인하고 관리합니다.
 * - 연동 상태 확인
 * - 연동 시작/해제
 * - 토큰 정보 표시
 */
import type { Route } from "./+types/naver-status";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Link2Off,
  MessageSquare,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Store,
} from "lucide-react";
import { Link, data, useFetcher } from "react-router";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";

import type { NaverToken } from "../lib/naver.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `네이버 스마트스토어 연동 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

  // 동적 import로 서버 전용 모듈 로드
  const { getNaverToken } = await import("../lib/naver.server");
  
  // 토큰 조회
  const token = await getNaverToken();
  
  // 환경변수 설정 여부 확인
  const isConfigured = !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

  return {
    isConnected: !!token,
    isConfigured,
    token: token ? {
      account_id: token.account_id,
      scope: token.scope,
      expires_at: token.expires_at,
      updated_at: token.updated_at,
    } : null,
    message: success || null,
    error: error || null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  // 동적 import로 서버 전용 모듈 로드
  const { refreshNaverToken, disconnectNaver } = await import("../lib/naver.server");

  if (actionType === "connect") {
    // 토큰 발급
    const token = await refreshNaverToken();
    
    if (!token) {
      return data({ 
        success: false, 
        error: "토큰 발급에 실패했습니다. credentials를 확인해주세요." 
      });
    }
    
    return data({ success: true, message: "연동이 완료되었습니다!" });
  }

  if (actionType === "disconnect") {
    const accountId = formData.get("accountId") as string;
    const result = await disconnectNaver(accountId);
    
    if (!result.success) {
      return data({ success: false, error: result.error });
    }
    
    return data({ success: true, message: "연동이 해제되었습니다." });
  }

  if (actionType === "refresh") {
    // 토큰 갱신
    const token = await refreshNaverToken();
    
    if (!token) {
      return data({ 
        success: false, 
        error: "토큰 갱신에 실패했습니다." 
      });
    }
    
    return data({ success: true, message: "토큰이 갱신되었습니다." });
  }

  return data({ success: false, error: "알 수 없는 액션" });
}

export default function NaverStatus({ loaderData, actionData }: Route.ComponentProps) {
  const { isConnected, isConfigured, token, message, error } = loaderData;
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  // 토큰 만료 여부 확인
  const isTokenExpired = token?.expires_at 
    ? new Date(token.expires_at) < new Date() 
    : false;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-green-500" />
            네이버 스마트스토어 연동
          </h1>
          <p className="text-muted-foreground">
            네이버 스마트스토어와 연동하여 주문, 상품 데이터를 동기화합니다
          </p>
        </div>
      </div>

      {/* 성공/에러 메시지 */}
      {(message || actionData?.message) && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-700 dark:text-green-400">성공</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            {message || actionData?.message}
          </AlertDescription>
        </Alert>
      )}

      {(error || actionData?.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>
            {error || actionData?.error}
          </AlertDescription>
        </Alert>
      )}

      {/* 환경변수 미설정 경고 */}
      {!isConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>환경변수 미설정</AlertTitle>
          <AlertDescription>
            NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 연동 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            연동 상태
            {isConnected ? (
              <Badge className="bg-green-500">연동됨</Badge>
            ) : (
              <Badge variant="secondary">미연동</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isConnected 
              ? "네이버 스마트스토어와 연동되어 있습니다" 
              : "네이버 스마트스토어와 연동되지 않았습니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && token ? (
            <>
              {/* 연동 정보 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">계정 ID</p>
                  <p className="font-medium">{token.account_id}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">토큰 만료</p>
                  <p className={`font-medium ${isTokenExpired ? "text-red-500" : ""}`}>
                    {new Date(token.expires_at).toLocaleString("ko-KR")}
                    {isTokenExpired && " (만료됨)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">마지막 갱신</p>
                  <p className="font-medium">
                    {new Date(token.updated_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>

              {/* 토큰 만료 경고 */}
              {isTokenExpired && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>토큰 만료</AlertTitle>
                  <AlertDescription>
                    토큰이 만료되었습니다. 토큰을 갱신해주세요.
                  </AlertDescription>
                </Alert>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button asChild variant="outline">
                  <a 
                    href="https://sell.smartstore.naver.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    스마트스토어 관리자
                  </a>
                </Button>
                
                <fetcher.Form method="post">
                  <input type="hidden" name="actionType" value="refresh" />
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSubmitting ? "animate-spin" : ""}`} />
                    {isSubmitting ? "갱신 중..." : "토큰 갱신"}
                  </Button>
                </fetcher.Form>

                <fetcher.Form method="post">
                  <input type="hidden" name="actionType" value="disconnect" />
                  <input type="hidden" name="accountId" value={token.account_id} />
                  <Button 
                    type="submit" 
                    variant="destructive"
                    disabled={isSubmitting}
                  >
                    <Link2Off className="h-4 w-4 mr-2" />
                    {isSubmitting ? "해제 중..." : "연동 해제"}
                  </Button>
                </fetcher.Form>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                네이버 스마트스토어를 연동하면 다음 기능을 사용할 수 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>주문 데이터 자동 동기화</li>
                <li>상품 정보 조회</li>
                <li>클레임(취소/반품/교환) 관리</li>
                <li>고객 정보 조회</li>
              </ul>
              
              <fetcher.Form method="post" className="pt-4">
                <input type="hidden" name="actionType" value="connect" />
                <Button 
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {isSubmitting ? "연동 중..." : "네이버 연동 시작"}
                </Button>
              </fetcher.Form>
            </>
          )}
        </CardContent>
      </Card>

      {/* 기능 안내 카드 */}
      {isConnected && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/dashboard/integrations/naver/manage">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Store className="h-5 w-5 text-green-500" />
                  통합 관리
                </CardTitle>
                <CardDescription>
                  클레임, 정산, 주문변경 내역을 관리합니다
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/dashboard/integrations/naver/inquiries">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  문의 관리
                </CardTitle>
                <CardDescription>
                  고객 문의를 확인하고 답변합니다
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/dashboard/orders/unified">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5 text-green-500" />
                  주문 동기화
                </CardTitle>
                <CardDescription>
                  네이버 스마트스토어 주문을 대시보드로 가져옵니다
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/dashboard/products/naver">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  상품 관리
                </CardTitle>
                <CardDescription>
                  네이버 스마트스토어 상품 정보를 관리합니다
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      )}

      {/* 설정 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>연동 설정 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. 네이버 커머스API센터 설정</h4>
            <p className="text-sm text-muted-foreground">
              <a 
                href="https://apicenter.commerce.naver.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                네이버 커머스API센터
              </a>
              에서 애플리케이션을 등록하고 Client ID/Secret을 발급받으세요.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. API 호출 IP 등록</h4>
            <p className="text-sm text-muted-foreground">
              네이버 커머스 API는 등록된 IP에서만 호출 가능합니다.
              Vercel 서버 IP 대역을 등록하거나 프록시 서버를 사용해야 합니다.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">3. 환경변수 설정 (Vercel)</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code className="bg-muted px-1 py-0.5 rounded">NAVER_CLIENT_ID</code> - 애플리케이션 Client ID</li>
              <li><code className="bg-muted px-1 py-0.5 rounded">NAVER_CLIENT_SECRET</code> - 애플리케이션 Client Secret</li>
              <li><code className="bg-muted px-1 py-0.5 rounded">NAVER_ACCOUNT_ID</code> - 판매자 계정 ID (선택)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">4. 주의사항</h4>
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                네이버 커머스 API는 <strong>호출 IP 등록이 필수</strong>입니다. 
                Vercel은 서버리스 환경으로 고정 IP가 없어 프록시 서버 또는 Vercel Enterprise가 필요할 수 있습니다.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* API 문서 링크 */}
      <Card>
        <CardHeader>
          <CardTitle>참고 자료</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a 
                href="https://apicenter.commerce.naver.com/docs/introduction"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                API 문서
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a 
                href="https://apicenter.commerce.naver.com/docs/authentication"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                인증 가이드
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

