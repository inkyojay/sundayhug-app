/**
 * 클레임 통계 카드 컴포넌트
 *
 * 전체/취소/반품/교환 건수를 표시하고
 * 클릭 시 해당 유형으로 필터링
 */

import {
  ArrowLeftRight,
  ClipboardList,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";

interface ClaimStatsCardsProps {
  total: number;
  cancelCount: number;
  returnCount: number;
  exchangeCount: number;
  currentFilter?: string;
  onFilterChange?: (type: string) => void;
}

export function ClaimStatsCards({
  total,
  cancelCount,
  returnCount,
  exchangeCount,
  currentFilter = "all",
  onFilterChange,
}: ClaimStatsCardsProps) {
  const cards = [
    {
      key: "all",
      title: "전체",
      value: total,
      icon: ClipboardList,
      iconColor: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-800",
    },
    {
      key: "CANCEL",
      title: "취소요청",
      value: cancelCount,
      icon: XCircle,
      iconColor: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
    {
      key: "RETURN",
      title: "반품요청",
      value: returnCount,
      icon: RotateCcw,
      iconColor: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      key: "EXCHANGE",
      title: "교환요청",
      value: exchangeCount,
      icon: ArrowLeftRight,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = currentFilter === card.key;

        return (
          <Card
            key={card.key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary" : ""
            } ${card.bgColor}`}
            onClick={() => onFilterChange?.(card.key)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
