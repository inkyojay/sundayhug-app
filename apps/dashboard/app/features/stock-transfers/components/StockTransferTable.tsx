/**
 * 재고 이동 목록 테이블
 */

import { WarehouseIcon, ArrowRightIcon, TrashIcon } from "lucide-react";

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

import type { StockTransfer } from "../lib/stock-transfers.shared";
import { getStatusInfo, formatDate } from "../lib/stock-transfers.shared";

interface StockTransferTableProps {
  transfers: StockTransfer[];
  onDelete: (transfer: StockTransfer) => void;
}

export function StockTransferTable({
  transfers,
  onDelete,
}: StockTransferTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이동번호</TableHead>
          <TableHead>출발 창고</TableHead>
          <TableHead></TableHead>
          <TableHead>도착 창고</TableHead>
          <TableHead>이동일</TableHead>
          <TableHead className="text-center">품목수</TableHead>
          <TableHead className="text-right">총 수량</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="w-[80px]">액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transfers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              이동 내역이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          transfers.map((transfer) => {
            const statusInfo = getStatusInfo(transfer.status);
            return (
              <TableRow key={transfer.id}>
                <TableCell className="font-mono text-sm font-medium">
                  {transfer.transfer_number}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                    {transfer.from_warehouse?.warehouse_name || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                    {transfer.to_warehouse?.warehouse_name || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDate(transfer.transfer_date)}
                </TableCell>
                <TableCell className="text-center">
                  {transfer.items?.length || 0}
                </TableCell>
                <TableCell className="text-right">
                  {transfer.total_quantity?.toLocaleString() || 0}
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
                    onClick={() => onDelete(transfer)}
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
