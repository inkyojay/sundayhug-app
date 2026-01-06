/**
 * Sleep Analysis History Page
 *
 * Lists all past sleep analyses for the authenticated user.
 */
import type { Route } from "./+types/history";

import { Baby, Calendar, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Link, useLoaderData } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import makeServerClient from "~/core/lib/supa-client.server";

import { getRecentAnalyses } from "../queries";

type AnalysisSummary = {
  id: string;
  summary: string;
  birthDate: string;
  ageInMonths: number;
  createdAt: Date;
  imageUrl: string | null;
};

export const meta: Route.MetaFunction = () => {
  return [
    { title: `분석 이력 | ${import.meta.env.VITE_APP_NAME}` },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const analyses = await getRecentAnalyses(user.id, 20);

  return data({ analyses });
}

export default function HistoryPage() {
  const { t } = useTranslation(["sleep-analysis", "common"]);
  const { analyses } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("sleep-analysis:history.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("sleep-analysis:history.description", { defaultValue: "지금까지 분석한 수면 환경 결과입니다." })}
          </p>
        </div>
        <Button asChild>
          <Link to="/sleep">
            <Plus className="mr-2 h-4 w-4" />
            {t("sleep-analysis:result.reanalyze")}
          </Link>
        </Button>
      </header>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Baby className="text-muted-foreground mb-4 h-16 w-16" />
            <h2 className="mb-2 text-xl font-semibold">{t("sleep-analysis:history.empty")}</h2>
            <p className="text-muted-foreground mb-4 text-center">
              {t("sleep-analysis:history.startFirst")}
            </p>
            <Button asChild>
              <Link to="/sleep">{t("sleep-analysis:title")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis: AnalysisSummary) => (
            <Link key={analysis.id} to={`/sleep/result/${analysis.id}`}>
              <Card className="hover:bg-muted/50 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("sleep-analysis:history.babyAge", { months: analysis.ageInMonths, defaultValue: `생후 ${analysis.ageInMonths}개월 아기` })}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(analysis.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {analysis.summary}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

