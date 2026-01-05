/**
 * 채널 배지 컴포넌트
 */
import { getChannelInfo } from "../lib/returns.shared";

interface ChannelBadgeProps {
  channel: string;
}

export function ChannelBadge({ channel }: ChannelBadgeProps) {
  const channelInfo = getChannelInfo(channel);

  const channelColors: Record<string, string> = {
    cafe24: "bg-blue-100 text-blue-800",
    naver: "bg-green-100 text-green-800",
    coupang: "bg-red-100 text-red-800",
    "11st": "bg-orange-100 text-orange-800",
    gmarket: "bg-purple-100 text-purple-800",
    auction: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${channelColors[channel] || channelColors.other}`}
    >
      {channelInfo?.label || channel}
    </span>
  );
}
