/**
 * 수면 분석 결과 기반 제품 추천 시스템
 * 
 * 분석 항목별 추천 제품:
 * - 침대/낙상 위험 → ABC 아기침대
 * - 이불/질식 위험 → 슬리핑백 (3개월+), 꿀잠 속싸개 (3개월 미만)
 * - 온도/환기 → 메쉬 바디수트, 에어메쉬 제품
 * - 수면 환경 전반 → 백색소음기
 */

// 제품 타입 정의
export interface Product {
  id: string;
  name: string;
  shortName: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  link: string;
  category: ProductCategory;
  ageRange?: "newborn" | "3m+" | "all";
  badge?: string;
}

export type ProductCategory = 
  | "bed_safety"      // 침대/낙상
  | "suffocation"     // 이불/질식
  | "temperature"     // 온도/환기
  | "sleep_general";  // 수면 환경 전반

// 제품 데이터베이스
export const PRODUCTS: Product[] = [
  // 침대/낙상 위험 관련
  {
    id: "abc-bed",
    name: "썬데이허그 ABC 접이식 아기침대",
    shortName: "ABC 아기침대",
    description: "안전한 수면을 위한 접이식 아기침대. 낙상 방지 설계로 안심하고 재울 수 있어요.",
    image: "/images/products/abc-bed.webp",
    price: 189000,
    originalPrice: 219000,
    link: "https://smartstore.naver.com/sundayhug-kr/products/5082543982",
    category: "bed_safety",
    ageRange: "all",
    badge: "BEST",
  },
  
  // 이불/질식 위험 관련 - 3개월 이상
  {
    id: "sleeping-bag",
    name: "썬데이허그 슬리핑백",
    shortName: "슬리핑백",
    description: "이불 걷어참 걱정 없이 편안하게! 질식 위험 없는 안전한 수면 환경을 만들어줘요.",
    image: "/images/products/sleeping-bag.webp",
    price: 49000,
    originalPrice: 59000,
    link: "https://smartstore.naver.com/sundayhug-kr/products/6847218037",
    category: "suffocation",
    ageRange: "3m+",
    badge: "인기",
  },
  
  // 이불/질식 위험 관련 - 신생아
  {
    id: "swaddle",
    name: "썬데이허그 꿀잠 속싸개",
    shortName: "꿀잠 속싸개",
    description: "신생아 모로반사 방지! 편안하게 감싸서 깊은 잠을 자게 해줘요.",
    image: "/images/products/swaddle.webp",
    price: 35000,
    originalPrice: 42000,
    link: "https://smartstore.naver.com/sundayhug-kr/products/6215889505",
    category: "suffocation",
    ageRange: "newborn",
    badge: "신생아 추천",
  },
  
  // 온도/환기 관련
  {
    id: "mesh-bodysuit",
    name: "썬데이허그 메쉬 반팔 바디수트",
    shortName: "메쉬 바디수트",
    description: "통기성 좋은 메쉬 소재로 땀띠 없이 시원하게! 여름철 필수 아이템.",
    image: "/images/products/mesh-bodysuit.webp",
    price: 19000,
    link: "https://smartstore.naver.com/sundayhug-kr/products/10089162095",
    category: "temperature",
    ageRange: "all",
  },
  {
    id: "airmesh-mat",
    name: "썬데이허그 에어메쉬 쿨매트",
    shortName: "에어메쉬 쿨매트",
    description: "3D 에어메쉬로 습기 배출! 땀이 많은 아기도 쾌적하게.",
    image: "/images/products/airmesh-mat.webp",
    price: 39000,
    originalPrice: 49000,
    link: "https://smartstore.naver.com/sundayhug-kr/products/6649879234",
    category: "temperature",
    ageRange: "all",
  },
  
  // 수면 환경 전반
  {
    id: "white-noise",
    name: "썬데이허그 꿀잠 백색소음기",
    shortName: "백색소음기",
    description: "10가지 자연 사운드로 깊은 수면 유도. 자동 꺼짐 타이머 기능!",
    image: "/images/products/white-noise.webp",
    price: 29000,
    originalPrice: 35000,
    link: "https://smartstore.naver.com/sundayhug-kr/products/9099385702",
    category: "sleep_general",
    ageRange: "all",
    badge: "NEW",
  },
];

// 분석 키워드 → 카테고리 매핑
const KEYWORD_CATEGORY_MAP: Record<string, ProductCategory[]> = {
  // 침대/낙상 관련 키워드
  "침대": ["bed_safety"],
  "낙상": ["bed_safety"],
  "떨어": ["bed_safety"],
  "가장자리": ["bed_safety"],
  "난간": ["bed_safety"],
  "바닥": ["bed_safety"],
  "높이": ["bed_safety"],
  "추락": ["bed_safety"],
  
  // 이불/질식 관련 키워드
  "이불": ["suffocation"],
  "질식": ["suffocation"],
  "담요": ["suffocation"],
  "베개": ["suffocation"],
  "인형": ["suffocation"],
  "얼굴": ["suffocation"],
  "코": ["suffocation"],
  "입": ["suffocation"],
  "막힘": ["suffocation"],
  "숨": ["suffocation"],
  "덮": ["suffocation"],
  "쿠션": ["suffocation"],
  
  // 온도/환기 관련 키워드
  "온도": ["temperature"],
  "더위": ["temperature"],
  "추위": ["temperature"],
  "환기": ["temperature"],
  "땀": ["temperature"],
  "습도": ["temperature"],
  "덥": ["temperature"],
  "춥": ["temperature"],
  "통풍": ["temperature"],
  "에어컨": ["temperature"],
  "히터": ["temperature"],
  
  // 수면 환경 전반
  "소음": ["sleep_general"],
  "빛": ["sleep_general"],
  "어둡": ["sleep_general"],
  "밝": ["sleep_general"],
  "조명": ["sleep_general"],
  "수면": ["sleep_general"],
  "잠": ["sleep_general"],
};

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
 * 분석 결과 기반 제품 추천
 * @param feedbackItems - 분석 피드백 항목들
 * @param babyAgeMonths - 아기 월령 (선택)
 * @returns 추천 제품 목록 (점수순 정렬)
 */
export function getProductRecommendations(
  feedbackItems: FeedbackItem[],
  babyAgeMonths?: number
): RecommendationResult[] {
  const categoryScores: Record<ProductCategory, { score: number; reasons: string[] }> = {
    bed_safety: { score: 0, reasons: [] },
    suffocation: { score: 0, reasons: [] },
    temperature: { score: 0, reasons: [] },
    sleep_general: { score: 0, reasons: [] },
  };

  // 각 피드백 항목 분석
  for (const item of feedbackItems) {
    const weight = RISK_WEIGHT[item.riskLevel] || 1;
    const text = `${item.title} ${item.feedback}`.toLowerCase();
    
    // 키워드 매칭
    for (const [keyword, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
      if (text.includes(keyword)) {
        for (const category of categories) {
          categoryScores[category].score += weight;
          if (!categoryScores[category].reasons.includes(item.title)) {
            categoryScores[category].reasons.push(item.title);
          }
        }
      }
    }
  }

  // 제품 추천 (카테고리 점수 기반)
  const recommendations: RecommendationResult[] = [];
  
  for (const product of PRODUCTS) {
    const categoryData = categoryScores[product.category];
    
    // 점수가 있는 카테고리의 제품만 추천
    if (categoryData.score > 0) {
      // 월령에 따른 필터링
      if (product.ageRange === "newborn" && babyAgeMonths !== undefined && babyAgeMonths >= 3) {
        continue; // 3개월 이상이면 신생아 제품 제외
      }
      if (product.ageRange === "3m+" && babyAgeMonths !== undefined && babyAgeMonths < 3) {
        continue; // 3개월 미만이면 3m+ 제품 제외
      }
      
      recommendations.push({
        product,
        score: categoryData.score,
        reasons: categoryData.reasons,
      });
    }
  }

  // 점수 높은 순 정렬, 최대 4개 반환
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/**
 * 항상 표시할 기본 추천 (분석 결과와 무관)
 */
export function getDefaultRecommendations(): Product[] {
  return PRODUCTS.filter(p => 
    p.id === "abc-bed" || p.id === "white-noise"
  );
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

