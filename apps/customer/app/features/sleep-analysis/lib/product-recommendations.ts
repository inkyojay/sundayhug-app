/**
 * 수면 분석 결과 기반 제품 추천 시스템
 * 
 * DB 기반 동적 제품 추천:
 * - Admin에서 제품/키워드 관리
 * - 분석 결과 키워드 매칭으로 추천
 */

// 제품 타입 정의 (DB 스키마와 일치)
export interface Product {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  original_price: number | null;
  purchase_url: string;
  category: string;
  keywords: string[];
  age_range: string;
  badge: string | null;
  display_order: number;
  is_active: boolean;
}

// 위험도에 따른 가중치
const RISK_WEIGHT: Record<string, number> = {
  "High": 3,
  "Medium": 2,
  "Low": 1,
  "Info": 0.5,
};

export interface FeedbackItem {
  id: number;
  title: string;
  feedback: string;
  riskLevel: string;
  x: number;
  y: number;
}

export interface RecommendationResult {
  product: Product;
  score: number;
  reasons: string[];
}

/**
 * DB에서 가져온 제품 목록 기반 추천
 * @param products - DB에서 가져온 활성 제품 목록
 * @param feedbackItems - 분석 피드백 항목들
 * @param babyAgeMonths - 아기 월령 (선택)
 * @returns 추천 제품 목록 (점수순 정렬)
 */
export function getProductRecommendationsFromDB(
  products: Product[],
  feedbackItems: FeedbackItem[],
  babyAgeMonths?: number
): RecommendationResult[] {
  const recommendations: RecommendationResult[] = [];

  // 각 제품에 대해 점수 계산
  for (const product of products) {
    if (!product.is_active) continue;

    // 월령에 따른 필터링
    if (product.age_range === "newborn" && babyAgeMonths !== undefined && babyAgeMonths >= 3) {
      continue;
    }
    if (product.age_range === "3m+" && babyAgeMonths !== undefined && babyAgeMonths < 3) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    // 각 피드백 항목에서 키워드 매칭
    for (const item of feedbackItems) {
      const weight = RISK_WEIGHT[item.riskLevel] || 1;
      const text = `${item.title} ${item.feedback}`.toLowerCase();

      // 제품의 키워드와 매칭
      for (const keyword of product.keywords || []) {
        if (text.includes(keyword.toLowerCase())) {
          score += weight;
          if (!reasons.includes(item.title)) {
            reasons.push(item.title);
          }
          break; // 같은 피드백 항목에서 중복 점수 방지
        }
      }
    }

    if (score > 0) {
      recommendations.push({ product, score, reasons });
    }
  }

  // 점수 높은 순 → display_order 순 정렬, 최대 4개 반환
  return recommendations
    .sort((a, b) => b.score - a.score || a.product.display_order - b.product.display_order)
    .slice(0, 4);
}

/**
 * 클라이언트용 간단 추천 (하드코딩 폴백)
 * DB 연동 전 또는 오류 시 사용
 */
export function getProductRecommendations(
  feedbackItems: FeedbackItem[],
  babyAgeMonths?: number
): RecommendationResult[] {
  // 폴백: 빈 배열 반환 (서버에서 DB 데이터로 처리)
  return [];
}

/**
 * 제품 가격 포맷팅
 */
export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

/**
 * 할인율 계산
 */
export function getDiscountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round((1 - price / originalPrice) * 100);
}

