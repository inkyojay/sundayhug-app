/**
 * 클레임 목록 테이블 컴포넌트
 */

import { useState } from "react";
import { ClipboardList, Eye } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Checkbox } from "~/core/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";

import { ClaimTypeBadge } from "./ClaimTypeBadge";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { ClaimActionButtons } from "./ClaimActionButtons";

interface NaverClaim {
  productOrderId: string;
  orderId?: string;
  claimType: string;
  claimStatus: string;
  productName?: string;
  claimRequestDate?: string;
  claimReason?: string;
  buyerName?: string;
}

interface ClaimTableProps {
  claims: NaverClaim[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onViewDetail: (claim: NaverClaim) => void;
  onApprove: (claim: NaverClaim) => void;
  onReject: (claim: NaverClaim) => void;
  onHold: (claim: NaverClaim) => void;
  onReleaseHold: (claim: NaverClaim) => void;
  onCollectDone: (claim: NaverClaim) => void;
  onDispatch: (claim: NaverClaim) => void;
  isLoading?: boolean;
}

export function ClaimTable({
  claims,
  selectedIds,
  onSelectionChange,
  onViewDetail,
  onApprove,
  onReject,
  onHold,
  onReleaseHold,
  onCollectDone,
  onDispatch,
  isLoading = false,
}: ClaimTableProps) {
  const isAllSelected = claims.length > 0 && selectedIds.length === claims.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < claims.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(claims.map((c) => c.productOrderId));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (claims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
        <p>처리할 클레임이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) (el as HTMLInputElement).indeterminate = isSomeSelected;
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>주문번호</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>상품명</TableHead>
            <TableHead>요청사유</TableHead>
            <TableHead>요청일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => (
            <TableRow
              key={claim.productOrderId}
              className="hover:bg-muted/50"
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(claim.productOrderId)}
                  onCheckedChange={() => handleSelectOne(claim.productOrderId)}
                />
              </TableCell>
              <TableCell className="font-mono text-sm">
                {claim.productOrderId}
              </TableCell>
              <TableCell>
                <ClaimTypeBadge type={claim.claimType} />
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {claim.productName || "-"}
              </TableCell>
              <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                {claim.claimReason || "-"}
              </TableCell>
              <TableCell className="text-sm">
                {claim.claimRequestDate
                  ? new Date(claim.claimRequestDate).toLocaleDateString("ko-KR")
                  : "-"}
              </TableCell>
              <TableCell>
                <ClaimStatusBadge status={claim.claimStatus} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <ClaimActionButtons
                    claimType={claim.claimType}
                    claimStatus={claim.claimStatus}
                    productOrderId={claim.productOrderId}
                    onApprove={() => onApprove(claim)}
                    onReject={() => onReject(claim)}
                    onHold={() => onHold(claim)}
                    onReleaseHold={() => onReleaseHold(claim)}
                    onCollectDone={() => onCollectDone(claim)}
                    onDispatch={() => onDispatch(claim)}
                    isLoading={isLoading}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetail(claim)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
