/**
 * 재고 프로그레스 바 컴포넌트
 */

interface StockProgressBarProps {
  current: number;
  threshold: number;
}

export function StockProgressBar({ current, threshold }: StockProgressBarProps) {
  const maxStock = Math.max(threshold * 3, 50);
  const percentage = Math.min((current / maxStock) * 100, 100);
  const thresholdPercentage = (threshold / maxStock) * 100;

  let barColor = "bg-emerald-500";
  if (current === 0) barColor = "bg-red-500";
  else if (current <= threshold) barColor = "bg-amber-500";

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-medium w-10 text-right text-sm">{current}</span>
      <div
        className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden"
        style={{ minWidth: 60 }}
      >
        <div
          className={`absolute left-0 top-0 h-full ${barColor} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-gray-400"
          style={{ left: `${thresholdPercentage}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">안전:{threshold}</span>
    </div>
  );
}
