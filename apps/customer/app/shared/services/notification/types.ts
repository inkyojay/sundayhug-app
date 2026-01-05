/**
 * Notification Service Types
 * 알림 서비스 관련 타입 정의
 */

export interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  pfId: string;
  templateId: string;
  senderNumber: string;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WarrantyApprovalData {
  customerName: string;
  productName: string;
  warrantyNumber: string;
  startDate: string;
  endDate: string;
}

export interface WarrantyRejectionData {
  customerName: string;
  rejectionReason: string;
  registerUrl: string;
}
