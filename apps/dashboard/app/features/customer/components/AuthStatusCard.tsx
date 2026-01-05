/**
 * 인증 상태 카드 컴포넌트 (성공/실패)
 */

import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Card, CardContent } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";

interface AuthStatusCardProps {
  status: "success" | "error";
  title: string;
  message: string;
  userName?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

export function AuthStatusCard({
  status,
  title,
  message,
  userName,
  buttonLabel,
  onButtonClick,
}: AuthStatusCardProps) {
  const isSuccess = status === "success";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              isSuccess ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {isSuccess ? (
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            ) : (
              <XCircleIcon className="h-8 w-8 text-red-600" />
            )}
          </div>
          <p className="mt-4 text-lg font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            {userName ? `${userName}님 ${message}` : message}
          </p>
          {buttonLabel && onButtonClick && (
            <Button className="mt-4" onClick={onButtonClick}>
              {buttonLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
