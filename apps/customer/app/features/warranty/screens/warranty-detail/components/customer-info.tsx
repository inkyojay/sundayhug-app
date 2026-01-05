/**
 * Customer Info Card Component
 */
import { UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import type { Warranty } from "../types";

interface CustomerInfoProps {
  warranty: Warranty;
}

export function CustomerInfo({ warranty }: CustomerInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          고객 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">구매자명</p>
          <p className="font-medium text-lg">{warranty.buyer_name || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">연락처</p>
          <p className="font-medium font-mono">{warranty.customer_phone}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">회원명</p>
          <p className="font-medium">
            {warranty.customers?.name || warranty.customers?.kakao_nickname || "-"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">이메일</p>
          <p className="font-medium">{warranty.customers?.email || "-"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
