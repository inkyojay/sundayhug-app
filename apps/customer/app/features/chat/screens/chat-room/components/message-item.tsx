/**
 * Message Item Component
 */
import {
  Bot,
  User,
  Volume2,
  VolumeX,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import type { Message, Source } from "../types";

interface MessageItemProps {
  message: Message;
  isPlaying: boolean;
  currentPlayingId: string | null;
  loadingTtsId: string | null;
  copiedId: string | null;
  onPlayTTS: (messageId: string, text: string) => void;
  onCopy: (messageId: string, text: string) => void;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export function MessageItem({
  message,
  isPlaying,
  currentPlayingId,
  loadingTtsId,
  copiedId,
  onPlayTTS,
  onCopy,
  onFeedback,
}: MessageItemProps) {
  const isUser = message.role === "user";

  const renderSources = () => {
    if (message.role !== "assistant" || !message.sources) return null;

    try {
      const sources: Source[] =
        typeof message.sources === "string" ? JSON.parse(message.sources) : message.sources;
      if (!Array.isArray(sources) || sources.length === 0) return null;

      return (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">참고 자료</p>
          <div className="flex flex-wrap gap-1">
            {sources.map((source, i) => (
              <a
                key={i}
                href={source.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                {source.name}
                {source.url && <ExternalLink className="w-3 h-3" />}
              </a>
            ))}
          </div>
        </div>
      );
    } catch {
      return null;
    }
  };

  return (
    <div className={`mb-4 flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-gray-200" : "bg-gradient-to-br from-[#FF6B35] to-orange-400"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-gray-600" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? "flex flex-col items-end" : ""}`}>
        {!isUser && <p className="text-xs text-gray-500 mb-1 font-medium">AI 육아 상담사</p>}
        <div
          className={`rounded-2xl p-4 ${
            isUser
              ? "bg-[#FF6B35] text-white rounded-tr-md"
              : "bg-white shadow-sm rounded-tl-md text-gray-800"
          }`}
        >
          {message.image_url && (
            <img src={message.image_url} alt="첨부 이미지" className="max-w-full rounded-xl mb-2" />
          )}
          <p className="whitespace-pre-wrap text-inherit">{message.content}</p>
          {renderSources()}
        </div>

        {!isUser && (
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => onPlayTTS(message.id, message.content)}
              disabled={loadingTtsId === message.id}
              className={`p-1.5 rounded-full transition-colors ${
                currentPlayingId === message.id && isPlaying
                  ? "text-[#FF6B35] bg-orange-50"
                  : "text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50"
              }`}
              title="음성으로 듣기"
            >
              {loadingTtsId === message.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentPlayingId === message.id && isPlaying ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="p-1.5 text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 rounded-full transition-colors"
              title="복사"
            >
              {copiedId === message.id ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onFeedback(message.id, true)}
              className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
              title="도움이 됐어요"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onFeedback(message.id, false)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="도움이 안 됐어요"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
