/**
 * 정산 목록 테이블 컴포넌트
 */

import { Banknote, Eye } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";

import { SettlementStatusBadge } from "./SettlementStatusBadge";

interface NaverSettlement {
  settlementTargetId: string;
  productOrderId?: string;
  orderId?: string;
  productName?: string;
  baseAmount?: number;
  commissionFee?: number;
  settlementAmount?: number;
  settleDate?: string;
  settlementStatus?: string;
}

interface SettlementTableProps {
  settlements: NaverSettlement[];
  onViewDetail: (settlement: NaverSettlement) => void;
}

export function SettlementTable({
  settlements,
  onViewDetail,
}: SettlementTableProps) {
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "-";
    return amount.toLocaleString("ko-KR") + "원";
  };

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Banknote className="h-12 w-12 mb-4 opacity-50" />
        <p>정산 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>정산대상ID</TableHead>
            <TableHead>주문번호</TableHead>
            <TableHead>상품명</TableHead>
            <TableHead className="text-right">기준금액</TableHead>
            <TableHead className="text-right">수수료</TableHead>
            <TableHead className="text-right">정산액</TableHead>
            <TableHead>정산일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.map((settlement) => (
            <TableRow
              key={settlement.settlementTargetId}
              className="hover:bg-muted/50"
            >
              <TableCell className="font-mono text-sm">
                {settlement.settlementTargetId}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {settlement.productOrderId || settlement.orderId || "-"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {settlement.productName || "-"}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(settlement.baseAmount)}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {settlement.commissionFee ? `-${formatCurrency(settlement.commissionFee)}` : "-"}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(settlement.settlementAmount)}
              </TableCell>
              <TableCell className="text-sm">
                {settlement.settleDate
                  ? new Date(settlement.settleDate).toLocaleDateString("ko-KR")
                  : "-"}
              </TableCell>
              <TableCell>
                {settlement.settlementStatus && (
                  <SettlementStatusBadge status={settlement.settlementStatus} />
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewDetail(settlement)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
