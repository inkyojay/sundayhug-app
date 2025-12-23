/**
 * Card Image Generator (Server-side)
 *
 * 피드백 카드 HTML을 이미지로 변환하는 모듈
 * HCTI (htmlcsstoimage.com) API 사용
 */

// ===== 타입 정의 =====
export interface BadCardData {
  number: number;
  title: string;
  content: string;
  badge: "위험" | "주의";
}

export interface GoodCardData {
  number: number;
  title: string;
  content: string;
}

interface HCTIResponse {
  url: string;
}

// ===== HCTI API 함수 =====

/**
 * HCTI API 인증 정보 가져오기
 */
function getHCTICredentials(): { userId: string; apiKey: string } {
  const userId = process.env.HCTI_USER_ID;
  const apiKey = process.env.HCTI_API_KEY;
  
  if (!userId || !apiKey) {
    throw new Error("HCTI_USER_ID and HCTI_API_KEY environment variables are required");
  }
  
  return { userId, apiKey };
}

/**
 * HTML을 이미지로 변환 (HCTI API)
 */
async function htmlToImage(html: string, css: string = ""): Promise<string> {
  const { userId, apiKey } = getHCTICredentials();
  
  const response = await fetch("https://hcti.io/v1/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + Buffer.from(`${userId}:${apiKey}`).toString("base64"),
    },
    body: JSON.stringify({
      html,
      css,
      google_fonts: "Noto Sans KR",
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HCTI API error: ${response.status} - ${error}`);
  }
  
  const data: HCTIResponse = await response.json();
  return data.url;
}

// ===== Bad 카드 HTML 생성 =====

/**
 * Bad 피드백 카드 HTML 생성
 */
function generateBadCardHTML(card: BadCardData): string {
  const badgeColor = card.badge === "위험" ? "#ef4444" : "#f59e0b";
  const bgColor = card.badge === "위험" ? "#fff1f2" : "#fffbeb";
  const numberBg = card.badge === "위험" ? "#ef4444" : "#f59e0b";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0;">
  <div style="
    width: 800px;
    min-height: 160px;
    background: ${bgColor};
    border-radius: 24px;
    padding: 24px 28px;
    display: flex;
    gap: 20px;
    font-family: 'Noto Sans KR', sans-serif;
    box-sizing: border-box;
  ">
    <div style="
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: ${numberBg};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 22px;
    ">${card.number}</div>
    <div style="flex: 1;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
        <span style="font-weight: 700; font-size: 20px; color: #1f2937;">${card.title}</span>
        <span style="
          background: ${badgeColor};
          color: white;
          padding: 6px 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
        ">${card.badge}</span>
      </div>
      <p style="
        font-size: 17px;
        color: #374151;
        line-height: 1.6;
        margin: 0;
      ">${card.content}</p>
    </div>
  </div>
</body>
</html>
`;
}

// ===== Good 카드 HTML 생성 =====

/**
 * Good 피드백 카드 HTML 생성
 */
function generateGoodCardHTML(card: GoodCardData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0;">
  <div style="
    width: 800px;
    min-height: 160px;
    background: #ecfdf5;
    border-radius: 24px;
    padding: 24px 28px;
    display: flex;
    gap: 20px;
    font-family: 'Noto Sans KR', sans-serif;
    box-sizing: border-box;
  ">
    <div style="
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: #10b981;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 22px;
    ">${card.number}</div>
    <div style="flex: 1;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
        <span style="font-weight: 700; font-size: 20px; color: #1f2937;">${card.title}</span>
        <span style="
          background: #10b981;
          color: white;
          padding: 6px 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
        ">좋아요</span>
      </div>
      <p style="
        font-size: 17px;
        color: #374151;
        line-height: 1.6;
        margin: 0;
      ">${card.content}</p>
    </div>
  </div>
</body>
</html>
`;
}

// ===== 카드 이미지 생성 함수 =====

/**
 * Bad 카드 이미지 생성
 */
export async function generateBadCardImage(card: BadCardData): Promise<string> {
  const html = generateBadCardHTML(card);
  return htmlToImage(html);
}

/**
 * Good 카드 이미지 생성
 */
export async function generateGoodCardImage(card: GoodCardData): Promise<string> {
  const html = generateGoodCardHTML(card);
  return htmlToImage(html);
}

/**
 * 여러 Bad 카드 이미지 일괄 생성
 */
export async function generateBadCardImages(cards: BadCardData[]): Promise<string[]> {
  const imageUrls: string[] = [];
  
  for (const card of cards) {
    console.log(`[CardImage] Generating bad card ${card.number}: ${card.title}`);
    const url = await generateBadCardImage(card);
    imageUrls.push(url);
  }
  
  return imageUrls;
}

/**
 * 여러 Good 카드 이미지 일괄 생성
 */
export async function generateGoodCardImages(cards: GoodCardData[]): Promise<string[]> {
  const imageUrls: string[] = [];
  
  for (const card of cards) {
    console.log(`[CardImage] Generating good card ${card.number}: ${card.title}`);
    const url = await generateGoodCardImage(card);
    imageUrls.push(url);
  }
  
  return imageUrls;
}

// ===== 핀 이미지 렌더링 =====

interface PinData {
  id: number;
  x: number;
  y: number;
  riskLevel: "High" | "Medium" | "Low" | "Info";
}

/**
 * 핀이 표시된 이미지 생성
 * 원본 이미지 위에 위험도별 색상 핀 오버레이
 */
export async function generatePinOverlayImage(
  originalImageUrl: string,
  pins: PinData[]
): Promise<string> {
  // 핀 색상 매핑
  const pinColors: Record<string, string> = {
    High: "#ef4444",    // 빨강
    Medium: "#f59e0b",  // 주황
    Low: "#3b82f6",     // 파랑
    Info: "#10b981",    // 초록
  };
  
  // 핀 HTML 생성
  const pinsHtml = pins.map(pin => {
    const color = pinColors[pin.riskLevel] || "#3b82f6";
    return `
      <div style="
        position: absolute;
        left: ${pin.x}%;
        top: ${pin.y}%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        background: ${color};
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 18px;
        font-family: 'Noto Sans KR', sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">${pin.id}</div>
    `;
  }).join("");
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0;">
  <div style="
    position: relative;
    width: 800px;
    height: 600px;
  ">
    <img src="${originalImageUrl}" style="
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 16px;
    " />
    ${pinsHtml}
  </div>
</body>
</html>
`;
  
  return htmlToImage(html);
}

/**
 * Base64 이미지를 URL로 변환 (임시 저장)
 * 실제 구현에서는 Supabase Storage 등에 업로드
 */
export async function uploadImageToStorage(
  base64Data: string,
  mimeType: string
): Promise<string> {
  // TODO: Supabase Storage에 업로드 구현
  // 임시로 data URL 반환
  return `data:${mimeType};base64,${base64Data}`;
}


