/**
 * Welcome Message Component
 */
import { useTranslation } from "react-i18next";
import { Bot } from "lucide-react";
import type { BabyProfile } from "../types";

interface WelcomeMessageProps {
  babyProfile: BabyProfile | null;
  babyMonths: number | null;
  onSuggestionClick: (suggestion: string) => void;
}

export function WelcomeMessage({ babyProfile, babyMonths, onSuggestionClick }: WelcomeMessageProps) {
  const { t } = useTranslation(["chat", "common"]);

  const suggestions = t("chat:room.welcome.suggestions", { returnObjects: true }) as string[];

  return (
    <div className="mb-6">
      <div className="flex gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm">
            <p className="text-gray-800">
              {t("chat:room.welcome.greeting")}
              {babyProfile && (
                <>
                  <br />
                  <br />
                  {t("chat:room.welcome.withBaby", {
                    name: babyProfile.name || t("common:baby"),
                    months: babyMonths,
                  })}
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.isArray(suggestions) && suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="text-sm px-3 py-1.5 bg-orange-50 text-[#FF6B35] rounded-full hover:bg-orange-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
