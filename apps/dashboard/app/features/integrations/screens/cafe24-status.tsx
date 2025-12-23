/**
 * Cafe24 연동 상태 페이지
 * 
 * Cafe24 API 연동 상태를 확인하고 관리합니다.
 * - 연동 상태 확인
 * - 연동 시작/해제
 * - 쇼핑몰 정보 표시
 */
import type { Route } from "./+types/cafe24-status";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Link2Off,
  RefreshCw,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Link, data, redirect, useFetcher } from "react-router";

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

import {
  type Cafe24Token,
  getCafe24Token,
  getStoreInfo,
  disconnectCafe24,
} from "../lib/cafe24.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: `Cafe24 연동 | Sundayhug Admin` }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

  // 토큰 조회
  const token = await getCafe24Token();
  
  let storeInfo = null;
  if (token) {
    // 토큰이 있으면 쇼핑몰 정보 조회
    const storeResult = await getStoreInfo();
    if (storeResult.success) {
      storeInfo = storeResult.store;
    }
  }

  return {
    isConnected: !!token,
    token: token ? {
      mall_id: token.mall_id,
      scope: token.scope,
      expires_at: token.expires_at,
      updated_at: token.updated_at,
    } : null,
    storeInfo,
    message: success === "true" ? "연동이 완료되었습니다!" : null,
    error: error || null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "disconnect") {
    const mallId = formData.get("mallId") as string;
    const result = await disconnectCafe24(mallId);
    
    if (!result.success) {
      return data({ success: false, error: result.error });
    }
    
    return data({ success: true, message: "연동이 해제되었습니다." });
  }

  return data({ success: false, error: "알 수 없는 액션" });
}

export default function Cafe24Status({ loaderData, actionData }: Route.ComponentProps) {
  const { isConnected, token, storeInfo, message, error } = loaderData;
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
            <Store className="h-6 w-6" />
            Cafe24 연동
          </h1>
          <p className="text-muted-foreground">
            Cafe24 쇼핑몰과 연동하여 주문, 상품 데이터를 동기화합니다
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
              ? "Cafe24 쇼핑몰과 연동되어 있습니다" 
              : "Cafe24 쇼핑몰과 연동되지 않았습니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && token ? (
            <>
              {/* 쇼핑몰 정보 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">쇼핑몰 ID</p>
                  <p className="font-medium">{token.mall_id}</p>
                </div>
                {storeInfo && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">쇼핑몰명</p>
                    <p className="font-medium">{storeInfo.shop_name}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">연동 권한</p>
                  <div className="flex flex-wrap gap-1">
                    {token.scope?.split(",").map((scope) => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {scope.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">토큰 만료</p>
                  <p className={`font-medium ${isTokenExpired ? "text-red-500" : ""}`}>
                    {new Date(token.expires_at).toLocaleString("ko-KR")}
                    {isTokenExpired && " (만료됨)"}
                  </p>
                </div>
              </div>

              {/* 토큰 만료 경고 */}
              {isTokenExpired && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>토큰 만료</AlertTitle>
                  <AlertDescription>
                    토큰이 만료되었습니다. 연동을 다시 해주세요.
                  </AlertDescription>
                </Alert>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button asChild variant="outline">
                  <a 
                    href={`https://${token.mall_id}.cafe24.com/admin`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Cafe24 관리자
                  </a>
                </Button>
                
                <Button asChild>
                  <Link to="/api/integrations/cafe24/auth/start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    재연동
                  </Link>
                </Button>

                <fetcher.Form method="post">
                  <input type="hidden" name="actionType" value="disconnect" />
                  <input type="hidden" name="mallId" value={token.mall_id} />
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
                Cafe24 쇼핑몰을 연동하면 다음 기능을 사용할 수 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>주문 데이터 자동 동기화</li>
                <li>상품 정보 조회</li>
                <li>재고 현황 확인</li>
                <li>고객 정보 조회</li>
              </ul>
              
              <Button asChild className="mt-4">
                <Link to="/api/integrations/cafe24/auth/start">
                  <Link2 className="h-4 w-4 mr-2" />
                  Cafe24 연동 시작
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 기능 안내 카드 */}
      {isConnected && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/dashboard/orders">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5 text-blue-500" />
                  주문 동기화
                </CardTitle>
                <CardDescription>
                  Cafe24 주문을 대시보드로 가져옵니다
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5 text-gray-400" />
                상품 동기화 (준비중)
              </CardTitle>
              <CardDescription>
                Cafe24 상품 정보를 동기화합니다
              </CardDescription>
            </CardHeader>
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
            <h4 className="font-medium mb-2">1. Cafe24 개발자센터 설정</h4>
            <p className="text-sm text-muted-foreground">
              <a 
                href="https://developers.cafe24.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Cafe24 개발자센터
              </a>
              에서 앱을 등록하고 Client ID/Secret을 발급받으세요.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. Redirect URI 등록</h4>
            <code className="block p-2 bg-muted rounded text-sm">
              https://sundayhug-app-dashboard.vercel.app/api/integrations/cafe24/auth/callback
            </code>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">3. 필요한 권한 스코프</h4>
            <div className="flex flex-wrap gap-1">
              {["mall.read_store", "mall.read_order", "mall.read_product", "mall.read_category", "mall.read_customer"].map((scope) => (
                <Badge key={scope} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">4. 환경변수 설정 (Vercel)</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code>CAFE24_CLIENT_ID</code> - 앱 Client ID</li>
              <li><code>CAFE24_CLIENT_SECRET</code> - 앱 Client Secret</li>
              <li><code>CAFE24_MALL_ID</code> - 쇼핑몰 ID (예: sundayhugkr)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

