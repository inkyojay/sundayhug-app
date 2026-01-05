/**
 * Notification Service
 * 알림 서비스 공개 API
 *
 * SMS, 카카오 알림톡을 통한 알림 발송 기능을 제공합니다.
 */

// Types
export type {
  SendNotificationResult,
  WarrantyApprovalData,
  WarrantyRejectionData,
} from "./types";

// OTP Functions
export { generateOTP, sendAlimtalkOTP, sendSmsOTP } from "./solapi.server";

// Warranty Notifications
export {
  sendWarrantyApprovalAlimtalk,
  sendWarrantyRejectionAlimtalk,
} from "./solapi.server";
