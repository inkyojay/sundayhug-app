/**
 * 정산 요약 카드 컴포넌트
 *
 * 총 기준금액, 수수료, 정산액 표시
 */

import { Banknote, Calculator, CreditCard, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/core/components/ui/card";

interface SettlementSummaryCardsProps {
  totalBaseAmount: number;
  totalCommission: number;
  totalSettledAmount: number;
  totalExpectedAmount: number;
}

export function SettlementSummaryCards({
  totalBaseAmount,
  totalCommission,
  totalSettledAmount,
  totalExpectedAmount,
}: SettlementSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  const cards = [
    {
      title: "정산 기준금액",
      value: totalBaseAmount,
      icon: Calculator,
      iconColor: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-800",
    },
    {
      title: "수수료",
      value: totalCommission,
      icon: CreditCard,
      iconColor: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      valueColor: "text-red-600",
    },
    {
      title: "정산 완료",
      value: totalSettledAmount,
      icon: Banknote,
      iconColor: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      valueColor: "text-green-600",
    },
    {
      title: "정산 예정",
      value: totalExpectedAmount,
      icon: TrendingUp,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      valueColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className={card.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${card.valueColor || ""}`}>
                {formatCurrency(card.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
