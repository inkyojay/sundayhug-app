/**
 * 고객 행동 분석 타입 정의
 */

// ===== RFM 타입 =====

export interface RFMScore {
  customerId: string;
  customerName: string;
  customerPhone: string;
  recency: number;      // 마지막 구매일로부터 일수
  frequency: number;    // 구매 횟수
  monetary: number;     // 총 구매 금액
  rScore: number;       // 1-5 등급
  fScore: number;       // 1-5 등급
  mScore: number;       // 1-5 등급
  segment: CustomerSegment;
  firstPurchase: string | null;
  lastPurchase: string | null;
}

export type CustomerSegment =
  | 'Champions'
  | 'Loyal Customers'
  | 'Potential Loyalists'
  | 'New Customers'
  | 'Promising'
  | 'Need Attention'
  | 'About To Sleep'
  | 'At Risk'
  | "Can't Lose Them"
  | 'Hibernating'
  | 'Lost';

export interface SegmentInfo {
  name: CustomerSegment;
  description: string;
  color: string;
  bgColor: string;
}

export interface RFMSummary {
  totalCustomers: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
}

export interface SegmentDistribution {
  segment: CustomerSegment;
  count: number;
  percentage: number;
  color: string;
}

// ===== LTV 타입 =====

export interface LTVData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  ltv: number;
  orderCount: number;
  avgOrderValue: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
  customerLifetimeDays: number;
}

export interface LTVSummary {
  avgLTV: number;
  top10PercentLTV: number;
  bottom50PercentLTV: number;
  medianLTV: number;
  totalLTV: number;
}

export interface LTVDistribution {
  range: string;
  count: number;
  minValue: number;
  maxValue: number;
}

// ===== 코호트 타입 =====

export interface CohortData {
  cohortMonth: string;
  monthsSinceFirst: number;
  customers: number;
  retentionRate: number;
}

export interface CohortRow {
  cohortMonth: string;
  totalCustomers: number;
  retentionByMonth: Record<number, number>; // monthsSinceFirst -> retention rate
}

// ===== 세그먼트 상수 =====

export const SEGMENT_INFO: Record<CustomerSegment, SegmentInfo> = {
  'Champions': {
    name: 'Champions',
    description: '최근에 구매하고, 자주 구매하며, 많이 지출하는 최고 고객',
    color: '#F59E0B', // 금색
    bgColor: 'bg-amber-100',
  },
  'Loyal Customers': {
    name: 'Loyal Customers',
    description: '정기적으로 구매하는 충성 고객',
    color: '#3B82F6', // 파란색
    bgColor: 'bg-blue-100',
  },
  'Potential Loyalists': {
    name: 'Potential Loyalists',
    description: '최근 구매 고객 중 충성 고객이 될 가능성이 높은 고객',
    color: '#10B981', // 에메랄드
    bgColor: 'bg-emerald-100',
  },
  'New Customers': {
    name: 'New Customers',
    description: '최근에 첫 구매를 한 신규 고객',
    color: '#8B5CF6', // 보라색
    bgColor: 'bg-violet-100',
  },
  'Promising': {
    name: 'Promising',
    description: '최근 구매자 중 아직 자주 구매하지 않는 고객',
    color: '#06B6D4', // 청록색
    bgColor: 'bg-cyan-100',
  },
  'Need Attention': {
    name: 'Need Attention',
    description: '평균 이상이었지만 최근 구매가 뜸한 고객',
    color: '#F97316', // 주황색
    bgColor: 'bg-orange-100',
  },
  'About To Sleep': {
    name: 'About To Sleep',
    description: '평균 이하의 최근성, 빈도, 금액을 보이는 고객',
    color: '#A855F7', // 자주색
    bgColor: 'bg-purple-100',
  },
  'At Risk': {
    name: 'At Risk',
    description: '이전에 자주 구매했지만 오랫동안 구매하지 않은 고객',
    color: '#EF4444', // 빨간색
    bgColor: 'bg-red-100',
  },
  "Can't Lose Them": {
    name: "Can't Lose Them",
    description: '이전에 가장 많이 구매했지만 최근 구매가 없는 VIP 고객',
    color: '#DC2626', // 진한 빨간색
    bgColor: 'bg-red-200',
  },
  'Hibernating': {
    name: 'Hibernating',
    description: '마지막 구매 이후 오랜 시간이 지난 휴면 고객',
    color: '#6B7280', // 회색
    bgColor: 'bg-gray-100',
  },
  'Lost': {
    name: 'Lost',
    description: '가장 오래전에 구매하고 가장 적게 구매한 고객',
    color: '#9CA3AF', // 연한 회색
    bgColor: 'bg-gray-200',
  },
};

// ===== 통합 데이터 타입 =====

export interface CustomerAnalyticsData {
  rfm: {
    scores: RFMScore[];
    summary: RFMSummary;
    segmentDistribution: SegmentDistribution[];
  };
  ltv: {
    data: LTVData[];
    summary: LTVSummary;
    distribution: LTVDistribution[];
  };
  cohort: CohortRow[];
}
