/**
 * 성공 카드 컴포넌트
 */

import { CheckCircleIcon } from "lucide-react";
import { Card, CardContent } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";

interface SuccessCardAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline";
}

interface SuccessCardProps {
  title: string;
  message: string;
  actions?: SuccessCardAction[];
}

export function SuccessCard({ title, message, actions }: SuccessCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-4 whitespace-pre-line">
            {message}
          </p>
          {actions && actions.length > 0 && (
            <div className="space-y-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  className="w-full"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
