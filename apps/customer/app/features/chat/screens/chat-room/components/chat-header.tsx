/**
 * Chat Header Component
 */
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { ChatSession, BabyProfile } from "../types";

interface ChatHeaderProps {
  session: ChatSession | null;
  babyProfile: BabyProfile | null;
  babyMonths: number | null;
}

export function ChatHeader({ session, babyProfile, babyMonths }: ChatHeaderProps) {
  const { t } = useTranslation(["chat", "common"]);

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
      <Link
        to="/customer/chat"
        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </Link>
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-gray-900 truncate">{session?.title || t("chat:room.newSession")}</h1>
        {babyProfile && (
          <p className="text-xs text-gray-500">
            {babyProfile.name || t("common:baby")} • {babyMonths}{t("common:months")}
          </p>
        )}
      </div>
      <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}
