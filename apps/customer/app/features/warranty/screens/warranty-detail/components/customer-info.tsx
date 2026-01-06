/**
 * Customer Info Card Component
 */
import { UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import type { Warranty } from "../types";

interface CustomerInfoProps {
  warranty: Warranty;
}

export function CustomerInfo({ warranty }: CustomerInfoProps) {
  const { t } = useTranslation(["warranty", "common"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          {t("warranty:admin.warrantyDetail.customerInfo.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.customerInfo.buyerName")}</p>
          <p className="font-medium text-lg">{warranty.buyer_name || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.customerInfo.phone")}</p>
          <p className="font-medium font-mono">{warranty.customer_phone}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.customerInfo.memberName")}</p>
          <p className="font-medium">
            {warranty.customers?.name || warranty.customers?.kakao_nickname || "-"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("warranty:admin.warrantyDetail.customerInfo.email")}</p>
          <p className="font-medium">{warranty.customers?.email || "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
