/**
 * RFM 요약 카드 컴포넌트
 *
 * 총 고객 수, 평균 R/F/M 값을 카드로 표시합니다.
 */

import { UsersIcon, CalendarIcon, RepeatIcon, WalletIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";
import { formatCurrencyShort } from "~/core/lib/format";
import type { RFMSummary } from "../types";

interface RfmOverviewProps {
  summary: RFMSummary;
}

export function RfmOverview({ summary }: RfmOverviewProps) {
  const cards = [
    {
      title: "총 고객",
      value: summary.totalCustomers.toLocaleString(),
      subtitle: "분석 대상",
      icon: UsersIcon,
      iconColor: "text-blue-500",
    },
    {
      title: "평균 R",
      value: `${summary.avgRecency}일`,
      subtitle: "마지막 구매 경과",
      icon: CalendarIcon,
      iconColor: "text-green-500",
    },
    {
      title: "평균 F",
      value: `${summary.avgFrequency}회`,
      subtitle: "평균 구매 횟수",
      icon: RepeatIcon,
      iconColor: "text-purple-500",
    },
    {
      title: "평균 M",
      value: `₩${formatCurrencyShort(summary.avgMonetary)}`,
      subtitle: "평균 구매 금액",
      icon: WalletIcon,
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
