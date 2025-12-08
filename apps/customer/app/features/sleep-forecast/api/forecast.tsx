/**
 * 수면 예보 API 엔드포인트
 * POST /api/sleep-forecast
 */
import type { Route } from "./+types/forecast";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import { calcSleepForecast, calculateMonthsOld } from "../lib/forecast.server";
import { fetchWeather } from "../lib/weather.server";
import type { BabyProfile, TodayStatus, ForecastResponse } from "../lib/types";

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data<ForecastResponse>({
      success: false,
      error: "로그인이 필요합니다.",
      code: "UNAUTHORIZED",
    }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    
    // 입력값 파싱
    const babyId = formData.get("babyId") as string | null;
    const napLevel = formData.get("napLevel") as "low" | "normal" | "high";
    const outing = formData.get("outing") === "true";
    const mood = formData.get("mood") as "good" | "normal" | "bad";
    const specialIssue = formData.get("specialIssue") as "vaccine" | "cold" | "teething" | "none";
    const lat = formData.get("lat") ? Number(formData.get("lat")) : undefined;
    const lon = formData.get("lon") ? Number(formData.get("lon")) : undefined;

    // 유효성 검사
    if (!napLevel || !mood || !specialIssue) {
      return data<ForecastResponse>({
        success: false,
        error: "필수 입력값이 누락되었습니다.",
        code: "INVALID_INPUT",
      }, { status: 400 });
    }

    // 아기 프로필 조회
    let babyQuery = supabase
      .from("baby_profiles")
      .select("*")
      .eq("user_id", user.id);

    if (babyId) {
      babyQuery = babyQuery.eq("id", babyId);
    }

    const { data: babyData, error: babyError } = await babyQuery.single();

    if (babyError || !babyData) {
      return data<ForecastResponse>({
        success: false,
        error: "아기 프로필을 찾을 수 없습니다. 먼저 아기 정보를 등록해주세요.",
        code: "BABY_NOT_FOUND",
      }, { status: 404 });
    }

    // BabyProfile 타입으로 변환
    const baby: BabyProfile = {
      id: babyData.id,
      name: babyData.name,
      birthDate: babyData.birth_date,
      sleepSensitivity: babyData.sleep_sensitivity || "normal",
    };

    // 오늘 날짜
    const today = new Date().toISOString().split("T")[0];

    // TodayStatus 구성
    const todayStatus: TodayStatus = {
      date: today,
      napLevel,
      outing,
      mood,
      specialIssue,
    };

    // 날씨 데이터 가져오기
    const weather = await fetchWeather(lat, lon);

    // 예보 계산
    const forecast = calcSleepForecast(baby, todayStatus, weather);

    // 입력값 전체를 JSON으로 저장
    const inputJson = {
      baby: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate,
        sleepSensitivity: baby.sleepSensitivity,
      },
      today: todayStatus,
      weather,
    };

    // DB에 로그 저장
    const { error: logError } = await supabase
      .from("forecast_logs")
      .insert({
        user_id: user.id,
        baby_id: baby.id,
        date: today,
        input_json: inputJson,
        score: forecast.score,
        level: forecast.level,
        reasons: forecast.reasons,
        actions: forecast.actions,
        weather_temp: weather.temp,
        weather_humidity: weather.humidity,
        weather_pressure: weather.pressure,
      });

    if (logError) {
      console.error("예보 로그 저장 실패:", logError);
      // 로그 저장 실패해도 예보는 반환
    }

    const monthsOld = calculateMonthsOld(baby.birthDate);

    return data<ForecastResponse>({
      success: true,
      forecast,
      baby: {
        id: baby.id,
        name: baby.name,
        monthsOld,
      },
    });

  } catch (error) {
    console.error("수면 예보 오류:", error);
    return data<ForecastResponse>({
      success: false,
      error: "예보 생성 중 오류가 발생했습니다.",
      code: "INTERNAL_ERROR",
    }, { status: 500 });
  }
}

// GET: 오늘의 예보 조회 (이미 생성된 경우)
export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // 오늘의 예보가 이미 있는지 확인
  const { data: existingForecast } = await supabase
    .from("forecast_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingForecast) {
    // 아기 정보 조회
    const { data: babyData } = await supabase
      .from("baby_profiles")
      .select("id, name, birth_date")
      .eq("id", existingForecast.baby_id)
      .single();

    const monthsOld = babyData?.birth_date 
      ? calculateMonthsOld(babyData.birth_date)
      : 0;

    return data({
      success: true,
      hasExisting: true,
      forecast: {
        date: existingForecast.date,
        score: existingForecast.score,
        level: existingForecast.level,
        reasons: existingForecast.reasons,
        actions: existingForecast.actions,
        weather: {
          temp: existingForecast.weather_temp,
          humidity: existingForecast.weather_humidity,
          pressure: existingForecast.weather_pressure,
        },
      },
      baby: {
        id: babyData?.id,
        name: babyData?.name,
        monthsOld,
      },
    });
  }

  // 아기 프로필 존재 여부 확인
  const { data: babyProfile } = await supabase
    .from("baby_profiles")
    .select("id, name, birth_date, sleep_sensitivity")
    .eq("user_id", user.id)
    .single();

  return data({
    success: true,
    hasExisting: false,
    babyProfile: babyProfile ? {
      id: babyProfile.id,
      name: babyProfile.name,
      birthDate: babyProfile.birth_date,
      sleepSensitivity: babyProfile.sleep_sensitivity || "normal",
      monthsOld: calculateMonthsOld(babyProfile.birth_date),
    } : null,
  });
}

