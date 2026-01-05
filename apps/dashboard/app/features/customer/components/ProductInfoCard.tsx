/**
 * 제품 정보 카드 컴포넌트
 */

import { Card, CardContent } from "~/core/components/ui/card";

interface ProductInfoCardProps {
  productName: string;
  productOption?: string | null;
  warrantyNumber?: string;
}

export function ProductInfoCard({
  productName,
  productOption,
  warrantyNumber,
}: ProductInfoCardProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">신청 제품</p>
        <p className="font-medium">{productName}</p>
        {productOption && (
          <p className="text-sm text-muted-foreground">{productOption}</p>
        )}
        {warrantyNumber && (
          <p className="text-xs text-muted-foreground mt-1">
            보증서: {warrantyNumber}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
