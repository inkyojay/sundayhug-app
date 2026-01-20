/**
 * 문의 테이블 컴포넌트
 *
 * Freshdesk 스타일의 테이블
 * - 문의번호, 유형, 제목, 상품명, 상태, 문의일
 * - 행 클릭 시 상세 패널 열림
 * - 로딩/빈 상태 처리
 */

import { MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Skeleton } from "~/core/components/ui/skeleton";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import type { NaverInquiry } from "../../lib/naver/naver-types.server";

interface InquiryTableProps {
  inquiries: NaverInquiry[];
  isLoading: boolean;
  onRowClick: (inquiry: NaverInquiry) => void;
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

function truncateText(text: string, maxLength: number): string {
  if (!text) return "-";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

// 로딩 스켈레톤 행
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  );
}

// 빈 상태
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-48">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">문의 내역이 없습니다</p>
          <p className="text-sm">선택한 기간에 해당하는 문의가 없습니다</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function InquiryTable({
  inquiries,
  isLoading,
  onRowClick,
}: InquiryTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">문의번호</TableHead>
            <TableHead className="w-[100px]">유형</TableHead>
            <TableHead>제목/내용</TableHead>
            <TableHead className="w-[150px]">상품명</TableHead>
            <TableHead className="w-[100px]">상태</TableHead>
            <TableHead className="w-[120px]">문의일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // 로딩 스켈레톤 5줄
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : inquiries.length === 0 ? (
            <EmptyState />
          ) : (
            inquiries.map((inquiry) => (
              <TableRow
                key={inquiry.inquiryNo}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(inquiry)}
              >
                <TableCell className="font-medium">
                  {inquiry.inquiryNo}
                </TableCell>
                <TableCell>{inquiry.inquiryTypeName || "-"}</TableCell>
                <TableCell>
                  <div>
                    {inquiry.title && (
                      <p className="font-medium">
                        {truncateText(inquiry.title, 30)}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {truncateText(inquiry.content || "", 40)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {truncateText(inquiry.productName || "-", 15)}
                </TableCell>
                <TableCell>
                  <InquiryStatusBadge status={inquiry.inquiryStatus || (inquiry.answered ? "ANSWERED" : "WAITING")} />
                </TableCell>
                <TableCell>{formatDate(inquiry.createDate || inquiry.inquiryRegistrationDateTime || "")}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
