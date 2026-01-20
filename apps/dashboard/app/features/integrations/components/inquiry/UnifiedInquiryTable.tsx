/**
 * 통합 문의 테이블 컴포넌트
 *
 * 고객 문의와 상품 문의를 하나의 테이블에 표시
 * - 유형 컬럼으로 구분 (고객문의 / 상품문의)
 * - 행 클릭 시 각 유형에 맞는 상세 패널 열림
 */

import { MessageSquare, ShoppingCart, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import { Badge } from "~/core/components/ui/badge";
import { Skeleton } from "~/core/components/ui/skeleton";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import type { NaverInquiry, NaverProductQna } from "../../lib/naver/naver-types.server";

// 통합 문의 타입
export interface UnifiedInquiry {
  id: string | number;
  type: "customer" | "product";
  status: "WAITING" | "ANSWERED";
  title: string;
  content: string;
  productName: string;
  writerName: string;
  createDate: string;
  // 원본 데이터 참조
  originalData: NaverInquiry | NaverProductQna;
}

interface UnifiedInquiryTableProps {
  customerInquiries: NaverInquiry[];
  productQnas: NaverProductQna[];
  isLoading: boolean;
  onCustomerRowClick: (inquiry: NaverInquiry) => void;
  onProductQnaRowClick: (qna: NaverProductQna) => void;
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

// 통합 데이터 변환
function mergeInquiries(
  customerInquiries: NaverInquiry[],
  productQnas: NaverProductQna[]
): UnifiedInquiry[] {
  const unified: UnifiedInquiry[] = [];

  // 고객 문의 변환
  for (const inquiry of customerInquiries) {
    unified.push({
      id: inquiry.inquiryNo,
      type: "customer",
      status: inquiry.answered ? "ANSWERED" : "WAITING",
      title: inquiry.title || "",
      content: inquiry.content || inquiry.inquiryContent || "",
      productName: inquiry.productName || "",
      writerName: inquiry.customerName || inquiry.customerId || "",
      createDate: inquiry.createDate || inquiry.inquiryRegistrationDateTime || "",
      originalData: inquiry,
    });
  }

  // 상품 문의 변환
  for (const qna of productQnas) {
    unified.push({
      id: qna.questionId,
      type: "product",
      status: qna.answered ? "ANSWERED" : "WAITING",
      title: "",
      content: qna.question || "",
      productName: qna.productName || "",
      writerName: qna.maskedWriterId || "",
      createDate: qna.createDate || "",
      originalData: qna,
    });
  }

  // 최신순 정렬
  unified.sort((a, b) => {
    const dateA = new Date(a.createDate).getTime();
    const dateB = new Date(b.createDate).getTime();
    return dateB - dateA;
  });

  return unified;
}

// 유형 배지 컴포넌트
function TypeBadge({ type }: { type: "customer" | "product" }) {
  if (type === "customer") {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
        <ShoppingCart className="h-3 w-3 mr-1" />
        고객문의
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
      <Package className="h-3 w-3 mr-1" />
      상품문의
    </Badge>
  );
}

// 로딩 스켈레톤 행
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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

export function UnifiedInquiryTable({
  customerInquiries,
  productQnas,
  isLoading,
  onCustomerRowClick,
  onProductQnaRowClick,
}: UnifiedInquiryTableProps) {
  const unifiedInquiries = mergeInquiries(customerInquiries, productQnas);

  const handleRowClick = (item: UnifiedInquiry) => {
    if (item.type === "customer") {
      onCustomerRowClick(item.originalData as NaverInquiry);
    } else {
      onProductQnaRowClick(item.originalData as NaverProductQna);
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">유형</TableHead>
            <TableHead className="w-[100px]">문의번호</TableHead>
            <TableHead>내용</TableHead>
            <TableHead className="w-[180px]">상품명</TableHead>
            <TableHead className="w-[90px]">상태</TableHead>
            <TableHead className="w-[110px]">문의일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : unifiedInquiries.length === 0 ? (
            <EmptyState />
          ) : (
            unifiedInquiries.map((item) => (
              <TableRow
                key={`${item.type}-${item.id}`}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(item)}
              >
                <TableCell>
                  <TypeBadge type={item.type} />
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {item.id}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {item.title && (
                      <p className="font-medium text-sm">
                        {truncateText(item.title, 35)}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {truncateText(item.content, 50)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {truncateText(item.productName || "-", 20)}
                  </span>
                </TableCell>
                <TableCell>
                  <InquiryStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(item.createDate)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
