/**
 * Baby Profile Form Component
 */
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "~/core/components/ui/button";

interface BabyProfileFormProps {
  babyName: string;
  birthDate: string;
  feedingType: string;
  onBabyNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onFeedingTypeChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function BabyProfileForm({
  babyName,
  birthDate,
  feedingType,
  onBabyNameChange,
  onBirthDateChange,
  onFeedingTypeChange,
  onSubmit,
  isSubmitting,
}: BabyProfileFormProps) {
  const { t } = useTranslation(["chat", "common"]);

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0]">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link
          to="/customer/chat"
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="font-bold text-gray-900">{t("chat:title")}</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("chat:babyProfile.title")}</h2>
            <p className="text-gray-500 text-sm">{t("chat:babyProfile.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("chat:babyProfile.name")} ({t("chat:babyProfile.nameOptional")})
              </label>
              <input
                type="text"
                value={babyName}
                onChange={(e) => onBabyNameChange(e.target.value)}
                placeholder={t("chat:babyProfile.namePlaceholder")}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("chat:babyProfile.birthDate")} *
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => onBirthDateChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("chat:babyProfile.feedingType")} ({t("chat:babyProfile.nameOptional")})
              </label>
              <select
                value={feedingType}
                onChange={(e) => onFeedingTypeChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none bg-white"
              >
                <option value="">{t("chat:babyProfile.feedingPlaceholder")}</option>
                <option value="breast">{t("chat:babyProfile.feedingOptions.breast")}</option>
                <option value="formula">{t("chat:babyProfile.feedingOptions.formula")}</option>
                <option value="mixed">{t("chat:babyProfile.feedingOptions.mixed")}</option>
              </select>
            </div>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl font-medium"
            >
              {isSubmitting ? t("chat:babyProfile.saving") : t("chat:babyProfile.submit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
