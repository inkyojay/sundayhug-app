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
 * 인스타 스토리 카드 HTML 생성 (1080x1920) - 프리미엄 버전
 */
function generateStoryCardHTML(data: StoryCardData): string {
  const { score, comment, imageUrl } = data;
  const bgColor = getScoreColor(score);
  const starsHTML = generateStarsHTML(score);

  // 이미지가 없으면 기본 플레이스홀더
  const photoContent = imageUrl
    ? `<img src="${imageUrl}" alt="아기 사진" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:120px;">🛏️</div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <title>Sunday Hug · 수면 환경 분석 결과</title>
  <style>
    :root{
      --bg: ${bgColor};
      --ink:#111827;
      --muted: rgba(17,24,39,.62);
      --card:#ffffffcc;
      --stroke: rgba(17,24,39,.10);
      --shadow: 0 26px 70px rgba(17,24,39,.12);
      --accent: rgba(255,255,255,.55);
    }

    *{ box-sizing:border-box; margin:0; padding:0; }
    body{ margin:0; background:#eef2ff; font-family:"Noto Sans KR", system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }

    .story{
      width:1080px;
      height:1920px;
      position:relative;
      overflow:hidden;
      background: var(--bg);
      color:var(--ink);
    }

    .glow{
      position:absolute; inset:-140px;
      background:
        radial-gradient(620px 620px at 18% 18%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 68%),
        radial-gradient(720px 720px at 86% 34%, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 72%),
        radial-gradient(760px 760px at 40% 92%, rgba(255,255,255,.26) 0%, rgba(255,255,255,0) 74%);
      pointer-events:none;
      opacity:.65;
    }

    .wrap{
      position:relative;
      height:100%;
      padding:74px 72px 62px;
      display:flex;
      flex-direction:column;
      gap:22px;
    }

    .top{ display:flex; align-items:center; justify-content:space-between; }
    .brand{ display:flex; align-items:center; gap:12px; font-weight:900; letter-spacing:-.8px; font-size:34px; }
    .tag{
      padding:12px 16px;
      border-radius:999px;
      background: rgba(255,255,255,.84);
      border:1px solid var(--stroke);
      font-weight:900;
      color: rgba(17,24,39,.70);
      font-size:20px;
    }

    .title{ margin-top:6px; font-size:56px; font-weight:900; letter-spacing:-2px; line-height:1.08; }
    .sub{ margin-top:10px; font-size:26px; color:var(--muted); letter-spacing:-.4px; line-height:1.35; }

    .stage{ position:relative; flex:1; display:flex; flex-direction:column; gap:18px; }

    .card{
      background: var(--card);
      border:1px solid var(--stroke);
      border-radius:34px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }

    .photoCard{ padding:18px; }
    .photo{
      width:100%;
      height:820px;
      border-radius:26px;
      overflow:hidden;
      background: rgba(17,24,39,.04);
      border:1px solid rgba(17,24,39,.08);
    }
    .photo img{ width:100%; height:100%; object-fit:cover; display:block; }

    .kpiRow{ display:flex; gap:16px; align-items:stretch; }
    .kpi{ flex:1; padding:22px 24px; display:flex; flex-direction:column; justify-content:center; gap:8px; }
    .kpi .label{ font-size:20px; font-weight:900; color: rgba(17,24,39,.62); letter-spacing:-.2px; }
    .kpi .score{ font-size:86px; font-weight:900; letter-spacing:-2px; line-height:1; }
    .kpi .stars{ font-size:22px; font-weight:900; letter-spacing:2px; color: rgba(17,24,39,.72); }

    .grade{
      width:300px;
      padding:22px 24px;
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:10px;
      background: rgba(255,255,255,.86);
      border:1px solid rgba(17,24,39,.10);
      border-radius:34px;
      box-shadow: var(--shadow);
    }
    .grade .big{ font-size:34px; font-weight:900; letter-spacing:-.8px; }
    .grade .small{ font-size:20px; font-weight:800; color: rgba(17,24,39,.60); }

    .comment{ padding:26px 28px; }
    .comment .h{ font-size:22px; font-weight:900; color: rgba(17,24,39,.62); letter-spacing:-.2px; margin-bottom:12px; }
    .comment .q{ font-size:34px; font-weight:900; letter-spacing:-.9px; line-height:1.45; }
    .comment .sig{ margin-top:14px; display:flex; justify-content:space-between; align-items:center; color: rgba(17,24,39,.58); font-weight:900; }

    .cta{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:18px;
      padding:26px 28px;
      background: rgba(255,255,255,.90);
      border:1px solid rgba(17,24,39,.10);
      border-radius:30px;
      box-shadow: 0 18px 55px rgba(17,24,39,.10);
    }
    .cta .left{ display:flex; flex-direction:column; gap:8px; }
    .cta .h{ font-size:24px; font-weight:900; letter-spacing:-.5px; }
    .cta .u{ font-size:22px; font-weight:900; color: rgba(17,24,39,.62); }
    .btn{
      padding:16px 18px;
      border-radius:22px;
      background: rgba(17,24,39,.06);
      border:1px solid rgba(17,24,39,.12);
      font-weight:900;
      letter-spacing:-.3px;
      font-size:22px;
      color: rgba(17,24,39,.90);
      white-space:nowrap;
    }

    .foot{ text-align:center; margin-top:10px; font-size:18px; color: rgba(17,24,39,.50); font-weight:700; }
  </style>
</head>
<body>
  <div class="story">
    <div class="glow" aria-hidden="true"></div>

    <div class="wrap">
      <div class="top">
        <div class="brand"><span aria-hidden="true">🌙</span>Sunday Hug</div>
        <div class="tag">수면 환경 분석 결과</div>
      </div>

      <div>
        <div class="title">프리미엄 귀여움<br/>수면 환경 체크</div>
        <div class="sub">오늘의 환경 스코어로 우리 아기 잠자리 컨디션을 깔끔하게 확인해요.</div>
      </div>

      <div class="stage">
        <div class="card photoCard">
          <div class="photo">
            ${photoContent}
          </div>
        </div>

        <div class="kpiRow">
          <div class="card kpi">
            <div class="label">오늘의 점수</div>
            <div class="score">${score}<span style="font-size:26px; font-weight:900; color:rgba(17,24,39,.55);"> / 100</span></div>
            <div class="stars">${starsHTML}</div>
          </div>
          <div class="grade">
            <div class="big">오늘의 상태</div>
            <div class="small">점수 기반 코멘트를 확인해요</div>
          </div>
        </div>

        <div class="card comment">
          <div class="h">오늘의 코멘트</div>
          <div class="q">${comment}</div>
          <div class="sig">
            <span>Sunday Hug</span>
            <span aria-hidden="true">♡</span>
          </div>
        </div>
      </div>

      <div>
        <div class="cta">
          <div class="left">
            <div class="h">나도 분석받기</div>
            <div class="u">app.sundayhug.com/sleep</div>
          </div>
          <div class="btn">스토리로 공유하기 →</div>
        </div>
        <div class="foot">* 인스타그램 스토리(1080×1920) · 단색 배경 버전</div>
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
