/**
 * 결제 내역 테이블 컴포넌트
 *
 * 결제 내역을 테이블 형태로 표시
 */

import { Link } from "react-router";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";

import { formatCurrency, formatDate, type Payment } from "../lib/payments.shared";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PaymentTableProps {
  payments: Payment[];
  caption?: string;
}

export function PaymentTable({
  payments,
  caption = "결제 내역 목록입니다.",
}: PaymentTableProps) {
  return (
    <Table>
      <TableCaption>{caption}</TableCaption>

      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">주문 ID</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>상품명</TableHead>
          <TableHead>결제금액</TableHead>
          <TableHead>결제일</TableHead>
          <TableHead>영수증</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.payment_id}>
            <TableCell className="font-medium">{payment.order_id}</TableCell>
            <TableCell>
              <PaymentStatusBadge status={payment.status} />
            </TableCell>
            <TableCell>{payment.order_name}</TableCell>
            <TableCell>{formatCurrency(payment.total_amount)}</TableCell>
            <TableCell>{formatDate(payment.created_at)}</TableCell>
            <TableCell>
              <Link
                to={payment.receipt_url}
                target="_blank"
                className="text-primary hover:underline"
              >
                영수증 보기 &rarr;
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
