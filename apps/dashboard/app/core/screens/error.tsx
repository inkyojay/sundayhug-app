import type { Route } from "./+types/error";

import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { Button } from "~/core/components/ui/button";

export const meta: Route.MetaFunction = () => {
  return [
    {
      title: `Server Error | ${import.meta.env.VITE_APP_NAME}`,
    },
  ];
};

export default function ErrorPage() {
  const { t } = useTranslation(["errors"]);
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-semibold text-red-700">{t("errors:error.title")}</h1>
      <p className="text-muted-foreground">{t("errors:error.errorCode")}: {errorCode}</p>
      <p className="text-muted-foreground">{errorDescription}</p>
      <Button variant={"link"} asChild>
        <Link to="/">{t("errors:actions.goHome")} &rarr;</Link>
      </Button>
    </div>
  );
}
