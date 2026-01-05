/**
 * 채널 맵핑 상세 컴포넌트
 */
import { StoreIcon, ShoppingBagIcon, ExternalLinkIcon } from "lucide-react";
import { Badge } from "~/core/components/ui/badge";
import type { ChannelMapping } from "../lib/inventory.shared";
import { formatOptions } from "../lib/inventory.shared";

interface ChannelMappingDetailProps {
  mapping: ChannelMapping;
}

export function ChannelMappingDetail({ mapping }: ChannelMappingDetailProps) {
  if (!mapping.cafe24.length && !mapping.naver.length) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        채널에 맵핑된 상품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/30">
      {/* Cafe24 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
            <StoreIcon className="w-3 h-3 text-white" />
          </div>
          Cafe24 ({mapping.cafe24.length}개)
        </div>
        {mapping.cafe24.length === 0 ? (
          <div className="text-xs text-muted-foreground">맵핑 없음</div>
        ) : (
          <div className="space-y-1">
            {mapping.cafe24.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white rounded border text-xs"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">
                      {item.product_name || `상품 #${item.product_no}`}
                    </span>
                    <button
                      className="p-0.5 hover:bg-muted rounded text-blue-500 flex-shrink-0"
                      onClick={() =>
                        window.open(
                          `https://sundayhug.kr/surl/p/${item.product_no}`,
                          "_blank"
                        )
                      }
                      title="Cafe24에서 보기"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-muted-foreground truncate">
                    {formatOptions(item.options) || item.variant_code}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={item.stock_quantity > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {item.stock_quantity}
                  </Badge>
                  {item.selling === "T" && item.display === "T" ? (
                    <span className="text-green-600 text-[10px]">판매중</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">미판매</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 네이버 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
            <ShoppingBagIcon className="w-3 h-3 text-white" />
          </div>
          네이버 스마트스토어 ({mapping.naver.length}개)
        </div>
        {mapping.naver.length === 0 ? (
          <div className="text-xs text-muted-foreground">맵핑 없음</div>
        ) : (
          <div className="space-y-1">
            {mapping.naver.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white rounded border text-xs"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">
                      {item.product_name || `상품 #${item.origin_product_no}`}
                    </span>
                    <button
                      className="p-0.5 hover:bg-muted rounded text-green-500 flex-shrink-0"
                      onClick={() => {
                        const productNo =
                          item.channel_product_no || item.origin_product_no;
                        window.open(
                          `https://brand.naver.com/sundayhug/products/${productNo}`,
                          "_blank"
                        );
                      }}
                      title="스마트스토어에서 보기"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-muted-foreground truncate">
                    {[
                      item.option_name1 && item.option_value1
                        ? `${item.option_name1}: ${item.option_value1}`
                        : null,
                      item.option_name2 && item.option_value2
                        ? `${item.option_name2}: ${item.option_value2}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "단일옵션"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={item.stock_quantity > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {item.stock_quantity}
                  </Badge>
                  {item.use_yn === "Y" ? (
                    <span className="text-green-600 text-[10px]">사용</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">미사용</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
