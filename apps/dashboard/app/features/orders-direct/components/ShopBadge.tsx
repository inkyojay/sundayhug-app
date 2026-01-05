import { getShopConfig } from "../lib/orders.shared";

interface ShopBadgeProps {
  shopCd: string;
}

export function ShopBadge({ shopCd }: ShopBadgeProps) {
  const config = getShopConfig(shopCd);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
