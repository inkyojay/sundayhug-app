/**
 * B2B 업체 통계 카드 컴포넌트
 */

import { Card, CardContent } from "~/core/components/ui/card";
import type { B2BCustomerStats } from "../lib/b2b.shared";

interface CustomerStatsProps {
  stats: B2BCustomerStats;
}

export function CustomerStats({ stats }: CustomerStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">전체 업체</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">{stats.domestic}</div>
          <div className="text-sm text-gray-500">국내 업체</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{stats.overseas}</div>
          <div className="text-sm text-gray-500">해외 업체</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-purple-600">{stats.active}</div>
          <div className="text-sm text-gray-500">활성 업체</div>
        </CardContent>
      </Card>
    </div>
  );
}
