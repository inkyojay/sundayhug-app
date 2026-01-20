/**
 * 상품 문의 테이블 컴포넌트
 *
 * 상품 Q&A 목록을 테이블 형태로 표시
 */

import { Package, User, Calendar, MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import type { NaverProductQna } from "../../lib/naver/naver-types.server";

interface ProductQnaTableProps {
  qnas: NaverProductQna[];
  isLoading: boolean;
  onRowClick: (qna: NaverProductQna) => void;
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function ProductQnaTable({
  qnas,
  isLoading,
  onRowClick,
}: ProductQnaTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (qnas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p>상품 문의가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">번호</TableHead>
            <TableHead className="w-[100px]">상태</TableHead>
            <TableHead>상품명</TableHead>
            <TableHead>질문 내용</TableHead>
            <TableHead className="w-[100px]">작성자</TableHead>
            <TableHead className="w-[120px]">등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {qnas.map((qna) => (
            <TableRow
              key={qna.questionId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(qna)}
            >
              <TableCell className="font-medium">{qna.questionId}</TableCell>
              <TableCell>
                <InquiryStatusBadge status={qna.answered ? "ANSWERED" : "WAITING"} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">
                    {qna.productName || "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {truncateText(qna.question, 40)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{qna.maskedWriterId || "-"}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{formatDate(qna.createDate)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
