/**
 * 톡톡 채팅 상세 슬라이드 패널 컴포넌트
 */

import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import {
  User,
  HeadphonesIcon,
  Bot,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/core/components/ui/sheet";
import { Button } from "~/core/components/ui/button";
import { Separator } from "~/core/components/ui/separator";
import { TalkTalkStatusBadge, FriendBadge } from "./TalkTalkStatusBadge";
import { TalkTalkMessageBubble, DateDivider } from "./TalkTalkMessageBubble";
import { TalkTalkMessageInput } from "./TalkTalkMessageInput";
import type { TalkTalkChat, TalkTalkMessage } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkChatSheetProps {
  chat: TalkTalkChat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function maskUserId(userId: string): string {
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

function groupMessagesByDate(messages: TalkTalkMessage[]): Map<string, TalkTalkMessage[]> {
  const groups = new Map<string, TalkTalkMessage[]>();

  for (const message of messages) {
    const date = new Date(message.created_at).toDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(message);
  }

  return groups;
}

export function TalkTalkChatSheet({
  chat,
  open,
  onOpenChange,
}: TalkTalkChatSheetProps) {
  const [messages, setMessages] = useState<TalkTalkMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const syncFetcher = useFetcher();
  const messageFetcher = useFetcher();

  // 채팅방 열릴 때 메시지 로드
  useEffect(() => {
    if (open && chat) {
      setIsLoadingMessages(true);
      syncFetcher.submit(
        { actionType: "getMessages", chatId: chat.id },
        { method: "POST", action: "/integrations/talktalk/sync" }
      );

      // 읽음 처리
      messageFetcher.submit(
        { actionType: "markAsRead", userId: chat.user_id },
        { method: "POST", action: "/integrations/talktalk/messages" }
      );
    }
  }, [open, chat?.id]);

  // 메시지 로드 결과 처리
  useEffect(() => {
    if (syncFetcher.data && "messages" in syncFetcher.data) {
      setMessages(syncFetcher.data.messages as TalkTalkMessage[]);
      setIsLoadingMessages(false);
    }
  }, [syncFetcher.data]);

  // 메시지 끝으로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 메시지 발송 결과 처리
  useEffect(() => {
    if (messageFetcher.data && "success" in messageFetcher.data && messageFetcher.data.success) {
      // 메시지 발송 성공 시 목록 새로고침
      if (chat) {
        syncFetcher.submit(
          { actionType: "getMessages", chatId: chat.id },
          { method: "POST", action: "/integrations/talktalk/sync" }
        );
      }
    }
  }, [messageFetcher.data]);

  const handleSendText = (text: string) => {
    if (!chat) return;

    messageFetcher.submit(
      { actionType: "sendText", userId: chat.user_id, text },
      { method: "POST", action: "/integrations/talktalk/messages" }
    );
  };

  const handleSendImage = (imageUrl: string) => {
    if (!chat) return;

    messageFetcher.submit(
      { actionType: "sendImage", userId: chat.user_id, imageUrl },
      { method: "POST", action: "/integrations/talktalk/messages" }
    );
  };

  const handlePassToAgent = () => {
    if (!chat) return;

    messageFetcher.submit(
      { actionType: "passToAgent", userId: chat.user_id },
      { method: "POST", action: "/integrations/talktalk/messages" }
    );
  };

  const handleTakeFromAgent = () => {
    if (!chat) return;

    messageFetcher.submit(
      { actionType: "takeFromAgent", userId: chat.user_id },
      { method: "POST", action: "/integrations/talktalk/messages" }
    );
  };

  const handleMarkComplete = () => {
    if (!chat) return;

    syncFetcher.submit(
      { actionType: "updateChatStatus", chatId: chat.id, status: "completed" },
      { method: "POST", action: "/integrations/talktalk/sync" }
    );
  };

  if (!chat) return null;

  const isSubmitting = messageFetcher.state === "submitting";
  const messagesByDate = groupMessagesByDate(messages);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        {/* 헤더 */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg">
                  {maskUserId(chat.user_id)}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <TalkTalkStatusBadge
                    status={chat.status as any}
                    threadOwner={chat.thread_owner as any}
                  />
                  <FriendBadge isFriend={chat.is_friend} />
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 mt-4">
            {chat.status === "active" && chat.thread_owner === "bot" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePassToAgent}
                disabled={isSubmitting}
              >
                <HeadphonesIcon className="h-4 w-4 mr-1" />
                상담원 전환
              </Button>
            )}
            {chat.status === "handover" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTakeFromAgent}
                disabled={isSubmitting}
              >
                <Bot className="h-4 w-4 mr-1" />
                챗봇으로 전환
              </Button>
            )}
            {chat.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkComplete}
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                상담 완료
              </Button>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">메시지가 없습니다.</p>
            </div>
          ) : (
            <>
              {Array.from(messagesByDate.entries()).map(([date, dateMessages]) => (
                <div key={date}>
                  <DateDivider date={date} />
                  <div className="space-y-4">
                    {dateMessages.map((message) => (
                      <TalkTalkMessageBubble key={message.id} message={message} />
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 메시지 입력 */}
        {chat.status !== "completed" && (
          <TalkTalkMessageInput
            onSendText={handleSendText}
            onSendImage={handleSendImage}
            disabled={chat.status === "handover" && chat.thread_owner === "agent"}
            isSubmitting={isSubmitting}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
