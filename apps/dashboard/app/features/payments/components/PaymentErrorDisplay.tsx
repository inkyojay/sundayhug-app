/**
 * 결제 오류 표시 컴포넌트
 *
 * 결제 실패 시 오류 정보를 표시
 */

interface PaymentErrorDisplayProps {
  code?: string | null;
  message?: string | null;
  title?: string;
}

export function PaymentErrorDisplay({
  code,
  message,
  title = "결제 오류",
}: PaymentErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-red-500 md:text-5xl dark:text-red-400">
        {title}
      </h1>
      {code && (
        <p className="text-muted-foreground text-center">
          오류 코드: {code}
        </p>
      )}
      {message && (
        <p className="text-muted-foreground text-center">{message}</p>
      )}
    </div>
  );
}
