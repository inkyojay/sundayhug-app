/**
 * 톡톡 메시지 버블 컴포넌트
 */

import { User, Bot, Image as ImageIcon, ExternalLink } from "lucide-react";
import type { TalkTalkMessage, TextContent, ImageContent, CompositeContent } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkMessageBubbleProps {
  message: TalkTalkMessage;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// 텍스트 컨텐츠 렌더링
function TextMessageContent({ content }: { content: TextContent }) {
  return (
    <p className="text-sm whitespace-pre-wrap break-words">{content.text}</p>
  );
}

// 이미지 컨텐츠 렌더링
function ImageMessageContent({ content }: { content: ImageContent }) {
  const imageUrl = content.imageUrl || "";

  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt="이미지 메시지"
        className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      {!imageUrl && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span className="text-sm">[이미지]</span>
        </div>
      )}
    </div>
  );
}

// 복합 컨텐츠 렌더링
function CompositeMessageContent({ content }: { content: CompositeContent }) {
  return (
    <div className="space-y-2">
      {content.compositeList.map((item, index) => (
        <div key={index} className="border rounded-lg p-3 bg-background">
          {item.title && (
            <p className="font-semibold text-sm">{item.title}</p>
          )}
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
          {item.image?.imageUrl && (
            <img
              src={item.image.imageUrl}
              alt=""
              className="mt-2 max-w-full rounded-md"
            />
          )}
          {item.buttonList && item.buttonList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {item.buttonList.map((btn, btnIdx) => (
                <span
                  key={btnIdx}
                  className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full"
                >
                  {btn.data.title}
                  {btn.type === "LINK" && <ExternalLink className="inline h-3 w-3 ml-1" />}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TalkTalkMessageBubble({ message }: TalkTalkMessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const content = message.content as Record<string, unknown>;

  // 메시지 컨텐츠 추출
  const textContent = content.textContent as TextContent | undefined;
  const imageContent = content.imageContent as ImageContent | undefined;
  const compositeContent = content.compositeContent as CompositeContent | undefined;

  return (
    <div className={`flex gap-2 ${isOutbound ? "flex-row-reverse" : "flex-row"}`}>
      {/* 아바타 */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isOutbound ? "bg-primary/10" : "bg-muted"
        }`}
      >
        {isOutbound ? (
          <Bot className="h-4 w-4 text-primary" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* 메시지 버블 */}
      <div className={`flex flex-col ${isOutbound ? "items-end" : "items-start"} max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOutbound
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-muted rounded-tl-none"
          }`}
        >
          {textContent && <TextMessageContent content={textContent} />}
          {imageContent && <ImageMessageContent content={imageContent} />}
          {compositeContent && <CompositeMessageContent content={compositeContent} />}

          {/* 알 수 없는 컨텐츠 */}
          {!textContent && !imageContent && !compositeContent && (
            <p className="text-sm text-muted-foreground">
              [{message.event_type}]
            </p>
          )}
        </div>

        {/* 시간 */}
        <span className="text-xs text-muted-foreground mt-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}

// 날짜 구분선
interface DateDividerProps {
  date: string;
}

export function DateDivider({ date }: DateDividerProps) {
  const formattedDate = new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">{formattedDate}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
