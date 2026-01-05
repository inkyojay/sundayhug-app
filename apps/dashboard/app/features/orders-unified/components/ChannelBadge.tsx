/**
 * 채널 배지 컴포넌트
 *
 * cafe24: 파랑, naver: 초록, coupang: 주황
 */
import { getChannelConfig } from "../lib/orders-unified.shared";

interface ChannelBadgeProps {
  channel: string;
}

export function ChannelBadge({ channel }: ChannelBadgeProps) {
  const config = getChannelConfig(channel);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
