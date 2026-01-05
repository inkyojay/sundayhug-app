/**
 * 발주 상태별 통계 카드 컴포넌트
 */

import { Card, CardContent } from "~/core/components/ui/card";
import { ORDER_STATUS_OPTIONS, type PurchaseOrderStats } from "../lib/purchase-orders.shared";

interface StatusCardProps {
  stats: PurchaseOrderStats;
  selectedStatus: string;
  onStatusClick: (status: string) => void;
}

export function StatusCards({ stats, selectedStatus, onStatusClick }: StatusCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {ORDER_STATUS_OPTIONS.map((status) => {
        const StatusIcon = status.icon;
        return (
          <Card
            key={status.value}
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
              selectedStatus === status.value ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onStatusClick(status.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{status.label}</p>
                  <p className="text-2xl font-bold">{stats[status.value] || 0}</p>
                </div>
                <StatusIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
