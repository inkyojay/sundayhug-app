/**
 * 결제 내역 페이지
 *
 * 사용자의 결제 내역을 표시하는 페이지
 * - 인증 보호
 * - 결제 내역 테이블 또는 빈 상태 표시
 */

import type { Route } from "./+types/payments";

import { Card } from "~/core/components/ui/card";
import { requireAuthentication } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";

import { PaymentEmptyState, PaymentTable } from "../components";
import { getPayments } from "../lib/payments.server";

/**
 * 페이지 메타데이터
 */
export const meta: Route.MetaFunction = () => {
  return [{ title: `결제내역 | ${import.meta.env.VITE_APP_NAME}` }];
};

/**
 * 결제 내역 로더
 *
 * 1. 사용자 인증 확인
 * 2. 사용자 결제 내역 조회
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  await requireAuthentication(client);

  const {
    data: { user },
  } = await client.auth.getUser();

  const payments = await getPayments(client, { userId: user!.id });

  return { payments };
}

/**
 * 결제 내역 페이지 컴포넌트
 */
export default function Payments({ loaderData }: Route.ComponentProps) {
  const { payments } = loaderData;

  return (
    <div className="flex w-full flex-col items-center gap-10 pt-0 pb-8">
      <Card className="w-full max-w-screen-xl p-8">
        {payments.length === 0 ? (
          <PaymentEmptyState />
        ) : (
          <PaymentTable payments={payments} />
        )}
      </Card>
    </div>
  );
}
