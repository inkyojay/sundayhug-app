/**
 * 빈 상태 카드 컴포넌트
 */

import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";

interface EmptyStateCardProps {
  icon: LucideIcon;
  message: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

export function EmptyStateCard({
  icon: Icon,
  message,
  buttonLabel,
  onButtonClick,
}: EmptyStateCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{message}</p>
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
