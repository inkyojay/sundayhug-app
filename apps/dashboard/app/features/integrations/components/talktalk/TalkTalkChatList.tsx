/**
 * 톡톡 채팅 목록 컴포넌트
 */

import { MessageCircle, User, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { TalkTalkStatusBadge, FriendBadge, UnreadBadge } from "./TalkTalkStatusBadge";
import type { TalkTalkChat } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkChatListProps {
  chats: TalkTalkChat[];
  onSelectChat: (chat: TalkTalkChat) => void;
  selectedChatId?: string;
  isLoading?: boolean;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "어제";
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }
}

function maskUserId(userId: string): string {
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

export function TalkTalkChatList({
  chats,
  onSelectChat,
  selectedChatId,
  isLoading,
}: TalkTalkChatListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">채팅이 없습니다</p>
        <p className="text-sm">사용자가 톡톡으로 메시지를 보내면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">사용자</TableHead>
            <TableHead>마지막 메시지</TableHead>
            <TableHead className="w-[120px]">상태</TableHead>
            <TableHead className="w-[100px] text-right">시간</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chats.map((chat) => (
            <TableRow
              key={chat.id}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedChatId === chat.id ? "bg-muted" : ""
              }`}
              onClick={() => onSelectChat(chat)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {maskUserId(chat.user_id)}
                    </span>
                    <div className="flex items-center gap-1">
                      <FriendBadge isFriend={chat.is_friend} />
                    </div>
                  </div>
                  <UnreadBadge count={chat.unread_count} />
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                  {chat.last_message_preview || "-"}
                </p>
              </TableCell>
              <TableCell>
                <TalkTalkStatusBadge
                  status={chat.status as any}
                  threadOwner={chat.thread_owner as any}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">{formatDate(chat.last_message_at)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
