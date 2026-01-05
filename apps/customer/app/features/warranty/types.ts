/**
 * Warranty Feature Types
 * 보증서 관련 타입 정의
 */

export interface Warranty {
  id: string;
  warrantyNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  status: WarrantyStatus;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export type WarrantyStatus = "pending" | "approved" | "rejected" | "expired";

export interface ASRequest {
  id: string;
  warrantyId: string;
  description: string;
  status: ASStatus;
  createdAt: string;
}

export type ASStatus = "pending" | "in_progress" | "completed" | "cancelled";
