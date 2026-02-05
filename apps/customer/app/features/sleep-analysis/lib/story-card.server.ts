/**
 * Story Card Generator (Server-side)
 *
 * 정사각형 결과 카드 생성
 * 크기: 1080x1080 (1:1 비율)
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
];

// 점수별 코멘트 (80점 이상용)
function getHighScoreComment(score: number): string {
  if (score >= 95) return "완벽해요!";
  if (score >= 90) return "최고예요!";
  if (score >= 85) return "아주 좋아요!";
  return "안전해요!";
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
      viewport_width: 1080,
      viewport_height: 1080,
      device_scale: 1,
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
 * 축하 카드 HTML (80점 이상 - 사진 있음) - 1:1 비율
 */
function generateHighScoreCard(score: number, imageUrl: string): string {
  const comment = getHighScoreComment(score);

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
      height: 1080px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      position: relative;
      overflow: hidden;
    }
    .photo {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 50px;
      background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    .bottom {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    .score-box {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .score {
      font-size: 120px;
      font-weight: 900;
      color: white;
      line-height: 1;
    }
    .score-label {
      font-size: 32px;
      font-weight: 700;
      color: rgba(255,255,255,0.8);
    }
    .right {
      text-align: right;
    }
    .comment {
      font-size: 36px;
      font-weight: 700;
      color: #4ade80;
      margin-bottom: 8px;
    }
    .url {
      font-size: 24px;
      color: rgba(255,255,255,0.7);
    }
  </style>
</head>
<body>
  <div class="card">
    <img class="photo" src="${imageUrl}" alt="" />
    <div class="overlay">
      <div class="logo">🌙 Sunday Hug</div>
      <div class="bottom">
        <div class="score-box">
          <span class="score">${score}</span>
          <span class="score-label">점</span>
        </div>
        <div class="right">
          <div class="comment">${comment}</div>
          <div class="url">app.sundayhug.com/sleep</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 팁 카드 HTML (80점 미만 - 사진 없음) - 1:1 비율
 */
function generateLowScoreCard(score: number): string {
  const randomTip = SAFETY_TIPS[Math.floor(Math.random() * SAFETY_TIPS.length)];
  
  // 점수별 색상
  const scoreColor = score >= 60 ? "#fbbf24" : "#f87171";

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
      height: 1080px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin-bottom: 50px;
    }
    .score-box {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 50px;
    }
    .score {
      font-size: 180px;
      font-weight: 900;
      color: ${scoreColor};
      line-height: 1;
    }
    .score-label {
      font-size: 48px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
    }
    .tip-section {
      text-align: center;
      margin-bottom: 60px;
    }
    .tip-label {
      font-size: 28px;
      font-weight: 700;
      color: ${scoreColor};
      margin-bottom: 24px;
    }
    .tip-text {
      font-size: 40px;
      font-weight: 700;
      color: white;
      line-height: 1.4;
    }
    .cta {
      padding: 30px 50px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      text-align: center;
    }
    .cta-title {
      font-size: 24px;
      color: rgba(255,255,255,0.7);
      margin-bottom: 8px;
    }
    .cta-url {
      font-size: 28px;
      font-weight: 700;
      color: ${scoreColor};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🌙 Sunday Hug</div>
    <div class="score-box">
      <span class="score">${score}</span>
      <span class="score-label">점</span>
    </div>
    <div class="tip-section">
      <div class="tip-label">💡 안전 수면 팁</div>
      <div class="tip-text">${randomTip}</div>
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
  
  let html: string;

  // 80점 이상이고 이미지가 있으면 축하 카드, 아니면 팁 카드
  if (score >= 80 && imageUrl) {
    html = generateHighScoreCard(score, imageUrl);
  } else {
    html = generateLowScoreCard(score);
  }

  return htmlToImage(html);
}
