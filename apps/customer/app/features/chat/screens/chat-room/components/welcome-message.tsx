/**
 * Welcome Message Component
 */
import { Bot } from "lucide-react";
import type { BabyProfile } from "../types";

interface WelcomeMessageProps {
  babyProfile: BabyProfile | null;
  babyMonths: number | null;
  onSuggestionClick: (suggestion: string) => void;
}

const SUGGESTIONS = ["밤에 자주 깨요", "이유식 시작 시기", "수면 교육 방법"];

export function WelcomeMessage({ babyProfile, babyMonths, onSuggestionClick }: WelcomeMessageProps) {
  return (
    <div className="mb-6">
      <div className="flex gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm">
            <p className="text-gray-800">
              안녕하세요! AI 육아 상담사예요.
              {babyProfile && (
                <>
                  <br />
                  <br />
                  <strong>{babyProfile.name || "아기"}</strong>({babyMonths}개월)에 대해 궁금한 점이
                  있으시면 편하게 물어봐 주세요!
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
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
