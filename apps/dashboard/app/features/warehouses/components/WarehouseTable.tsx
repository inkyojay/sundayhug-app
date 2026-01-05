/**
 * 창고 목록 테이블 컴포넌트
 */

import { MapPinIcon, PencilIcon, PhoneIcon, TrashIcon } from "lucide-react";

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

import {
  type Warehouse,
  getWarehouseTypeLabel,
} from "../lib/warehouses.shared";

interface WarehouseTableProps {
  warehouses: Warehouse[];
  inventoryCounts: Record<string, number>;
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (warehouse: Warehouse) => void;
}

export function WarehouseTable({
  warehouses,
  inventoryCounts,
  onEdit,
  onDelete,
}: WarehouseTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>창고코드</TableHead>
          <TableHead>창고명</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>위치</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead className="text-right">재고 수량</TableHead>
          <TableHead>상태</TableHead>
          <TableHead className="w-[100px]">액션</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {warehouses.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={8}
              className="text-center py-8 text-muted-foreground"
            >
              등록된 창고가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-mono text-sm">
                {warehouse.warehouse_code}
              </TableCell>
              <TableCell className="font-medium">
                {warehouse.warehouse_name}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    warehouse.warehouse_type === "owned" ? "default" : "outline"
                  }
                >
                  {getWarehouseTypeLabel(warehouse.warehouse_type)}
                </Badge>
              </TableCell>
              <TableCell>
                {warehouse.location && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPinIcon className="w-3 h-3" />
                    {warehouse.location}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {warehouse.contact_name && (
                  <div className="text-sm">{warehouse.contact_name}</div>
                )}
                {warehouse.contact_phone && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <PhoneIcon className="w-3 h-3" />
                    {warehouse.contact_phone}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {(inventoryCounts[warehouse.id] || 0).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                  {warehouse.is_active ? "활성" : "비활성"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(warehouse)}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(warehouse)}
                  >
                    <TrashIcon className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
