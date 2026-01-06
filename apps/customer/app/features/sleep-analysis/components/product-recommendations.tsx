/**
 * 수면 분석 결과 기반 제품 추천 카드 컴포넌트
 */
import { ExternalLink, ShoppingBag, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "~/core/lib/utils";

import type { RecommendationResult, Product } from "../lib/product-recommendations";

// 가격 포맷팅
function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

// 할인율 계산
function getDiscountPercent(price: number, originalPrice?: number | null): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round((1 - price / originalPrice) * 100);
}

interface ProductCardProps {
  product: Product;
  reasons?: string[];
  compact?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

// 단일 제품 카드
function ProductCard({ product, reasons, compact = false, t }: ProductCardProps) {
  const discount = getDiscountPercent(product.price, product.original_price);
  
  return (
    <a
      href={product.purchase_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block bg-white rounded-2xl border border-gray-100 overflow-hidden",
        "hover:shadow-lg hover:border-[#FF6B35]/30 transition-all duration-300",
        "active:scale-[0.98]"
      )}
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/placeholder-product.png";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
          </div>
        )}
        
        {/* 뱃지 */}
        {product.badge && (
          <span className={cn(
            "absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold",
            product.badge === "BEST" && "bg-[#FF6B35] text-white",
            product.badge === "NEW" && "bg-blue-500 text-white",
            product.badge === "인기" && "bg-pink-500 text-white",
            product.badge === "신생아 추천" && "bg-purple-500 text-white",
            !["BEST", "NEW", "인기", "신생아 추천"].includes(product.badge) && "bg-gray-700 text-white",
          )}>
            {product.badge}
          </span>
        )}
        
        {/* 할인율 */}
        {discount && (
          <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
            {discount}%
          </span>
        )}
      </div>
      
      {/* 정보 영역 */}
      <div className={cn("p-3", compact ? "p-2.5" : "p-3")}>
        <h4 className={cn(
          "font-semibold text-gray-900 line-clamp-1 mb-1",
          compact ? "text-sm" : "text-base"
        )}>
          {product.short_name}
        </h4>
        
        {!compact && product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2 min-h-[32px]">
            {product.description}
          </p>
        )}
        
        {/* 가격 */}
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-bold text-[#FF6B35]",
            compact ? "text-sm" : "text-base"
          )}>
            {formatPrice(product.price)}
          </span>
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
        
        {/* 추천 이유 (compact 모드에서는 숨김) */}
        {!compact && reasons && reasons.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <Sparkles className="inline w-3 h-3 mr-1 text-[#FF6B35]" />
              {t("sleep-analysis:result.product.relatedRecommendation", { reason: reasons[0], defaultValue: `${reasons[0]} 관련 추천` })}
            </p>
          </div>
        )}

        {/* 구매하기 버튼 */}
        <div className={cn(
          "flex items-center justify-center gap-1 mt-2 py-2 rounded-xl",
          "bg-gray-100 text-gray-700 group-hover:bg-[#FF6B35] group-hover:text-white",
          "transition-colors duration-200 text-sm font-medium"
        )}>
          <ShoppingBag className="w-4 h-4" />
          <span>{t("sleep-analysis:result.product.buy", { defaultValue: "구매하기" })}</span>
          <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
        </div>
      </div>
    </a>
  );
}

interface ProductRecommendationsProps {
  recommendations: RecommendationResult[];
  className?: string;
}

// 추천 제품 섹션
export function ProductRecommendations({ recommendations, className }: ProductRecommendationsProps) {
  const { t } = useTranslation(["sleep-analysis", "common"]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-5 md:p-6", className)}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{t("sleep-analysis:result.product.title", { defaultValue: "맞춤 제품 추천" })}</h3>
          <p className="text-sm text-gray-500">{t("sleep-analysis:result.product.subtitle", { defaultValue: "분석 결과에 따른 추천 제품이에요" })}</p>
        </div>
      </div>

      {/* 제품 그리드 */}
      <div className={cn(
        "grid gap-3",
        recommendations.length === 1 && "grid-cols-1 max-w-xs mx-auto",
        recommendations.length === 2 && "grid-cols-2",
        recommendations.length >= 3 && "grid-cols-2 md:grid-cols-4",
      )}>
        {recommendations.map((rec) => (
          <ProductCard
            key={rec.product.id}
            product={rec.product}
            reasons={rec.reasons}
            compact={recommendations.length >= 3}
            t={t}
          />
        ))}
      </div>

      {/* 전체 제품 보기 링크 */}
      <div className="mt-4 text-center">
        <a
          href="https://smartstore.naver.com/sundayhug-kr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[#FF6B35] hover:underline"
        >
          {t("sleep-analysis:result.product.viewAll", { defaultValue: "썬데이허그 전체 제품 보기" })}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default ProductRecommendations;

