/**
 * Payments Feature Types
 * 결제 관련 타입 정의
 */

export interface Payment {
  paymentId: number;
  paymentKey: string;
  orderId: string;
  orderName: string;
  totalAmount: number;
  status: PaymentStatus;
  receiptUrl: string;
  userId?: string;
  approvedAt: string;
  requestedAt: string;
  createdAt: string;
}

export type PaymentStatus = "pending" | "approved" | "failed" | "cancelled" | "refunded";

export interface PaymentRequest {
  orderId: string;
  orderName: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentKey?: string;
  receiptUrl?: string;
  error?: string;
}
