/**
 * 톡톡 메시지 입력 컴포넌트
 */

import { useState } from "react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import { Input } from "~/core/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/core/components/ui/popover";

interface TalkTalkMessageInputProps {
  onSendText: (text: string) => void;
  onSendImage?: (imageUrl: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function TalkTalkMessageInput({
  onSendText,
  onSendImage,
  disabled,
  isSubmitting,
}: TalkTalkMessageInputProps) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);

  const handleSendText = () => {
    if (!text.trim() || disabled || isSubmitting) return;
    onSendText(text.trim());
    setText("");
  };

  const handleSendImage = () => {
    if (!imageUrl.trim() || disabled || isSubmitting || !onSendImage) return;
    onSendImage(imageUrl.trim());
    setImageUrl("");
    setIsImagePopoverOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter로 전송
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="border-t p-4 bg-background">
      <div className="flex items-end gap-2">
        {/* 이미지 버튼 */}
        {onSendImage && (
          <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={disabled || isSubmitting}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium">이미지 URL 입력</p>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={disabled || isSubmitting}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSendImage}
                  disabled={!imageUrl.trim() || disabled || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "이미지 전송"
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 텍스트 입력 */}
        <div className="flex-1">
          <Textarea
            placeholder="메시지를 입력하세요... (Ctrl+Enter로 전송)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSubmitting}
            className="min-h-[80px] resize-none"
            rows={3}
          />
        </div>

        {/* 전송 버튼 */}
        <Button
          onClick={handleSendText}
          disabled={!text.trim() || disabled || isSubmitting}
          size="icon"
          className="h-10 w-10"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 힌트 */}
      <p className="text-xs text-muted-foreground mt-2">
        Ctrl + Enter로 메시지를 전송할 수 있습니다.
      </p>
    </div>
  );
}
