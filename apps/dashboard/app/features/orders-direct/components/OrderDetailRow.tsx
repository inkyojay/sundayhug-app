import { PackageIcon, MapPinIcon } from "lucide-react";
import { Badge } from "~/core/components/ui/badge";
import { TableCell, TableRow } from "~/core/components/ui/table";
import type { Order } from "../lib/orders.server";

interface OrderDetailRowProps {
  order: Order;
  colSpan: number;
}

export function OrderDetailRow({ order, colSpan }: OrderDetailRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="bg-muted/30 p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* 상품 목록 */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <PackageIcon className="h-4 w-4" />
              주문 상품 ({order.items.length}개)
            </h4>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="p-2 bg-white rounded border text-sm">
                  <div className="font-medium">{item.saleName}</div>
                  <div className="text-muted-foreground flex flex-wrap gap-2 mt-1">
                    {item.optName && <span>옵션: {item.optName}</span>}
                    {item.skuCd && (
                      <span className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">
                        {item.skuCd}
                      </span>
                    )}
                    <span>₩{item.amt?.toLocaleString()} x {item.qty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 배송 정보 */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              배송 정보
            </h4>
            <div className="p-3 bg-white rounded border text-sm space-y-1">
              <p><strong>수령인:</strong> {order.toName}</p>
              <p><strong>연락처:</strong> {order.toTel || order.toHtel || "-"}</p>
              <p>
                <strong>주소:</strong>{" "}
                {[order.toAddr1, order.toAddr2].filter(Boolean).join(" ") || "-"}
              </p>
              {order.customerId && (
                <p className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    고객 ID: {order.customerId.slice(0, 8)}...
                  </Badge>
                </p>
              )}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
