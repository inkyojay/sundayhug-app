/**
 * 결제 성공 페이지
 *
 * Toss Payments 결제 완료 후 리다이렉트되는 페이지
 * - 결제 파라미터 검증
 * - Toss API로 결제 확인
 * - 결제 금액 검증
 * - DB에 결제 정보 저장
 */

import type { Route } from "./+types/success";

import { redirect } from "react-router";

import { requireAuthentication } from "~/core/lib/guards.server";
import adminClient from "~/core/lib/supa-admin-client.server";
import makeServerClient from "~/core/lib/supa-client.server";

import { PaymentSuccessDisplay } from "../components";
import {
  confirmPayment,
  parsePaymentParams,
  savePayment,
  validatePaymentAmount,
} from "../lib/payments.server";

/**
 * 페이지 메타데이터
 */
export const meta: Route.MetaFunction = () => [
  { title: `결제 완료 | ${import.meta.env.VITE_APP_NAME}` },
];

/**
 * 결제 확인 로더
 *
 * 1. 사용자 인증 확인
 * 2. URL 파라미터 검증
 * 3. Toss API로 결제 확인
 * 4. 결제 금액 검증
 * 5. DB에 결제 정보 저장
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  await requireAuthentication(client);

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw redirect("/payments/checkout");
  }

  // URL 파라미터 검증
  const url = new URL(request.url);
  const result = parsePaymentParams(url);

  if (!result.success) {
    throw redirect("/payments/failure?code=invalid-params&message=Invalid payment parameters");
  }

  // Toss API로 결제 확인
  const confirmResult = await confirmPayment(
    result.data.orderId,
    result.data.amount,
    result.data.paymentKey
  );

  if (!confirmResult.success) {
    throw redirect(
      `/payments/failure?code=${encodeURIComponent(confirmResult.code)}&message=${encodeURIComponent(confirmResult.message)}`
    );
  }

  // 결제 금액 검증
  if (!validatePaymentAmount(confirmResult.data.totalAmount)) {
    throw redirect(
      `/payments/failure?code=validation-error&message=${encodeURIComponent("Invalid amount")}`
    );
  }

  // DB에 결제 정보 저장
  await savePayment(
    adminClient,
    confirmResult.data,
    confirmResult.data as unknown as Record<string, unknown>,
    user.id
  );

  return { data: confirmResult.data };
}

/**
 * 결제 성공 페이지 컴포넌트
 */
export default function Success({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col items-center gap-20">
      <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-2">
        <div>
          <img
            src="/nft-2.jpg"
            alt="nft"
            className="w-full rounded-2xl object-cover"
          />
        </div>

        <PaymentSuccessDisplay data={loaderData.data} />
      </div>
    </div>
  );
}
