/**
 * Solapi 카카오 알림톡 Service
 *
 * 카카오 알림톡을 통한 인증번호 발송 기능을 제공합니다.
 * Solapi API를 사용하여 알림톡을 발송합니다.
 */
import crypto from "crypto";

interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  pfId: string; // 카카오 채널 ID
  templateId: string; // 알림톡 템플릿 ID
  senderNumber: string; // 발신번호
}

interface SendAlimtalkResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Solapi 설정 가져오기 (SMS용 - pfId, templateId는 선택)
 */
function getSolapiConfig(): SolapiConfig {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PF_ID || "";
  const templateId = process.env.SOLAPI_TEMPLATE_ID || "";
  // 발신번호: 반드시 Solapi에 등록된 번호 사용
  const senderNumber = "07077038005";

  if (!apiKey || !apiSecret) {
    throw new Error(
      "SOLAPI_API_KEY, SOLAPI_API_SECRET must be set"
    );
  }

  return { apiKey, apiSecret, pfId, templateId, senderNumber };
}

/**
 * Solapi API 인증 헤더 생성
 */
function generateAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 6자리 인증번호 생성
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 카카오 알림톡으로 인증번호 발송
 */
export async function sendAlimtalkOTP(
  phoneNumber: string,
  otp: string
): Promise<SendAlimtalkResult> {
  const config = getSolapiConfig();

  // 전화번호 포맷 정리 (하이픈 제거, 국가코드 추가)
  let formattedPhone = phoneNumber.replace(/-/g, "").replace(/\s/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "82" + formattedPhone.substring(1);
  }
  if (!formattedPhone.startsWith("82")) {
    formattedPhone = "82" + formattedPhone;
  }

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
    console.log("📤 알림톡 발송 요청:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch("https://api.solapi.com/messages/v4/send-many", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("📥 알림톡 응답:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ Solapi API Error:", result);
      return {
        success: false,
        error: result.errorMessage || "알림톡 발송에 실패했습니다.",
      };
    }

    // 성공 응답 처리
    if (result.groupId) {
      console.log("✅ 알림톡 발송 성공:", result.groupId);
      return {
        success: true,
        messageId: result.groupId,
      };
    }

    return {
      success: false,
      error: "알림톡 발송 응답이 올바르지 않습니다.",
    };
  } catch (error) {
    console.error("❌ Solapi request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림톡 발송 중 오류가 발생했습니다.",
    };
  }
}

// =============================================================================
// 보증서 승인 알림톡
// =============================================================================

interface WarrantyApprovalData {
  customerName: string;     // 구매자명
  productName: string;      // 제품명
  warrantyNumber: string;   // 보증서번호
  startDate: string;        // 보증시작일 (YYYY-MM-DD 또는 YYYY. M. D. 형식)
  endDate: string;          // 보증종료일
}

/**
 * 보증서 승인 알림톡 발송
 * Template ID: KA01TP251128085755946WibuPW0VFxq
 * PF ID: KA01PF23042615382308323ou8Ro12HU
 */
export async function sendWarrantyApprovalAlimtalk(
  phoneNumber: string,
  data: WarrantyApprovalData
): Promise<SendAlimtalkResult> {
  const config = getSolapiConfig();

  // 전화번호 포맷 정리 (하이픈 제거)
  const formattedPhone = phoneNumber.replace(/-/g, "").replace(/\s/g, "");

  const authHeader = generateAuthHeader(config.apiKey, config.apiSecret);

  // 날짜 포맷 변환 (YYYY-MM-DD → YYYY. M. D.)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  };

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
    console.log("📤 보증서 승인 알림톡 발송 요청:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("📥 알림톡 응답:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ Solapi 알림톡 Error:", result);
      return {
        success: false,
        error: result.errorMessage || result.message || "알림톡 발송에 실패했습니다.",
      };
    }

    // 성공 응답 확인
    if (result.groupId || result.messageId) {
      console.log("✅ 보증서 승인 알림톡 발송 성공:", result.groupId || result.messageId);
      return {
        success: true,
        messageId: result.groupId || result.messageId,
      };
    }

    return {
      success: false,
      error: "알림톡 발송 응답이 올바르지 않습니다.",
    };
  } catch (error) {
    console.error("❌ Solapi 알림톡 request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림톡 발송 중 오류가 발생했습니다.",
    };
  }
}

// =============================================================================
// SMS OTP 발송
// =============================================================================

/**
 * SMS로 인증번호 발송
 * 참고: https://developers.solapi.com/references/messages/sendManyDetail
 */
export async function sendSmsOTP(
  phoneNumber: string,
  otp: string
): Promise<SendAlimtalkResult> {
  const config = getSolapiConfig();

  // 전화번호 포맷 정리 (하이픈 제거만, 국가코드 없이)
  const formattedPhone = phoneNumber.replace(/-/g, "").replace(/\s/g, "");

  const authHeader = generateAuthHeader(config.apiKey, config.apiSecret);

  // Solapi API 문서 기반 요청 형식
  const requestBody = {
    message: {
      to: formattedPhone,
      from: config.senderNumber,
      text: `[썬데이허그] 인증번호는 [${otp}] 입니다. 5분 이내에 입력해주세요.`,
    },
  };

  try {
    console.log("📤 SMS 발송 요청:", JSON.stringify(requestBody, null, 2));
    console.log("📤 발신번호:", config.senderNumber);
    console.log("📤 수신번호:", formattedPhone);
    
    const response = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("📥 SMS 응답:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ Solapi SMS Error:", result);
      return {
        success: false,
        error: result.errorMessage || result.message || "SMS 발송에 실패했습니다.",
      };
    }

    // 성공 응답 확인
    if (result.groupId || result.messageId) {
      console.log("✅ SMS 발송 성공:", result.groupId || result.messageId);
      return {
        success: true,
        messageId: result.groupId || result.messageId,
      };
    }

    return {
      success: false,
      error: "SMS 발송 응답이 올바르지 않습니다.",
    };
  } catch (error) {
    console.error("❌ Solapi SMS request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS 발송 중 오류가 발생했습니다.",
    };
  }
}

