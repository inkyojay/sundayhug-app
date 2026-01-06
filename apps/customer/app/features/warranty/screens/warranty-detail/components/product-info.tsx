/**
 * Product Info Card Component
 */
import { PackageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import type { Warranty } from "../types";

interface ProductInfoProps {
  warranty: Warranty;
}

export function ProductInfo({ warranty }: ProductInfoProps) {
  const { t } = useTranslation(["warranty", "common"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5" />
          {t("warranty:admin.warrantyDetail.productInfo.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.productInfo.productName")}</p>
          <p className="font-medium">{warranty.product_name || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.productInfo.option")}</p>
          <p className="font-medium">{warranty.product_option || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.productInfo.sku")}</p>
          <p className="font-medium font-mono text-xs">{warranty.product_sku || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.productInfo.salesChannel")}</p>
          <p className="font-medium">{warranty.sales_channel || "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
