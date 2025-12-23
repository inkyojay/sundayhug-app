/**
 * Story Card Generator (Server-side)
 *
 * 인스타그램 스토리용 한 장짜리 결과 카드 생성
 * 크기: 1080x1920 (인스타 스토리 최적화)
 * HCTI (htmlcsstoimage.com) API 사용
 */

export interface StoryCardData {
  score: number;
  comment: string;
  imageUrl?: string; // 분석한 아기 사진 URL (선택)
  babyName?: string; // 아기 이름 (선택)
}

interface HCTIResponse {
  url: string;
}

/**
 * HCTI API 인증 정보 가져오기
 */
function getHCTICredentials(): { userId: string; apiKey: string } {
  const userId = process.env.HCTI_USER_ID;
  const apiKey = process.env.HCTI_API_KEY;

  if (!userId || !apiKey) {
    throw new Error(
      "HCTI_USER_ID and HCTI_API_KEY environment variables are required"
    );
  }

  return { userId, apiKey };
}

/**
 * HTML을 이미지로 변환 (HCTI API)
 */
async function htmlToImage(html: string): Promise<string> {
  const { userId, apiKey } = getHCTICredentials();

  const response = await fetch("https://hcti.io/v1/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${userId}:${apiKey}`).toString("base64"),
    },
    body: JSON.stringify({
      html,
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

/**
 * 점수에 따른 별 개수 반환 (1-5)
 */
function getStarCount(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

/**
 * 점수에 따른 그라데이션 색상 반환
 */
function getScoreGradient(score: number): { from: string; to: string } {
  if (score >= 90) return { from: "#10b981", to: "#059669" }; // green
  if (score >= 75) return { from: "#84cc16", to: "#65a30d" }; // lime
  if (score >= 60) return { from: "#eab308", to: "#ca8a04" }; // yellow
  if (score >= 40) return { from: "#f97316", to: "#ea580c" }; // orange
  return { from: "#ef4444", to: "#dc2626" }; // red
}

/**
 * 별점 HTML 생성
 */
function generateStarsHTML(score: number): string {
  const starCount = getStarCount(score);
  let stars = "";

  for (let i = 0; i < 5; i++) {
    if (i < starCount) {
      stars += '<span style="color: #fbbf24; font-size: 48px;">★</span>';
    } else {
      stars +=
        '<span style="color: rgba(255,255,255,0.3); font-size: 48px;">★</span>';
    }
  }

  return stars;
}

/**
 * 인스타 스토리 카드 HTML 생성 (1080x1920)
 */
function generateStoryCardHTML(data: StoryCardData): string {
  const { score, comment, imageUrl, babyName } = data;
  const gradient = getScoreGradient(score);
  const starsHTML = generateStarsHTML(score);

  // 이미지가 있으면 표시, 없으면 아이콘
  const imageSection = imageUrl
    ? `
      <div style="
        width: 320px;
        height: 320px;
        border-radius: 50%;
        overflow: hidden;
        border: 8px solid rgba(255,255,255,0.3);
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        margin-bottom: 48px;
      ">
        <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
    `
    : `
      <div style="
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: rgba(255,255,255,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 48px;
        border: 4px solid rgba(255,255,255,0.2);
      ">
        <span style="font-size: 80px;">🛏️</span>
      </div>
    `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0;">
  <div style="
    width: 1080px;
    height: 1920px;
    background: linear-gradient(180deg, ${gradient.from} 0%, ${gradient.to} 50%, #1e293b 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Noto Sans KR', sans-serif;
    color: white;
    position: relative;
    overflow: hidden;
  ">
    <!-- 배경 데코 -->
    <div style="
      position: absolute;
      top: -100px;
      right: -100px;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
    "></div>
    <div style="
      position: absolute;
      bottom: 200px;
      left: -150px;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    "></div>

    <!-- 로고 -->
    <div style="
      margin-top: 80px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    ">
      <span style="font-size: 32px;">🌙</span>
      <span style="font-size: 36px; font-weight: 700; letter-spacing: -1px;">Sunday Hug</span>
    </div>

    <!-- 타이틀 -->
    <div style="
      font-size: 42px;
      font-weight: 500;
      color: rgba(255,255,255,0.9);
      margin-bottom: 60px;
    ">수면 환경 분석 결과</div>

    <!-- 아기 사진 (선택) -->
    ${imageSection}

    <!-- 점수 영역 -->
    <div style="
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 40px;
      padding: 48px 80px;
      text-align: center;
      margin-bottom: 48px;
      border: 2px solid rgba(255,255,255,0.2);
    ">
      <!-- 점수 -->
      <div style="
        font-size: 160px;
        font-weight: 900;
        line-height: 1;
        margin-bottom: 8px;
        text-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">${score}</div>
      <div style="
        font-size: 36px;
        color: rgba(255,255,255,0.7);
        margin-bottom: 24px;
      ">/ 100점</div>

      <!-- 별점 -->
      <div style="display: flex; gap: 8px; justify-content: center;">
        ${starsHTML}
      </div>
    </div>

    <!-- 코멘트 -->
    <div style="
      max-width: 800px;
      text-align: center;
      font-size: 36px;
      font-weight: 500;
      line-height: 1.5;
      color: rgba(255,255,255,0.95);
      padding: 0 60px;
      margin-bottom: auto;
    ">"${comment}"</div>

    <!-- 하단 CTA -->
    <div style="
      width: 100%;
      background: rgba(0,0,0,0.3);
      padding: 48px;
      text-align: center;
    ">
      <div style="
        font-size: 28px;
        color: rgba(255,255,255,0.7);
        margin-bottom: 16px;
      ">나도 우리 아기 수면 환경 분석받기</div>
      <div style="
        font-size: 36px;
        font-weight: 700;
        color: white;
      ">app.sundayhug.com/sleep</div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * 인스타 스토리 카드 이미지 생성
 */
export async function generateStoryCardImage(
  data: StoryCardData
): Promise<string> {
  console.log("[StoryCard] Generating story card image...", {
    score: data.score,
  });

  const html = generateStoryCardHTML(data);
  const imageUrl = await htmlToImage(html);

  console.log("[StoryCard] Story card generated:", imageUrl);
  return imageUrl;
}

/**
 * 점수에 따른 기본 코멘트 반환
 */
export function getDefaultComment(score: number): string {
  if (score >= 90) return "우리 아기가 안전하게 잘 수 있는 최고의 환경이에요! 🎉";
  if (score >= 75) return "전반적으로 안전한 수면 환경이에요! 👍";
  if (score >= 60) return "괜찮지만 몇 가지 개선이 필요해요";
  if (score >= 40) return "주의가 필요한 환경이에요 ⚠️";
  return "즉시 개선이 필요한 환경이에요! 🚨";
}

