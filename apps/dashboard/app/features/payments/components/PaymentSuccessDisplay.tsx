/**
 * 결제 성공 표시 컴포넌트
 *
 * 결제 성공 시 결과 정보를 표시
 */

interface PaymentSuccessDisplayProps {
  data: Record<string, unknown>;
  title?: string;
  description?: string;
}

export function PaymentSuccessDisplay({
  data,
  title = "결제 완료",
  description = "Toss API를 통해 결제가 확인되었습니다.",
}: PaymentSuccessDisplayProps) {
  return (
    <div className="flex flex-col items-start gap-10 overflow-x-scroll">
      <h1 className="text-center text-4xl font-semibold tracking-tight lg:text-5xl">
        {title}
      </h1>

      <p className="text-muted-foreground text-lg font-medium">
        {description}
        <br />
        <br />
        Toss에서 받은 데이터입니다.
      </p>

      <pre className="break-all">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
