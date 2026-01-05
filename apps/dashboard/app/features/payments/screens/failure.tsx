/**
 * 결제 실패 페이지
 *
 * 결제 과정에서 오류 발생 시 표시되는 페이지
 * URL 파라미터에서 오류 코드와 메시지를 추출하여 표시
 */

import { type MetaFunction, useSearchParams } from "react-router";

import { PaymentErrorDisplay } from "../components";

/**
 * 페이지 메타데이터
 */
export const meta: MetaFunction = () => {
  return [{ title: `결제 오류 | ${import.meta.env.VITE_APP_NAME}` }];
};

/**
 * 결제 실패 페이지 컴포넌트
 */
export default function Failure() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  return (
    <PaymentErrorDisplay
      code={errorCode}
      message={errorMessage}
      title="결제 오류"
    />
  );
}
