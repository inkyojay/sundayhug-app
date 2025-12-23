/**
 * Story Card Generator (Server-side)
 *
 * 인스타그램 스토리용 한 장짜리 결과 카드 생성
 * 크기: 1080x1920 (인스타 스토리 최적화)
 * 
 * 점수 기준 분기:
 * - 80점 이상: 사진 있는 축하 카드
 * - 80점 미만: 안전 수면 팁 카드 (사진 없음)
 */

export interface StoryCardData {
  score: number;
  imageUrl?: string;
}

interface HCTIResponse {
  url: string;
}

// 안전 수면 팁 목록 (80점 미만일 때 랜덤 1개 표시)
const SAFETY_TIPS = [
  "아기는 베개 없이 단단한 매트리스에서 자야 해요",
  "아기 침대에 인형, 이불은 질식 위험이 있어요",
  "아기는 등을 대고 바로 눕혀 재우세요",
  "적정 실내 온도는 20-22°C예요",
  "아기 모니터 전선은 손이 닿지 않게 정리하세요",
  "아기와 같은 침대에서 자는 것은 위험해요",
];

// 점수별 코멘트 (80점 이상용)
function getHighScoreComment(score: number): string {
  if (score >= 95) return "완벽한 수면 환경이에요!";
  if (score >= 90) return "최고의 수면 환경이에요!";
  if (score >= 85) return "아주 안전한 환경이에요!";
  return "안전한 수면 환경이에요!";
}

// 점수별 배경 그라데이션
function getGradient(score: number): { from: string; to: string } {
  if (score >= 80) {
    return { from: "#4ade80", to: "#22c55e" }; // 초록 (축하)
  }
  if (score >= 60) {
    return { from: "#fbbf24", to: "#f59e0b" }; // 노랑 (주의)
  }
  return { from: "#f87171", to: "#ef4444" }; // 빨강 (위험)
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
 * 축하 카드 HTML (80점 이상 - 사진 있음)
 */
function generateHighScoreCard(score: number, imageUrl: string): string {
  const comment = getHighScoreComment(score);
  const gradient = getGradient(score);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Noto Sans KR", sans-serif; }
    .card {
      width: 1080px;
      height: 1920px;
      background: linear-gradient(180deg, ${gradient.from} 0%, ${gradient.to} 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 60px;
    }
    .logo {
      font-size: 48px;
      font-weight: 900;
      color: white;
      margin-bottom: 60px;
      text-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .photo-frame {
      width: 800px;
      height: 800px;
      border-radius: 40px;
      overflow: hidden;
      background: white;
      padding: 20px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.2);
    }
    .photo {
      width: 100%;
      height: 100%;
      border-radius: 28px;
      object-fit: cover;
    }
    .score-section {
      margin-top: 60px;
      text-align: center;
    }
    .score {
      font-size: 180px;
      font-weight: 900;
      color: white;
      line-height: 1;
      text-shadow: 0 8px 30px rgba(0,0,0,0.2);
    }
    .score-label {
      font-size: 48px;
      color: rgba(255,255,255,0.9);
      margin-top: 10px;
    }
    .comment {
      margin-top: 40px;
      font-size: 52px;
      font-weight: 700;
      color: white;
      text-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }
    .cta {
      margin-top: auto;
      text-align: center;
    }
    .cta-label {
      font-size: 32px;
      color: rgba(255,255,255,0.8);
      margin-bottom: 12px;
    }
    .cta-url {
      font-size: 40px;
      font-weight: 700;
      color: white;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🌙 Sunday Hug</div>
    
    <div class="photo-frame">
      <img class="photo" src="${imageUrl}" alt="아기 사진" />
    </div>
    
    <div class="score-section">
      <div class="score">${score}</div>
      <div class="score-label">점</div>
    </div>
    
    <div class="comment">${comment}</div>
    
    <div class="cta">
      <div class="cta-label">나도 분석받기</div>
      <div class="cta-url">app.sundayhug.com/sleep</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 팁 카드 HTML (80점 미만 - 사진 없음)
 */
function generateLowScoreCard(score: number): string {
  const gradient = getGradient(score);
  const randomTip = SAFETY_TIPS[Math.floor(Math.random() * SAFETY_TIPS.length)];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Noto Sans KR", sans-serif; }
    .card {
      width: 1080px;
      height: 1920px;
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 100px 80px;
    }
    .logo {
      font-size: 48px;
      font-weight: 900;
      color: white;
      margin-bottom: 100px;
    }
    .score-section {
      text-align: center;
      margin-bottom: 80px;
    }
    .score {
      font-size: 240px;
      font-weight: 900;
      background: linear-gradient(180deg, ${gradient.from} 0%, ${gradient.to} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }
    .score-label {
      font-size: 48px;
      color: rgba(255,255,255,0.6);
      margin-top: 10px;
    }
    .divider {
      width: 200px;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      margin: 60px 0;
    }
    .tip-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .tip-label {
      font-size: 36px;
      font-weight: 700;
      color: ${gradient.from};
      margin-bottom: 40px;
    }
    .tip-text {
      font-size: 52px;
      font-weight: 700;
      color: white;
      line-height: 1.5;
      max-width: 800px;
    }
    .cta {
      margin-top: auto;
      text-align: center;
      padding: 50px 80px;
      background: rgba(255,255,255,0.08);
      border-radius: 30px;
      width: 100%;
    }
    .cta-title {
      font-size: 36px;
      font-weight: 700;
      color: white;
      margin-bottom: 16px;
    }
    .cta-url {
      font-size: 40px;
      font-weight: 900;
      color: ${gradient.from};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🌙 Sunday Hug</div>
    
    <div class="score-section">
      <div class="score">${score}</div>
      <div class="score-label">점</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="tip-section">
      <div class="tip-label">💡 안전 수면 팁</div>
      <div class="tip-text">"${randomTip}"</div>
    </div>
    
    <div class="cta">
      <div class="cta-title">우리 아기 수면 환경 분석받기</div>
      <div class="cta-url">app.sundayhug.com/sleep</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 스토리 카드 이미지 생성 (점수에 따라 분기)
 */
export async function generateStoryCardImage(
  data: StoryCardData
): Promise<string> {
  const { score, imageUrl } = data;
  
  console.log("[StoryCard] Generating card...", { score, hasImage: !!imageUrl });

  let html: string;
  
  // 80점 이상이고 이미지가 있으면 축하 카드, 아니면 팁 카드
  if (score >= 80 && imageUrl) {
    console.log("[StoryCard] Generating HIGH score card (photo)");
    html = generateHighScoreCard(score, imageUrl);
  } else {
    console.log("[StoryCard] Generating LOW score card (tip)");
    html = generateLowScoreCard(score);
  }

  const cardUrl = await htmlToImage(html);
  console.log("[StoryCard] Card generated:", cardUrl);
  
  return cardUrl;
}
