/**
 * Solapi Notification Service
 * SMS/카카오 알림톡을 통한 알림 발송 서비스
 */
import crypto from "crypto";
import type {
  SolapiConfig,
  SendNotificationResult,
  WarrantyApprovalData,
  WarrantyRejectionData,
} from "./types";

// =============================================================================
// Configuration
// =============================================================================

function getSolapiConfig(): SolapiConfig {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PF_ID || "";
  const templateId = process.env.SOLAPI_TEMPLATE_ID || "";
  const senderNumber = "07077038005";

  if (!apiKey || !apiSecret) {
    throw new Error("SOLAPI_API_KEY, SOLAPI_API_SECRET must be set");
  }

  return { apiKey, apiSecret, pfId, templateId, senderNumber };
}

function generateAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function formatPhoneNumber(phoneNumber: string, includeCountryCode = false): string {
  let formatted = phoneNumber.replace(/-/g, "").replace(/\s/g, "");

  if (includeCountryCode) {
    if (formatted.startsWith("0")) {
      formatted = "82" + formatted.substring(1);
    }
    if (!formatted.startsWith("82")) {
      formatted = "82" + formatted;
    }
  }

  return formatted;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

// =============================================================================
// OTP Functions
// =============================================================================

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendAlimtalkOTP(
  phoneNumber: string,
  otp: string
): Promise<SendNotificationResult> {
  const config = getSolapiConfig();
  const formattedPhone = formatPhoneNumber(phoneNumber, true);
  const authHeader = generateAuthHeader(config.apiKey, config.apiSecret);

  const requestBody = {
    messages: [
      {
        to: formattedPhone,
        from: config.senderNumber,
        kakaoOptions: {
          pfId: config.pfId,
          templateId: config.templateId,
          variables: {
            "#{인증번호}": otp,
          },
        },
      },
    ],
  };

  try {
    const response = await fetch("https://api.solapi.com/messages/v4/send-many", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Solapi API Error:", result);
      return {
        success: false,
        error: result.errorMessage || "알림톡 발송에 실패했습니다.",
      };
    }

    if (result.groupId) {
      console.log("알림톡 발송 성공:", result.groupId);
      return { success: true, messageId: result.groupId };
    }

    return { success: false, error: "알림톡 발송 응답이 올바르지 않습니다." };
  } catch (error) {
    console.error("Solapi request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림톡 발송 중 오류가 발생했습니다.",
    };
  }
}

export async function sendSmsOTP(
  phoneNumber: string,
  otp: string
): Promise<SendNotificationResult> {
  const config = getSolapiConfig();
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const authHeader = generateAuthHeader(config.apiKey, config.apiSecret);

  const requestBody = {
    message: {
      to: formattedPhone,
      from: config.senderNumber,
      text: `[썬데이허그] 인증번호는 [${otp}] 입니다. 5분 이내에 입력해주세요.`,
    },
  };

  try {
    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Solapi SMS Error:", result);
      return {
        success: false,
        error: result.errorMessage || result.message || "SMS 발송에 실패했습니다.",
      };
    }

    if (result.groupId || result.messageId) {
      console.log("SMS 발송 성공:", result.groupId || result.messageId);
      return { success: true, messageId: result.groupId || result.messageId };
    }

    return { success: false, error: "SMS 발송 응답이 올바르지 않습니다." };
  } catch (error) {
    console.error("Solapi SMS request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS 발송 중 오류가 발생했습니다.",
    };
  }
}

// =============================================================================
// Warranty Notifications
// =============================================================================

export async function sendWarrantyApprovalAlimtalk(
  phoneNumber: string,
  data: WarrantyApprovalData
): Promise<SendNotificationResult> {
  const config = getSolapiConfig();
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const authHeader = generateAuthHeader(config.apiKey, config.apiSecret);

  const requestBody = {
    message: {
      to: formattedPhone,
      from: config.senderNumber,
      kakaoOptions: {
        pfId: "KA01PF23042615382308323ou8Ro12HU",
        templateId: "KA01TP251128085755946WibuPW0VFxq",
        variables: {
          "#{고객명}": data.customerName || "-",
          "#{제품명}": data.productName || "-",
          "#{보증서번호}": data.warrantyNumber,
          "#{시작일}": formatDate(data.startDate),
          "#{종료일}": formatDate(data.endDate),
        },
      },
    },
  };

  try {
    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Solapi 알림톡 Error:", result);
      return {
        success: false,
        error: result.errorMessage || result.message || "알림톡 발송에 실패했습니다.",
      };
    }

    if (result.groupId || result.messageId) {
      console.log("보증서 승인 알림톡 발송 성공:", result.groupId || result.messageId);
      return { success: true, messageId: result.groupId || result.messageId };
    }

    return { success: false, error: "알림톡 발송 응답이 올바르지 않습니다." };
  } catch (error) {
    console.error("Solapi 알림톡 request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림톡 발송 중 오류가 발생했습니다.",
    };
  }
}

export async function sendWarrantyRejectionAlimtalk(
  phoneNumber: string,
  data: WarrantyRejectionData
): Promise<SendNotificationResult> {
  const config = getSolapiConfig();
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const authHeader = generateAuthHeader(config.apiKey, config.apiSecret);

  const requestBody = {
    message: {
      to: formattedPhone,
      from: config.senderNumber,
      kakaoOptions: {
        pfId: "KA01PF23042615382308323ou8Ro12HU",
        templateId: "KA01TP251128085827799xO30EZztM9n",
        variables: {
          "#{고객명}": data.customerName || "-",
          "#{거절사유}": data.rejectionReason || "사유 미기재",
          "#{등록URL}": data.registerUrl,
        },
      },
    },
  };

  try {
    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Solapi 알림톡 Error:", result);
      return {
        success: false,
        error: result.errorMessage || result.message || "알림톡 발송에 실패했습니다.",
      };
    }

    if (result.groupId || result.messageId) {
      console.log("보증서 거절 알림톡 발송 성공:", result.groupId || result.messageId);
      return { success: true, messageId: result.groupId || result.messageId };
    }

    return { success: false, error: "알림톡 발송 응답이 올바르지 않습니다." };
  } catch (error) {
    console.error("Solapi 알림톡 request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림톡 발송 중 오류가 발생했습니다.",
    };
  }
}
