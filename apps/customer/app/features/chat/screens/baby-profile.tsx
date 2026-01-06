/**
 * 아기 프로필 등록/수정
 * 
 * 월령에 따라 다른 정보 수집:
 * - 12개월 미만: 수유 방식
 * - 24개월 미만: 성별, 수면 민감도
 */
import type { Route } from "./+types/baby-profile";

import { Link, useLoaderData, useNavigate, data, Form, useActionData } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Baby, Calendar, Milk, Moon, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "아기 정보 | 썬데이허그" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ profile: null, isEdit: false });
  }

  // URL에서 id 파라미터 확인 (수정 모드)
  const url = new URL(request.url);
  const profileId = url.searchParams.get("id");

  if (profileId) {
    // 특정 아이 프로필 수정
    const { data: profile } = await supabase
      .from("baby_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("user_id", user.id)
      .single();

    return data({ profile, isEdit: true });
  }

  // 새 아이 등록 (기존 프로필 없음)
  return data({ profile: null, isEdit: false });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const profileId = formData.get("profileId") as string; // 수정 모드일 때
  const name = formData.get("name") as string;
  const birthDate = formData.get("birthDate") as string;
  const feedingType = formData.get("feedingType") as string;
  const gender = formData.get("gender") as string;
  const sleepSensitivity = formData.get("sleepSensitivity") as string;
  const notes = formData.get("notes") as string;

  // 필수값 검증
  if (!name || name.trim().length < 1) {
    return data({ error: "아기 이름 또는 별명을 입력해주세요." });
  }

  if (!birthDate) {
    return data({ error: "생년월일은 필수입니다." });
  }

  const profileData = {
    user_id: user.id,
    name: name.trim(),
    birth_date: birthDate,
    feeding_type: feedingType || null,
    gender: gender || null,
    sleep_sensitivity: sleepSensitivity || "normal",
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (profileId) {
    // 기존 프로필 업데이트
    const { error } = await supabase
      .from("baby_profiles")
      .update(profileData)
      .eq("id", profileId)
      .eq("user_id", user.id);

    if (error) {
      return data({ error: "저장에 실패했습니다." });
    }
  } else {
    // 새로 생성
    const { error } = await supabase
      .from("baby_profiles")
      .insert(profileData);

    if (error) {
      return data({ error: "저장에 실패했습니다." });
    }
  }

  return data({ success: true });
}

// 월령 계산 함수
function calculateAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months += today.getMonth() - birth.getMonth();
  
  // 일자 보정
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  
  return Math.max(0, months);
}

export default function BabyProfileScreen() {
  const { t } = useTranslation(["chat", "common"]);
  const { profile, isEdit } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();

  // 생년월일 상태 관리
  const [birthDate, setBirthDate] = useState<string>(
    profile?.birth_date ? new Date(profile.birth_date).toISOString().split("T")[0] : ""
  );

  // 월령 계산
  const ageInMonths = birthDate ? calculateAgeInMonths(birthDate) : null;
  const isUnder12Months = ageInMonths !== null && ageInMonths < 12;
  const isUnder24Months = ageInMonths !== null && ageInMonths < 24;

  useEffect(() => {
    if (actionData?.success) {
      navigate("/customer/chat");
    }
  }, [actionData, navigate]);

  // 월령 표시 텍스트
  const getAgeText = () => {
    if (ageInMonths === null) return "";
    if (ageInMonths < 1) return "신생아";
    if (ageInMonths < 12) return `${ageInMonths}개월`;
    const years = Math.floor(ageInMonths / 12);
    const remainingMonths = ageInMonths % 12;
    if (remainingMonths === 0) return `${years}살`;
    return `${years}살 ${remainingMonths}개월`;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212]">
      <div className="mx-auto max-w-lg px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/customer/chat"
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("chat:babyProfile.title")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("chat:babyProfile.subtitle")}</p>
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
            <Baby className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Form */}
        <Form method="post" className="space-y-5">
          {/* 수정 모드일 때 profileId 전송 */}
          {profile?.id && (
            <input type="hidden" name="profileId" value={profile.id} />
          )}
          
          {actionData?.error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {actionData.error}
            </div>
          )}

          {/* 이름 (필수) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <Label htmlFor="name" className="text-gray-700 dark:text-gray-200 font-medium mb-2 block">
              {t("chat:babyProfile.name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={profile?.name || ""}
              placeholder={t("chat:babyProfile.namePlaceholder")}
              className="bg-gray-50 dark:bg-gray-900 border-0"
            />
          </div>

          {/* 생년월일 (필수) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <Label htmlFor="birthDate" className="text-gray-700 dark:text-gray-200 font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF6B35]" />
              {t("chat:babyProfile.birthDate")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="bg-gray-50 dark:bg-gray-900 border-0"
            />
            {ageInMonths !== null && (
              <p className="text-sm text-[#FF6B35] font-medium mt-2">
                현재 {getAgeText()}
              </p>
            )}
          </div>

          {/* 성별 (24개월 미만) */}
          {birthDate && isUnder24Months ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-gray-700 dark:text-gray-200 font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-[#FF6B35]" />
                {t("common:gender")}
              </Label>
              <select
                name="gender"
                defaultValue={profile?.gender || ""}
                className="w-full h-10 px-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="">{t("chat:babyProfile.feedingPlaceholder")}</option>
                <option value="male">{t("common:male")}</option>
                <option value="female">{t("common:female")}</option>
              </select>
              <p className="text-xs text-gray-400 mt-2">{t("common:genderDescription")}</p>
            </div>
          ) : null}

          {/* 수유 방식 (12개월 미만만) */}
          {birthDate && isUnder12Months ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-gray-700 dark:text-gray-200 font-medium mb-2 flex items-center gap-2">
                <Milk className="w-4 h-4 text-[#FF6B35]" />
                {t("chat:babyProfile.feedingType")}
              </Label>
              <select
                name="feedingType"
                defaultValue={profile?.feeding_type || ""}
                className="w-full h-10 px-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="">{t("chat:babyProfile.feedingPlaceholder")}</option>
                <option value="breast">{t("chat:babyProfile.feedingOptions.breast")}</option>
                <option value="formula">{t("chat:babyProfile.feedingOptions.formula")}</option>
                <option value="mixed">{t("chat:babyProfile.feedingOptions.mixed")}</option>
              </select>
              <p className="text-xs text-gray-400 mt-2">{t("common:feedingDescription")}</p>
            </div>
          ) : null}

          {/* 수면 민감도 (24개월 미만) */}
          {birthDate && isUnder24Months ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-gray-700 dark:text-gray-200 font-medium mb-2 flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#FF6B35]" />
                {t("common:sleepSensitivity")}
              </Label>
              <select
                name="sleepSensitivity"
                defaultValue={profile?.sleep_sensitivity || "normal"}
                className="w-full h-10 px-3 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="high">{t("common:sleepSensitivityHigh")}</option>
                <option value="normal">{t("common:sleepSensitivityNormal")}</option>
                <option value="low">{t("common:sleepSensitivityLow")}</option>
              </select>
              <p className="text-xs text-gray-400 mt-2">{t("common:sleepSensitivityDescription")}</p>
            </div>
          ) : null}

          {/* 메모 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
            <Label htmlFor="notes" className="text-gray-700 dark:text-gray-200 font-medium mb-2 block">
              {t("common:notes")}
            </Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={profile?.notes || ""}
              placeholder={t("common:notesPlaceholder")}
              className="bg-gray-50 dark:bg-gray-900 border-0 resize-none"
              rows={3}
            />
          </div>

          {/* 저장 버튼 */}
          <Button
            type="submit"
            className="w-full h-14 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-lg font-medium rounded-2xl"
          >
            {profile ? t("common:edit") : t("chat:babyProfile.submit")}
          </Button>
        </Form>
      </div>
    </div>
  );
}
