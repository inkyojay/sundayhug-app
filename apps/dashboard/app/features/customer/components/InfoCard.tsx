/**
 * 안내 정보 카드 컴포넌트
 */

import { Card, CardContent } from "~/core/components/ui/card";

interface InfoCardProps {
  title?: string;
  items: string[];
}

export function InfoCard({ title = "안내 사항", items }: InfoCardProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">{title}</p>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
