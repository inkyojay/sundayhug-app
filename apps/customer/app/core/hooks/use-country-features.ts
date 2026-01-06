/**
 * 국가별 기능 관리 훅
 */
import { useEffect, useState } from "react";
import { useRouteLoaderData } from "react-router";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

interface CountryFeatures {
  isLoading: boolean;
  features: Record<string, FeatureFlag>;
  isFeatureEnabled: (featureKey: string) => boolean;
  getFeatureConfig: <T = Record<string, unknown>>(featureKey: string) => T | null;
}

/**
 * 국가별 기능 플래그 관리 훅
 *
 * @param countryCode - ISO 3166-1 alpha-2 국가 코드 (예: 'KR', 'JP')
 * @returns 기능 플래그 상태 및 헬퍼 함수
 */
export function useCountryFeatures(countryCode?: string): CountryFeatures {
  const [isLoading, setIsLoading] = useState(true);
  const [features, setFeatures] = useState<Record<string, FeatureFlag>>({});

  // root loader에서 locale 가져오기
  const rootData = useRouteLoaderData("root") as { locale?: string } | undefined;
  const locale = rootData?.locale ?? "ko";

  // locale에서 국가 코드 추출 (ko -> KR, en -> US, ja -> JP 등)
  const detectedCountry = countryCode ?? getCountryFromLocale(locale);

  useEffect(() => {
    async function loadFeatures() {
      try {
        setIsLoading(true);
        // TODO: API에서 국가별 기능 플래그 로드
        // const response = await fetch(`/api/features/${detectedCountry}`);
        // const data = await response.json();
        // setFeatures(data.features);

        // 임시: 모든 기능 활성화
        setFeatures({
          "sleep-analysis": { key: "sleep-analysis", enabled: true },
          warranty: { key: "warranty", enabled: true },
          chat: { key: "chat", enabled: true },
          blog: { key: "blog", enabled: true },
          payments: { key: "payments", enabled: true },
        });
      } catch (error) {
        console.error("Failed to load country features:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFeatures();
  }, [detectedCountry]);

  const isFeatureEnabled = (featureKey: string): boolean => {
    return features[featureKey]?.enabled ?? false;
  };

  const getFeatureConfig = <T = Record<string, unknown>>(
    featureKey: string
  ): T | null => {
    return (features[featureKey]?.config as T) ?? null;
  };

  return {
    isLoading,
    features,
    isFeatureEnabled,
    getFeatureConfig,
  };
}

/**
 * locale에서 국가 코드 추출
 */
function getCountryFromLocale(locale: string): string {
  const localeToCountry: Record<string, string> = {
    ko: "KR",
    en: "US",
    ja: "JP",
    vi: "VN",
    "zh-TW": "TW",
    "zh-CN": "CN",
    ar: "SA",
  };

  return localeToCountry[locale] ?? "KR";
}

export default useCountryFeatures;
