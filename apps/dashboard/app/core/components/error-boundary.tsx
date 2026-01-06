/**
 * 에러 바운더리 컴포넌트
 */
import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  let title = "오류가 발생했습니다";
  let description = "예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    switch (error.status) {
      case 404:
        title = "페이지를 찾을 수 없습니다";
        description = "요청하신 페이지가 존재하지 않거나 삭제되었습니다.";
        break;
      case 401:
        title = "인증이 필요합니다";
        description = "이 페이지에 접근하려면 로그인이 필요합니다.";
        break;
      case 403:
        title = "접근 권한이 없습니다";
        description = "이 페이지에 접근할 권한이 없습니다.";
        break;
      default:
        description = error.data?.message || description;
    }
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">
            {statusCode && <span className="text-muted-foreground mr-2">{statusCode}</span>}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              홈으로
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
