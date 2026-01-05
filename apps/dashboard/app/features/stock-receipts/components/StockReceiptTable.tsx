/**
 * 입고 목록 테이블
 */

import { Link } from "react-router";
import { WarehouseIcon, TrashIcon } from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";

import type { StockReceipt } from "../lib/stock-receipts.shared";
import { getStatusInfo, formatDate } from "../lib/stock-receipts.shared";

interface StockReceiptTableProps {
  receipts: StockReceipt[];
  onDelete: (receipt: StockReceipt) => void;
}

export function StockReceiptTable({
  receipts,
  onDelete,
}: StockReceiptTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>입고번호</TableHead>
          <TableHead>발주번호</TableHead>
          <TableHead>창고</TableHead>
          <TableHead>입고일</TableHead>
          <TableHead className="text-center">품목수</TableHead>
          <TableHead className="text-right">총 수량</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="w-[80px]">액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {receipts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              입고 내역이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          receipts.map((receipt) => {
            const statusInfo = getStatusInfo(receipt.status);
            return (
              <TableRow key={receipt.id}>
                <TableCell className="font-mono text-sm font-medium">
                  {receipt.receipt_number}
                </TableCell>
                <TableCell>
                  {receipt.purchase_order ? (
                    <Link
                      to={`/dashboard/purchase-orders/${receipt.purchase_order.id}`}
                      className="text-primary hover:underline"
                    >
                      {receipt.purchase_order.order_number}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">직접입고</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                    {receipt.warehouse?.warehouse_name || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDate(receipt.receipt_date)}
                </TableCell>
                <TableCell className="text-center">
                  {receipt.items?.length || 0}
                </TableCell>
                <TableCell className="text-right">
                  {receipt.total_quantity?.toLocaleString() || 0}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.color as any}>
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(receipt)}
                  >
                    <TrashIcon className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
