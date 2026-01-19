/**
 * 문의 통계 카드 컴포넌트
 *
 * Zendesk 스타일의 4개 통계 카드
 * - 전체 문의, 미답변, 답변완료, 보류중
 */

import { MessageSquare, Clock, CheckCircle, PauseCircle } from "lucide-react";
import { Card, CardContent } from "~/core/components/ui/card";

interface InquiryStatsCardsProps {
  total: number;
  waiting: number;
  answered: number;
  holding: number;
  onStatusClick?: (status: "all" | "WAITING" | "ANSWERED" | "HOLDING") => void;
}

export function InquiryStatsCards({
  total,
  waiting,
  answered,
  holding,
  onStatusClick,
}: InquiryStatsCardsProps) {
  const stats = [
    {
      label: "전체 문의",
      value: total,
      icon: MessageSquare,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      status: "all" as const,
    },
    {
      label: "미답변",
      value: waiting,
      icon: Clock,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      status: "WAITING" as const,
      highlight: waiting > 0,
    },
    {
      label: "답변완료",
      value: answered,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      status: "ANSWERED" as const,
    },
    {
      label: "보류중",
      value: holding,
      icon: PauseCircle,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      status: "HOLDING" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.status}
          className={`cursor-pointer transition-all hover:shadow-md ${
            stat.highlight ? "ring-2 ring-red-500 dark:ring-red-400" : ""
          }`}
          onClick={() => onStatusClick?.(stat.status)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            {stat.highlight && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                답변이 필요합니다
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
