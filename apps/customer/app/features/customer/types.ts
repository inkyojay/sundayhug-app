/**
 * Customer Feature Types
 * 고객 서비스 허브 관련 타입 정의
 */

export interface ServiceHub {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  enabled: boolean;
}

export interface EventReview {
  id: string;
  userId?: string;
  eventId: string;
  content: string;
  rating: number;
  photos?: string[];
  createdAt: string;
}

export interface MyPageStats {
  warrantyCount: number;
  analysisCount: number;
  asRequestCount: number;
  pointBalance: number;
}
