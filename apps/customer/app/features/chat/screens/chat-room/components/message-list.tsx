/**
 * Message List Component
 */
import { forwardRef } from "react";
import { Bot, Loader2 } from "lucide-react";
import type { Message, BabyProfile } from "../types";
import { MessageItem } from "./message-item";
import { WelcomeMessage } from "./welcome-message";

interface MessageListProps {
  messages: Message[];
  babyProfile: BabyProfile | null;
  babyMonths: number | null;
  isLoading: boolean;
  isPlaying: boolean;
  currentPlayingId: string | null;
  loadingTtsId: string | null;
  copiedId: string | null;
  onSuggestionClick: (suggestion: string) => void;
  onPlayTTS: (messageId: string, text: string) => void;
  onCopy: (messageId: string, text: string) => void;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      messages,
      babyProfile,
      babyMonths,
      isLoading,
      isPlaying,
      currentPlayingId,
      loadingTtsId,
      copiedId,
      onSuggestionClick,
      onPlayTTS,
      onCopy,
      onFeedback,
    },
    ref
  ) => {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-[#F5F5F0]">
        {messages.length === 0 && (
          <WelcomeMessage
            babyProfile={babyProfile}
            babyMonths={babyMonths}
            onSuggestionClick={onSuggestionClick}
          />
        )}

        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isPlaying={isPlaying}
            currentPlayingId={currentPlayingId}
            loadingTtsId={loadingTtsId}
            copiedId={copiedId}
            onPlayTTS={onPlayTTS}
            onCopy={onCopy}
            onFeedback={onFeedback}
          />
        ))}

        {isLoading && (
          <div className="mb-4 flex gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>답변 작성 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={ref} />
      </div>
    );
  }
);

MessageList.displayName = "MessageList";
