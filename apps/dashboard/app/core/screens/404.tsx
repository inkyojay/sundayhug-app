import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "../components/ui/button";

export default function NotFound() {
  const { t } = useTranslation(["errors"]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2.5">
      <h1 className="text-5xl font-semibold">{t("errors:notFound.title")}</h1>
      <h2 className="text-2xl">{t("errors:notFound.description")}</h2>
      <Button variant="outline" asChild>
        <Link to="/">{t("errors:actions.goHome")} &rarr;</Link>
      </Button>
    </div>
  );
}
