/**
 * 클레임 상세 정보 슬라이드 패널
 */

import { useState } from "react";
import { Loader2, Package, Send, X } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/core/components/ui/sheet";

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
  claimDetailedReason?: string;
  buyerName?: string;
  buyerTel?: string;
  quantity?: number;
  totalPaymentAmount?: number;
  returnAddress?: string;
}

interface ClaimDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: NaverClaim | null;
  onApprove: () => void;
  onReject: () => void;
  onHold: () => void;
  onReleaseHold: () => void;
  onCollectDone: () => void;
  onDispatch: (deliveryCompanyCode: string, trackingNumber: string) => void;
  isLoading?: boolean;
}

const DELIVERY_COMPANIES = [
  { code: "CJGLS", name: "CJ대한통운" },
  { code: "HANJIN", name: "한진택배" },
  { code: "LOTTE", name: "롯데택배" },
  { code: "LOGEN", name: "로젠택배" },
  { code: "EPOST", name: "우체국택배" },
  { code: "KGB", name: "로젠택배" },
];

export function ClaimDetailSheet({
  open,
  onOpenChange,
  claim,
  onApprove,
  onReject,
  onHold,
  onReleaseHold,
  onCollectDone,
  onDispatch,
  isLoading = false,
}: ClaimDetailSheetProps) {
  const [deliveryCompany, setDeliveryCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  if (!claim) return null;

  const showDispatchForm = claim.claimStatus === "COLLECT_DONE";

  const handleDispatch = () => {
    if (deliveryCompany && trackingNumber) {
      onDispatch(deliveryCompany, trackingNumber);
      setDeliveryCompany("");
      setTrackingNumber("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            클레임 상세
            <ClaimTypeBadge type={claim.claimType} />
          </SheetTitle>
          <SheetDescription>
            주문번호: {claim.productOrderId}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 클레임 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">클레임 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">유형</Label>
                <div className="mt-1">
                  <ClaimTypeBadge type={claim.claimType} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">상태</Label>
                <div className="mt-1">
                  <ClaimStatusBadge status={claim.claimStatus} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">요청일</Label>
                <p className="mt-1 text-sm">
                  {claim.claimRequestDate
                    ? new Date(claim.claimRequestDate).toLocaleString("ko-KR")
                    : "-"}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">요청 사유</Label>
              <p className="mt-1 text-sm">{claim.claimReason || "-"}</p>
            </div>
            {claim.claimDetailedReason && (
              <div>
                <Label className="text-xs text-muted-foreground">상세 사유</Label>
                <p className="mt-1 text-sm">{claim.claimDetailedReason}</p>
              </div>
            )}
          </div>

          {/* 주문 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">주문 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">주문번호</Label>
                <p className="mt-1 text-sm font-mono">{claim.orderId || claim.productOrderId}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">수량</Label>
                <p className="mt-1 text-sm">{claim.quantity || 1}개</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">상품명</Label>
              <p className="mt-1 text-sm">{claim.productName || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">결제금액</Label>
              <p className="mt-1 text-sm font-semibold">
                {claim.totalPaymentAmount
                  ? `${claim.totalPaymentAmount.toLocaleString()}원`
                  : "-"}
              </p>
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">고객 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">고객명</Label>
                <p className="mt-1 text-sm">{claim.buyerName || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">연락처</Label>
                <p className="mt-1 text-sm">{claim.buyerTel || "-"}</p>
              </div>
            </div>
            {claim.returnAddress && (
              <div>
                <Label className="text-xs text-muted-foreground">반송 주소</Label>
                <p className="mt-1 text-sm">{claim.returnAddress}</p>
              </div>
            )}
          </div>

          {/* 재배송 정보 입력 (교환 수거완료 시) */}
          {showDispatchForm && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Send className="h-4 w-4" />
                재배송 정보 입력
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="deliveryCompany">택배사</Label>
                  <Select value={deliveryCompany} onValueChange={setDeliveryCompany}>
                    <SelectTrigger id="deliveryCompany" className="mt-1">
                      <SelectValue placeholder="택배사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_COMPANIES.map((company) => (
                        <SelectItem key={company.code} value={company.code}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trackingNumber">송장번호</Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="송장번호 입력"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleDispatch}
                  disabled={!deliveryCompany || !trackingNumber || isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Package className="h-4 w-4 mr-2" />
                  재배송 처리
                </Button>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          {!showDispatchForm && (
            <div className="pt-4 border-t">
              <ClaimActionButtons
                claimType={claim.claimType}
                claimStatus={claim.claimStatus}
                productOrderId={claim.productOrderId}
                onApprove={onApprove}
                onReject={onReject}
                onHold={onHold}
                onReleaseHold={onReleaseHold}
                onCollectDone={onCollectDone}
                onDispatch={() => {}}
                isLoading={isLoading}
                size="default"
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
