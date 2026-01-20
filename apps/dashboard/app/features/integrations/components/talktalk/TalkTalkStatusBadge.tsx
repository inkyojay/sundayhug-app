/**
 * 톡톡 채팅 상태 배지 컴포넌트
 */

import { Badge } from "~/core/components/ui/badge";
import type { ChatStatus, ThreadOwner } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkStatusBadgeProps {
  status: ChatStatus;
  threadOwner?: ThreadOwner;
}

const statusConfig: Record<
  ChatStatus,
  { label: string; className: string }
> = {
  active: {
    label: "진행중",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  handover: {
    label: "상담원 응대",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  completed: {
    label: "완료",
    className: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  },
};

export function TalkTalkStatusBadge({ status, threadOwner }: TalkTalkStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active;

  // 상담원 응대 중일 때 추가 표시
  const label = status === "handover" && threadOwner === "agent"
    ? "상담원 응대중"
    : config.label;

  return (
    <Badge variant="outline" className={config.className}>
      {label}
    </Badge>
  );
}

// 친구 상태 배지
interface FriendBadgeProps {
  isFriend: boolean;
}

export function FriendBadge({ isFriend }: FriendBadgeProps) {
  if (!isFriend) return null;

  return (
    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
      친구
    </Badge>
  );
}

// 안읽은 메시지 배지
interface UnreadBadgeProps {
  count: number;
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
