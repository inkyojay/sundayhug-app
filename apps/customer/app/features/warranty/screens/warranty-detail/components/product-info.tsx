/**
 * Product Info Card Component
 */
import { PackageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import type { Warranty } from "../types";

interface ProductInfoProps {
  warranty: Warranty;
}

export function ProductInfo({ warranty }: ProductInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5" />
          제품 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">제품명</p>
          <p className="font-medium">{warranty.product_name || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">옵션</p>
          <p className="font-medium">{warranty.product_option || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">SKU</p>
          <p className="font-medium font-mono text-xs">{warranty.product_sku || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">판매채널</p>
          <p className="font-medium">{warranty.sales_channel || "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
