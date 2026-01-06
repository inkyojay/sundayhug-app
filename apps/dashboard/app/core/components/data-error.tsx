/**
 * 데이터 로딩 실패 시 표시할 컴포넌트
 */
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";

interface DataErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function DataError({
  title = "데이터를 불러올 수 없습니다",
  description = "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  onRetry,
}: DataErrorProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-destructive" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
