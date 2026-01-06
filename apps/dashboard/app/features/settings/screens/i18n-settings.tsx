/**
 * 다국어/국가 설정 페이지
 *
 * - 지원 언어 관리
 * - 국가 관리
 * - 국가별 기능 플래그 관리
 */
import type { Route } from "./+types/i18n-settings";

import {
  Check,
  Globe,
  Languages,
  MapPin,
  Settings2,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { data, useFetcher } from "react-router";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Switch } from "~/core/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/core/components/ui/tabs";

import {
  getCountries,
  getCountryFeatureFlags,
  getFeatureFlags,
  getSupportedLanguages,
  toggleCountry,
  toggleCountryFeature,
  toggleLanguage,
} from "../lib/i18n.server";

export const meta: Route.MetaFunction = () => {
  return [{ title: "다국어/국가 설정 | Sundayhug Admin" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [languages, countries, featureFlags, countryFeatureFlags] = await Promise.all([
    getSupportedLanguages(request),
    getCountries(request),
    getFeatureFlags(request),
    getCountryFeatureFlags(request),
  ]);

  return {
    languages,
    countries,
    featureFlags,
    countryFeatureFlags,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "toggleLanguage") {
    const code = formData.get("code") as string;
    const enabled = formData.get("enabled") === "true";
    const result = await toggleLanguage(request, code, enabled);
    return data(result);
  }

  if (actionType === "toggleCountry") {
    const code = formData.get("code") as string;
    const enabled = formData.get("enabled") === "true";
    const result = await toggleCountry(request, code, enabled);
    return data(result);
  }

  if (actionType === "toggleCountryFeature") {
    const featureFlagId = formData.get("featureFlagId") as string;
    const countryCode = formData.get("countryCode") as string;
    const enabled = formData.get("enabled") === "true";
    const result = await toggleCountryFeature(request, featureFlagId, countryCode, enabled);
    return data(result);
  }

  return data({ success: false, error: "알 수 없는 액션" });
}

export default function I18nSettings({ loaderData }: Route.ComponentProps) {
  const { languages, countries, featureFlags, countryFeatureFlags } = loaderData;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6" />
            다국어/국가 설정
          </h1>
          <p className="text-muted-foreground">
            지원 언어, 국가, 국가별 기능을 관리합니다.
          </p>
        </div>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="languages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            지원 언어
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            국가
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            국가별 기능
          </TabsTrigger>
        </TabsList>

        {/* 지원 언어 탭 */}
        <TabsContent value="languages">
          <LanguagesTab languages={languages} />
        </TabsContent>

        {/* 국가 탭 */}
        <TabsContent value="countries">
          <CountriesTab countries={countries} />
        </TabsContent>

        {/* 국가별 기능 탭 */}
        <TabsContent value="features">
          <CountryFeaturesTab
            countries={countries}
            featureFlags={featureFlags}
            countryFeatureFlags={countryFeatureFlags}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 언어 탭 컴포넌트
function LanguagesTab({ languages }: { languages: Route.ComponentProps["loaderData"]["languages"] }) {
  const fetcher = useFetcher();

  const handleToggle = (code: string, currentEnabled: boolean) => {
    fetcher.submit(
      {
        actionType: "toggleLanguage",
        code,
        enabled: (!currentEnabled).toString(),
      },
      { method: "post" }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>지원 언어 목록</CardTitle>
        <CardDescription>
          Customer 앱에서 지원하는 언어를 관리합니다. 비활성화된 언어는 사용자에게 표시되지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>언어명</TableHead>
              <TableHead>현지어명</TableHead>
              <TableHead>방향</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">활성화</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {languages.map((lang) => (
              <TableRow key={lang.code}>
                <TableCell className="font-mono">{lang.code}</TableCell>
                <TableCell>{lang.name}</TableCell>
                <TableCell>{lang.native_name}</TableCell>
                <TableCell>
                  <Badge variant={lang.direction === "rtl" ? "destructive" : "secondary"}>
                    {lang.direction.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {lang.enabled ? (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      활성
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      비활성
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={lang.enabled}
                    onCheckedChange={() => handleToggle(lang.code, lang.enabled)}
                    disabled={fetcher.state !== "idle" || lang.code === "ko"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground mt-4">
          * 한국어(ko)는 기본 언어로 비활성화할 수 없습니다.
        </p>
      </CardContent>
    </Card>
  );
}

// 국가 탭 컴포넌트
function CountriesTab({ countries }: { countries: Route.ComponentProps["loaderData"]["countries"] }) {
  const fetcher = useFetcher();

  const handleToggle = (code: string, currentEnabled: boolean) => {
    fetcher.submit(
      {
        actionType: "toggleCountry",
        code,
        enabled: (!currentEnabled).toString(),
      },
      { method: "post" }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>국가 목록</CardTitle>
        <CardDescription>
          서비스 제공 국가를 관리합니다. 비활성화된 국가에서는 서비스에 접근할 수 없습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>국가명</TableHead>
              <TableHead>현지어명</TableHead>
              <TableHead>기본 언어</TableHead>
              <TableHead>통화</TableHead>
              <TableHead>시간대</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">활성화</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.map((country) => (
              <TableRow key={country.code}>
                <TableCell className="font-mono">{country.code}</TableCell>
                <TableCell>{country.name}</TableCell>
                <TableCell>{country.native_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{country.default_language}</Badge>
                </TableCell>
                <TableCell className="font-mono">{country.currency_code}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {country.timezone}
                </TableCell>
                <TableCell className="text-center">
                  {country.enabled ? (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      활성
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      비활성
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={country.enabled}
                    onCheckedChange={() => handleToggle(country.code, country.enabled)}
                    disabled={fetcher.state !== "idle" || country.code === "KR"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground mt-4">
          * 대한민국(KR)은 기본 국가로 비활성화할 수 없습니다.
        </p>
      </CardContent>
    </Card>
  );
}

// 국가별 기능 탭 컴포넌트
function CountryFeaturesTab({
  countries,
  featureFlags,
  countryFeatureFlags,
}: {
  countries: Route.ComponentProps["loaderData"]["countries"];
  featureFlags: Route.ComponentProps["loaderData"]["featureFlags"];
  countryFeatureFlags: Route.ComponentProps["loaderData"]["countryFeatureFlags"];
}) {
  const fetcher = useFetcher();

  // 국가별 기능 상태 맵 생성
  const featureMap = new Map<string, boolean>();
  countryFeatureFlags.forEach((cf) => {
    featureMap.set(`${cf.feature_flag_id}-${cf.country_code}`, cf.enabled);
  });

  const isFeatureEnabled = (featureFlagId: string, countryCode: string) => {
    const key = `${featureFlagId}-${countryCode}`;
    // 명시적으로 설정된 값이 있으면 사용, 없으면 기본값 true
    return featureMap.has(key) ? featureMap.get(key) : true;
  };

  const handleToggle = (featureFlagId: string, countryCode: string, currentEnabled: boolean) => {
    fetcher.submit(
      {
        actionType: "toggleCountryFeature",
        featureFlagId,
        countryCode,
        enabled: (!currentEnabled).toString(),
      },
      { method: "post" }
    );
  };

  const enabledCountries = countries.filter((c) => c.enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle>국가별 기능 설정</CardTitle>
        <CardDescription>
          국가별로 특정 기능을 활성화/비활성화합니다. 예: 특정 국가에서만 결제 기능 활성화
        </CardDescription>
      </CardHeader>
      <CardContent>
        {featureFlags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>등록된 기능 플래그가 없습니다.</p>
            <p className="text-sm">feature_flags 테이블에 기능을 추가해주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">기능</TableHead>
                  {enabledCountries.map((country) => (
                    <TableHead key={country.code} className="text-center min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{getCountryFlag(country.code)}</span>
                        <span className="text-xs">{country.code}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureFlags.map((feature) => (
                  <TableRow key={feature.id}>
                    <TableCell className="sticky left-0 bg-background">
                      <div>
                        <p className="font-medium">{feature.name}</p>
                        {feature.description && (
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        )}
                      </div>
                    </TableCell>
                    {enabledCountries.map((country) => {
                      const enabled = isFeatureEnabled(feature.id, country.code);
                      return (
                        <TableCell key={country.code} className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(feature.id, country.code, enabled ?? true)}
                            disabled={fetcher.state !== "idle"}
                          >
                            {enabled ? (
                              <ToggleRight className="h-6 w-6 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 국가 코드 -> 이모지 플래그 변환
function getCountryFlag(countryCode: string): string {
  const flagMap: Record<string, string> = {
    KR: "🇰🇷",
    JP: "🇯🇵",
    VN: "🇻🇳",
    TW: "🇹🇼",
    CN: "🇨🇳",
    SA: "🇸🇦",
    US: "🇺🇸",
    GB: "🇬🇧",
  };
  return flagMap[countryCode] || "🏳️";
}
