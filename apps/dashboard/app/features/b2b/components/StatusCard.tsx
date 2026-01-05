/**
 * B2B 상태별 통계 카드 컴포넌트
 */

import { Card, CardContent } from "~/core/components/ui/card";
import { ORDER_STATUS_OPTIONS, type B2BOrderStats } from "../lib/b2b.shared";

interface StatusCardsProps {
  stats: B2BOrderStats;
  selectedStatus: string;
  onStatusClick: (status: string) => void;
}

export function StatusCards({ stats, selectedStatus, onStatusClick }: StatusCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {ORDER_STATUS_OPTIONS.map((status) => {
        const StatusIcon = status.icon;
        const isSelected = selectedStatus === status.value;
        return (
          <Card
            key={status.value}
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onStatusClick(isSelected ? "" : status.value)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{status.label}</p>
                  <p className="text-xl font-bold">{stats[status.value] || 0}</p>
                </div>
                <StatusIcon className="w-5 h-5 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
