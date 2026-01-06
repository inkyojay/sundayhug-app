/**
 * i18n 설정 서버 함수
 *
 * 지원 언어, 국가, 국가별 기능 플래그 관리
 */
import makeServerClient from "~/core/lib/supa-client.server";

// 지원 언어 타입
export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
  direction: "ltr" | "rtl";
  enabled: boolean;
  sort_order: number;
}

// 국가 타입
export interface Country {
  code: string;
  name: string;
  native_name: string;
  default_language: string;
  timezone: string;
  currency_code: string;
  enabled: boolean;
}

// 국가별 기능 플래그 타입
export interface CountryFeatureFlag {
  id: string;
  feature_flag_id: string;
  country_code: string;
  enabled: boolean;
  config: Record<string, unknown>;
  feature_flag?: {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  };
  country?: Country;
}

/**
 * 지원 언어 목록 조회
 */
export async function getSupportedLanguages(request: Request): Promise<SupportedLanguage[]> {
  const [supabase] = makeServerClient(request);

  const { data, error } = await supabase
    .from("supported_languages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch supported languages:", error);
    return [];
  }

  return data || [];
}

/**
 * 국가 목록 조회
 */
export async function getCountries(request: Request): Promise<Country[]> {
  const [supabase] = makeServerClient(request);

  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch countries:", error);
    return [];
  }

  return data || [];
}

/**
 * 기능 플래그 목록 조회
 */
export async function getFeatureFlags(request: Request) {
  const [supabase] = makeServerClient(request);

  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch feature flags:", error);
    return [];
  }

  return data || [];
}

/**
 * 국가별 기능 플래그 목록 조회
 */
export async function getCountryFeatureFlags(request: Request): Promise<CountryFeatureFlag[]> {
  const [supabase] = makeServerClient(request);

  const { data, error } = await supabase
    .from("country_feature_flags")
    .select(`
      *,
      feature_flag:feature_flags(*),
      country:countries(*)
    `)
    .order("country_code", { ascending: true });

  if (error) {
    console.error("Failed to fetch country feature flags:", error);
    return [];
  }

  return data || [];
}

/**
 * 언어 활성화/비활성화
 */
export async function toggleLanguage(request: Request, code: string, enabled: boolean) {
  const [supabase] = makeServerClient(request);

  const { error } = await supabase
    .from("supported_languages")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("code", code);

  if (error) {
    console.error("Failed to toggle language:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 국가 활성화/비활성화
 */
export async function toggleCountry(request: Request, code: string, enabled: boolean) {
  const [supabase] = makeServerClient(request);

  const { error } = await supabase
    .from("countries")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("code", code);

  if (error) {
    console.error("Failed to toggle country:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 국가별 기능 플래그 토글
 */
export async function toggleCountryFeature(
  request: Request,
  featureFlagId: string,
  countryCode: string,
  enabled: boolean
) {
  const [supabase] = makeServerClient(request);

  // 기존 레코드 확인
  const { data: existing } = await supabase
    .from("country_feature_flags")
    .select("id")
    .eq("feature_flag_id", featureFlagId)
    .eq("country_code", countryCode)
    .single();

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from("country_feature_flags")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update country feature flag:", error);
      return { success: false, error: error.message };
    }
  } else {
    // 새로 생성
    const { error } = await supabase
      .from("country_feature_flags")
      .insert({
        feature_flag_id: featureFlagId,
        country_code: countryCode,
        enabled,
      });

    if (error) {
      console.error("Failed to create country feature flag:", error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}
