/**
 * Admin Actions Card Component
 */
import { CheckCircleIcon, XCircleIcon, Loader2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import { Button } from "~/core/components/ui/button";
import type { Warranty } from "../types";

interface AdminActionsProps {
  warranty: Warranty;
  isSubmitting: boolean;
  onRejectClick: () => void;
}

export function AdminActions({ warranty, isSubmitting, onRejectClick }: AdminActionsProps) {
  const { t } = useTranslation(["warranty", "common"]);
  const fetcher = useFetcher();

  if (warranty.status !== "pending") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("warranty:admin.warrantyDetail.adminActions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <fetcher.Form method="POST">
          <input type="hidden" name="action" value="approve" />
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 mr-2" />
            )}
            {t("warranty:admin.warrantyDetail.adminActions.approve")}
          </Button>
        </fetcher.Form>
        <Button
          variant="destructive"
          className="w-full"
          onClick={onRejectClick}
          disabled={isSubmitting}
        >
          <XCircleIcon className="h-4 w-4 mr-2" />
          {t("warranty:admin.warrantyDetail.adminActions.reject")}
        </Button>
      </CardContent>
    </Card>
  );
}
