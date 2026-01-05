/**
 * 결제 체크아웃 페이지
 *
 * Toss Payments SDK를 사용한 결제 페이지
 * - 인증 보호
 * - Toss Payments 위젯 렌더링
 * - 결제 요청 처리
 */

import type { Route } from "./+types/checkout";

import {
  type TossPaymentsWidgets,
  loadTossPayments,
} from "@tosspayments/tosspayments-sdk";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/core/components/ui/button";
import { requireAuthentication } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";

import { DEFAULT_PAYMENT_AMOUNT, formatCurrency } from "../lib/payments.shared";

/**
 * 페이지 메타데이터
 * Toss iframe 스타일 이슈로 라이트 모드 강제
 */
export const meta: Route.MetaFunction = () => {
  return [
    { title: `결제하기 | ${import.meta.env.VITE_APP_NAME}` },
    { name: "color-scheme", content: "light" },
  ];
};

/**
 * 체크아웃 로더
 *
 * 1. 사용자 인증 확인
 * 2. 결제에 필요한 사용자 정보 반환
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  await requireAuthentication(client);

  const {
    data: { user },
  } = await client.auth.getUser();

  return {
    userId: user!.id,
    userName: user!.user_metadata.name,
    userEmail: user!.email,
  };
}

/**
 * 체크아웃 페이지 컴포넌트
 */
export default function Checkout({ loaderData }: Route.ComponentProps) {
  const widgets = useRef<TossPaymentsWidgets | null>(null);
  const initedToss = useRef<boolean>(false);

  const [agreementStatus, setAgreementStatus] = useState<boolean>(true);
  const [canPay, setCanPay] = useState<boolean>(false);

  /**
   * Toss Payments SDK 초기화 및 위젯 렌더링
   */
  useEffect(() => {
    async function initToss() {
      if (initedToss.current) return;
      initedToss.current = true;

      const toss = await loadTossPayments(
        import.meta.env.VITE_TOSS_PAYMENTS_CLIENT_KEY
      );

      widgets.current = await toss.widgets({
        customerKey: loaderData.userId,
      });

      await widgets.current.setAmount({
        value: DEFAULT_PAYMENT_AMOUNT,
        currency: "KRW",
      });

      const [, agreement] = await Promise.all([
        widgets.current.renderPaymentMethods({
          selector: "#toss-payment-methods",
          variantKey: "DEFAULT",
        }),
        widgets.current.renderAgreement({
          selector: "#toss-payment-agreement",
          variantKey: "AGREEMENT",
        }),
      ]);

      agreement.on("agreementStatusChange", ({ agreedRequiredTerms }) => {
        setAgreementStatus(agreedRequiredTerms);
      });

      setCanPay(true);
    }

    initToss();
  }, [loaderData.userId]);

  /**
   * 결제 요청 처리
   */
  const handleClick = async () => {
    try {
      // 라이트 모드 강제
      const metaTags = document.querySelectorAll('meta[name="color-scheme"]');
      metaTags.forEach((tag) => {
        tag.setAttribute("content", "light");
      });

      await widgets.current?.requestPayment({
        windowTarget: "iframe",
        orderId: crypto.randomUUID(),
        orderName: "Supabase Beagle NFT",
        customerEmail: loaderData.userEmail,
        customerName: loaderData.userName,
        metadata: {
          nftId: "beagle-nft-#123",
        },
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/failure`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-20">
      <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-2">
        {/* 상품 이미지 */}
        <div>
          <img
            src="/nft.jpg"
            alt="nft"
            className="h-full w-full rounded-2xl object-cover"
          />
        </div>

        {/* 상품 정보 및 결제 위젯 */}
        <div className="flex flex-col items-start gap-10">
          <h1 className="text-center text-4xl font-semibold tracking-tight lg:text-5xl">
            Beagle NFT
          </h1>

          <p className="text-muted-foreground text-lg font-medium">
            Toss Payments 연동 데모 페이지입니다.
            <br />
            실제 결제는 이루어지지 않습니다.
          </p>

          {/* 로딩 인디케이터 */}
          {!canPay && (
            <div className="flex w-full flex-col items-center justify-center gap-2">
              <Loader2Icon className="text-muted-foreground size-10 animate-spin" />
              <span className="text-muted-foreground text-lg">
                결제 수단을 불러오는 중...
              </span>
            </div>
          )}

          {/* 결제 위젯 컨테이너 */}
          <div
            className={cn(
              "flex w-full flex-col gap-5 transition-opacity duration-300",
              canPay ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="border-border w-full overflow-hidden rounded-2xl border md:p-4">
              <div
                id="toss-payment-methods"
                className="bg-background overflow-hidden rounded-t-2xl"
              />
              <div
                id="toss-payment-agreement"
                className="bg-background overflow-hidden rounded-b-2xl"
              />
            </div>

            {/* 결제 버튼 */}
            {canPay && (
              <Button
                className="w-full rounded-2xl py-7.5 text-lg dark:bg-white"
                size="lg"
                onClick={handleClick}
                disabled={!agreementStatus}
              >
                {formatCurrency(DEFAULT_PAYMENT_AMOUNT)} 결제하기
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
