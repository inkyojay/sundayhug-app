/**
 * 발주 품목 테이블 컴포넌트
 */

import { TrashIcon } from "lucide-react";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { type OrderItem, formatCurrency } from "../lib/purchase-orders.shared";

interface OrderItemsTableProps {
  items: OrderItem[];
  onUpdateItem: (index: number, field: keyof OrderItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  readonly?: boolean;
}

export function OrderItemsTable({
  items,
  onUpdateItem,
  onRemoveItem,
  readonly = false,
}: OrderItemsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>제품명</TableHead>
          <TableHead className="w-[100px]">수량</TableHead>
          <TableHead className="w-[120px]">단가</TableHead>
          <TableHead className="text-right w-[120px]">금액</TableHead>
          {!readonly && <TableHead className="w-[60px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={readonly ? 5 : 6}
              className="text-center py-8 text-muted-foreground"
            >
              제품을 추가해주세요.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-sm">{item.sku}</TableCell>
              <TableCell className="max-w-[200px] truncate">{item.product_name}</TableCell>
              <TableCell>
                {readonly ? (
                  item.quantity
                ) : (
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(index, "quantity", parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                )}
              </TableCell>
              <TableCell>
                {readonly ? (
                  formatCurrency(item.unit_price)
                ) : (
                  <Input
                    type="number"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) =>
                      onUpdateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.quantity * item.unit_price)}
              </TableCell>
              {!readonly && (
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveItem(index)}>
                    <TrashIcon className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
