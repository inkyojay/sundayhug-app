/**
 * Message Input Component
 */
import { useRef } from "react";
import { Send, ImagePlus, Mic, Square, Loader2, X } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import type { SelectedImage } from "../types";

interface MessageInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  selectedImage: SelectedImage | null;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageClear: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  onVoiceRecord: () => void;
  isLoading: boolean;
}

export function MessageInput({
  inputValue,
  onInputChange,
  onSubmit,
  onKeyDown,
  selectedImage,
  onImageSelect,
  onImageClear,
  isRecording,
  isProcessing,
  onVoiceRecord,
  isLoading,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border-t p-4 flex-shrink-0">
      {selectedImage && (
        <div className="mb-3 relative inline-block">
          <img src={selectedImage.preview} alt="미리보기" className="h-20 rounded-lg border" />
          <button
            onClick={onImageClear}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isRecording && (
        <div className="mb-2 flex items-center gap-2 text-red-500 text-sm animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          녹음 중... 다시 클릭하면 종료됩니다
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          <ImagePlus className="w-5 h-5 text-gray-500" />
        </button>

        <button
          type="button"
          onClick={onVoiceRecord}
          disabled={isProcessing || isLoading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : isProcessing
                ? "bg-orange-400 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          title={isRecording ? "녹음 중지" : isProcessing ? "변환 중..." : "음성으로 입력"}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <Square className="w-4 h-4" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 relative">
          <Textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력하세요..."
            className="resize-none pr-12 min-h-[44px] max-h-[120px]"
            rows={1}
          />
        </div>

        <Button
          type="submit"
          disabled={(!inputValue.trim() && !selectedImage) || isLoading}
          className="w-10 h-10 rounded-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 p-0 flex-shrink-0"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-2">
        AI가 생성한 답변은 참고용이며, 전문의 상담을 대체하지 않습니다.
      </p>
    </div>
  );
}
