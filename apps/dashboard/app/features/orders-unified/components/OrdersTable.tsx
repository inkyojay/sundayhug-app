/**
 * 주문 목록 테이블 컴포넌트
 *
 * 체크박스 선택, 행 확장 기능 포함
 */
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/core/components/ui/button";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Input } from "~/core/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";

import { Badge } from "@sundayhug/ui";

import { ChannelBadge } from "./ChannelBadge";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderDetailRow } from "./OrderDetailRow";
import { CARRIERS } from "../lib/carriers";
import type { UnifiedOrder } from "../lib/orders-unified.shared";
import { formatCurrency, formatDate } from "../lib/orders-unified.shared";

interface OrdersTableProps {
  orders: UnifiedOrder[];
  selectedOrders: Set<string>;
  expandedOrders: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (key: string, checked: boolean) => void;
  onToggleExpand: (key: string) => void;
  onSort: (column: string) => void;
  onSaveInvoice: (order: UnifiedOrder, invoiceNo: string, carrName: string) => void;
  isProcessing: boolean;
}

// 외부몰 ID -> 배지 색상 매핑
const MARKET_BADGE_CONFIG: Record<string, { variant: "orange" | "green" | "red" | "default"; label: string }> = {
  "11st": { variant: "orange", label: "11번가" },
  "gmarket": { variant: "green", label: "G마켓" },
  "auction": { variant: "red", label: "옥션" },
};

/**
 * 주문 경로 배지 렌더링 헬퍼 함수
 */
function renderOrderChannelBadge(marketId: string | null, orderPlaceName: string | null) {
  // 자사몰 (marketId가 없거나 "self"인 경우)
  if (!marketId || marketId === "self") {
    return <span className="text-xs text-muted-foreground">자사몰</span>;
  }

  // 외부몰 배지 설정 조회
  const badgeConfig = MARKET_BADGE_CONFIG[marketId];

  if (badgeConfig) {
    return <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>;
  }

  // 알 수 없는 마켓플레이스 - orderPlaceName 또는 marketId를 기본 배지로 표시
  const displayName = orderPlaceName || marketId;
  return <Badge variant="default">{displayName}</Badge>;
}

export function OrdersTable({
  orders,
  selectedOrders,
  expandedOrders,
  onSelectAll,
  onSelectOne,
  onToggleExpand,
  onSort,
  onSaveInvoice,
  isProcessing,
}: OrdersTableProps) {
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState("");
  const [editCarrier, setEditCarrier] = useState("");

  const isAllSelected = orders.length > 0 && selectedOrders.size === orders.length;
  const isSomeSelected = selectedOrders.size > 0 && selectedOrders.size < orders.length;

  const startEditInvoice = (order: UnifiedOrder) => {
    setEditingOrder(order.key);
    setEditInvoice(order.invoiceNo || "");
    setEditCarrier(order.carrName || "");
  };

  const handleSaveInvoice = (order: UnifiedOrder) => {
    onSaveInvoice(order, editInvoice, editCarrier);
    setEditingOrder(null);
  };

  const cancelEdit = () => {
    setEditingOrder(null);
    setEditInvoice("");
    setEditCarrier("");
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
                className={isSomeSelected ? "opacity-50" : ""}
              />
            </TableHead>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[80px]">채널</TableHead>
            <TableHead>주문 경로</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted"
              onClick={() => onSort("shop_ord_no")}
            >
              <span className="flex items-center gap-1">
                주문번호 <ArrowUpDownIcon className="h-3 w-3" />
              </span>
            </TableHead>
            <TableHead>상태</TableHead>
            <TableHead>주문자</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted"
              onClick={() => onSort("ord_time")}
            >
              <span className="flex items-center gap-1">
                주문일시 <ArrowUpDownIcon className="h-3 w-3" />
              </span>
            </TableHead>
            <TableHead>송장정보</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                주문이 없습니다. 동기화 버튼을 눌러 주문을 가져오세요.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <>
                <TableRow
                  key={order.key}
                  className={selectedOrders.has(order.key) ? "bg-blue-50" : "hover:bg-muted/50"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.has(order.key)}
                      onCheckedChange={(checked) => onSelectOne(order.key, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onToggleExpand(order.key)}
                    >
                      {expandedOrders.has(order.key) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <ChannelBadge
                      channel={order.channel}
                      marketId={order.marketId}
                      orderPlaceName={order.orderPlaceName}
                    />
                  </TableCell>
                  <TableCell>{renderOrderChannelBadge(order.marketId, order.orderPlaceName)}</TableCell>
                  <TableCell className="font-mono text-sm">{order.orderNo}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.ordStatus} />
                  </TableCell>
                  <TableCell className="font-medium">{order.toName || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {order.toTel || order.toHtel || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">{order.totalQty}개</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.ordTime)}
                  </TableCell>
                  <TableCell>
                    {editingOrder === order.key ? (
                      <div className="flex items-center gap-1">
                        <Select value={editCarrier} onValueChange={setEditCarrier}>
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue placeholder="택배사" />
                          </SelectTrigger>
                          <SelectContent>
                            {CARRIERS.map((c) => (
                              <SelectItem key={c.value} value={c.label}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={editInvoice}
                          onChange={(e) => setEditInvoice(e.target.value)}
                          placeholder="송장번호"
                          className="w-24 h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleSaveInvoice(order)}
                          disabled={isProcessing}
                        >
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={cancelEdit}
                        >
                          <XIcon className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {order.invoiceNo ? (
                          <div className="flex flex-col text-xs">
                            {order.carrName && (
                              <span className="text-muted-foreground">{order.carrName}</span>
                            )}
                            <span className="font-mono">{order.invoiceNo}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => startEditInvoice(order)}
                        >
                          <PencilIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {expandedOrders.has(order.key) && (
                  <OrderDetailRow order={order} colSpan={13} />
                )}
              </>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
