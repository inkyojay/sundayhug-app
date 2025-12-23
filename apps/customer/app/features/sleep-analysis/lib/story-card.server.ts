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
  summary?: string; // 종합분석 요약 (선택)
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
 * 점수에 따른 배경 색상 반환 (단색)
 */
function getScoreColor(score: number): string {
  if (score >= 90) return "#d1fae5"; // green-100
  if (score >= 75) return "#ecfccb"; // lime-100
  if (score >= 60) return "#fef9c3"; // yellow-100
  if (score >= 40) return "#ffedd5"; // orange-100
  return "#fee2e2"; // red-100
}

/**
 * 별점 HTML 생성
 */
function generateStarsHTML(score: number): string {
  const starCount = getStarCount(score);
  let stars = "";

  for (let i = 0; i < 5; i++) {
    if (i < starCount) {
      stars += "★";
    } else {
      stars += "☆";
    }
  }

  return stars;
}

/**
 * 텍스트 길이 제한 (말줄임표 처리)
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * 인스타 스토리 카드 HTML 생성 (1080x1920) - 프리미엄 버전 v2
 * - 사진 크기 축소
 * - 종합분석 요약 추가
 * - 여백 최소화
 */
function generateStoryCardHTML(data: StoryCardData): string {
  const { score, comment, summary, imageUrl } = data;
  const bgColor = getScoreColor(score);
  const starsHTML = generateStarsHTML(score);

  // 이미지가 없으면 기본 플레이스홀더
  const photoContent = imageUrl
    ? `<img src="${imageUrl}" alt="아기 사진" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px;background:rgba(17,24,39,.04);">🛏️</div>`;

  // 종합분석 요약 (120자 제한)
  const summaryText = truncateText(summary || comment, 120);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *{ box-sizing:border-box; margin:0; padding:0; }
    body{ margin:0; font-family:"Noto Sans KR", system-ui, sans-serif; }

    .story{
      width:1080px;
      height:1920px;
      background: ${bgColor};
      color:#111827;
      display:flex;
      flex-direction:column;
    }

    /* 상단 헤더 */
    .header{
      padding:48px 56px 32px;
      display:flex;
      align-items:center;
      justify-content:space-between;
    }
    .brand{
      display:flex;
      align-items:center;
      gap:14px;
      font-weight:900;
      font-size:38px;
      letter-spacing:-1px;
    }
    .tag{
      padding:14px 20px;
      border-radius:999px;
      background:rgba(255,255,255,.85);
      font-weight:800;
      font-size:22px;
      color:rgba(17,24,39,.7);
    }

    /* 사진 영역 - 여백 없이 풀사이즈 */
    .photo-section{
      width:100%;
      height:580px;
      overflow:hidden;
    }

    /* 점수 + 요약 영역 */
    .content{
      flex:1;
      padding:36px 56px;
      display:flex;
      flex-direction:column;
      gap:24px;
    }

    /* 점수 카드 */
    .score-card{
      background:rgba(255,255,255,.88);
      border-radius:32px;
      padding:32px 40px;
      display:flex;
      align-items:center;
      gap:32px;
      box-shadow:0 20px 60px rgba(17,24,39,.1);
    }
    .score-left{
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    .score-label{
      font-size:22px;
      font-weight:800;
      color:rgba(17,24,39,.6);
    }
    .score-value{
      font-size:96px;
      font-weight:900;
      letter-spacing:-3px;
      line-height:1;
    }
    .score-max{
      font-size:28px;
      font-weight:800;
      color:rgba(17,24,39,.5);
    }
    .stars{
      font-size:26px;
      letter-spacing:4px;
      color:rgba(17,24,39,.7);
    }
    .score-right{
      flex:1;
      padding-left:32px;
      border-left:2px solid rgba(17,24,39,.1);
    }
    .status-label{
      font-size:20px;
      font-weight:800;
      color:rgba(17,24,39,.55);
      margin-bottom:10px;
    }
    .status-text{
      font-size:32px;
      font-weight:900;
      letter-spacing:-1px;
      line-height:1.35;
    }

    /* 종합분석 카드 */
    .summary-card{
      background:rgba(255,255,255,.88);
      border-radius:32px;
      padding:32px 36px;
      box-shadow:0 20px 60px rgba(17,24,39,.1);
    }
    .summary-label{
      font-size:20px;
      font-weight:800;
      color:rgba(17,24,39,.55);
      margin-bottom:16px;
      display:flex;
      align-items:center;
      gap:10px;
    }
    .summary-text{
      font-size:30px;
      font-weight:700;
      line-height:1.55;
      letter-spacing:-.5px;
      color:rgba(17,24,39,.85);
    }

    /* 하단 CTA */
    .cta{
      margin-top:auto;
      padding:40px 56px 52px;
    }
    .cta-box{
      background:rgba(255,255,255,.92);
      border-radius:28px;
      padding:28px 36px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      box-shadow:0 16px 50px rgba(17,24,39,.1);
    }
    .cta-text{
      display:flex;
      flex-direction:column;
      gap:6px;
    }
    .cta-title{
      font-size:28px;
      font-weight:900;
      letter-spacing:-.5px;
    }
    .cta-url{
      font-size:24px;
      font-weight:800;
      color:rgba(17,24,39,.6);
    }
    .cta-btn{
      padding:18px 24px;
      border-radius:20px;
      background:rgba(17,24,39,.08);
      font-size:24px;
      font-weight:900;
      color:rgba(17,24,39,.85);
    }
  </style>
</head>
<body>
  <div class="story">
    <!-- 헤더 -->
    <div class="header">
      <div class="brand">🌙 Sunday Hug</div>
      <div class="tag">수면 환경 분석</div>
    </div>

    <!-- 사진 (여백 없음) -->
    <div class="photo-section">
      ${photoContent}
    </div>

    <!-- 점수 + 요약 -->
    <div class="content">
      <!-- 점수 카드 -->
      <div class="score-card">
        <div class="score-left">
          <div class="score-label">안전 점수</div>
          <div class="score-value">${score}<span class="score-max"> / 100</span></div>
          <div class="stars">${starsHTML}</div>
        </div>
        <div class="score-right">
          <div class="status-label">오늘의 상태</div>
          <div class="status-text">${comment}</div>
        </div>
      </div>

      <!-- 종합분석 요약 -->
      <div class="summary-card">
        <div class="summary-label">📋 종합 분석</div>
        <div class="summary-text">${summaryText}</div>
      </div>
    </div>

    <!-- 하단 CTA -->
    <div class="cta">
      <div class="cta-box">
        <div class="cta-text">
          <div class="cta-title">나도 분석받기</div>
          <div class="cta-url">app.sundayhug.com/sleep</div>
        </div>
        <div class="cta-btn">공유하기 →</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 인스타 스토리 카드 이미지 생성
 */
export async function generateStoryCardImage(
  data: StoryCardData
): Promise<string> {
  console.log("[StoryCard] Generating story card image...", {
    score: data.score,
    hasImage: !!data.imageUrl,
    hasSummary: !!data.summary,
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
  if (score >= 90) return "최고의 수면 환경이에요! 🎉";
  if (score >= 75) return "안전한 수면 환경이에요! 👍";
  if (score >= 60) return "몇 가지 개선이 필요해요";
  if (score >= 40) return "주의가 필요해요 ⚠️";
  return "즉시 개선이 필요해요! 🚨";
}
