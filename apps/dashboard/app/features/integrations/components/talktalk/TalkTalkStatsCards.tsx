/**
 * 톡톡 통계 카드 컴포넌트
 */

import { MessageCircle, UserCheck, HeadphonesIcon, CheckCircle, Bell } from "lucide-react";
import { Card, CardContent } from "~/core/components/ui/card";
import type { ChatStats } from "../../lib/talktalk/talktalk-types.server";

interface TalkTalkStatsCardsProps {
  stats: ChatStats;
  onFilterChange?: (status: string) => void;
  activeFilter?: string;
}

export function TalkTalkStatsCards({
  stats,
  onFilterChange,
  activeFilter = "all",
}: TalkTalkStatsCardsProps) {
  const cards = [
    {
      key: "all",
      label: "전체 대화",
      value: stats.total,
      icon: MessageCircle,
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
    {
      key: "active",
      label: "진행중",
      value: stats.active,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      key: "handover",
      label: "상담원 응대",
      value: stats.handover,
      icon: HeadphonesIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      key: "completed",
      label: "완료",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      key: "unread",
      label: "안읽은 메시지",
      value: stats.unread,
      icon: Bell,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <Card
            key={card.key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isActive ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onFilterChange?.(card.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
