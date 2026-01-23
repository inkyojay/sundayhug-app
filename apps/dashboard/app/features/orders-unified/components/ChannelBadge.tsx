/**
 * 채널 배지 컴포넌트
 *
 * cafe24: 파랑, naver: 초록, coupang: 주황
 * + 외부몰 정보 표시 (Cafe24 연동 외부몰)
 */
import { getChannelConfig } from "../lib/orders-unified.shared";

interface ChannelBadgeProps {
  channel: string;
  marketId?: string | null;
  orderPlaceName?: string | null;
}

// 외부몰 ID -> 표시 이름 매핑
const MARKET_NAMES: Record<string, string> = {
  "self": "",  // 자사몰은 표시 안함
  "gmarket": "G마켓",
  "auction": "옥션",
  "11st": "11번가",
  "interpark": "인터파크",
  "tmon": "티몬",
  "wemakeprice": "위메프",
  "coupang": "쿠팡",
  "naver": "네이버",
};

export function ChannelBadge({ channel, marketId, orderPlaceName }: ChannelBadgeProps) {
  const config = getChannelConfig(channel);

  // 외부몰 이름 결정
  let marketName = "";
  if (marketId && marketId !== "self") {
    marketName = MARKET_NAMES[marketId] || orderPlaceName || marketId;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
      {marketName && (
        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
          {marketName}
        </span>
      )}
    </span>
  );
}
