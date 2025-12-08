/**
 * Share Card Image Generator
 * 
 * 수면 분석 결과를 인스타그램 카드뉴스 형태로 생성합니다.
 * 서버에서 폰트 없이 렌더링 가능한 영어/숫자 중심 디자인
 */

// 점수에 따른 색상
function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// 점수에 따른 등급 (영어)
function getScoreGrade(score: number): string {
  if (score >= 90) return "Excellent!";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Caution";
  return "Warning!";
}

// 별점 개수
function getStarCount(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export interface ShareCardData {
  safetyScore: number;
  scoreComment: string;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  babyName?: string;
  analysisDate: string;
  analysisId: string;
}

/**
 * 인스타그램 카드뉴스 SVG 생성 (1:1 비율)
 * 서버 렌더링 호환을 위해 영어/숫자 중심 디자인
 */
export function generateShareCardSVG(data: ShareCardData): string {
  const { safetyScore, highCount, mediumCount, lowCount, analysisDate } = data;
  const scoreColor = getScoreColor(safetyScore);
  const scoreGrade = getScoreGrade(safetyScore);
  const starCount = getStarCount(safetyScore);
  
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  // 별 SVG 생성
  const starsElements = Array.from({ length: 5 }, (_, i) => {
    const filled = i < starCount;
    const xPos = 290 + i * 100;
    return `<text x="${xPos}" y="650" fill="${filled ? '#FBBF24' : '#374151'}" font-size="60" font-family="Arial, sans-serif">*</text>`;
  }).join('');

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${scoreColor}"/>
      <stop offset="100%" stop-color="${scoreColor}88"/>
    </linearGradient>
  </defs>
  
  <rect width="1080" height="1080" fill="url(#bgGradient)"/>
  <circle cx="850" cy="200" r="200" fill="${scoreColor}" fill-opacity="0.05"/>
  
  <text x="540" y="100" text-anchor="middle" fill="#ffffff" font-size="56" font-weight="bold" font-family="Arial, sans-serif">SUNDAYHUG</text>
  <text x="540" y="155" text-anchor="middle" fill="#94a3b8" font-size="28" font-family="Arial, sans-serif">Baby Sleep Safety Analysis</text>
  
  <g transform="translate(540, 400)">
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#374151" stroke-width="24"/>
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="url(#scoreGradient)" stroke-width="24" 
            stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90)"/>
    <text x="0" y="15" text-anchor="middle" fill="#ffffff" font-size="120" font-weight="bold" font-family="Arial, sans-serif">${safetyScore}</text>
    <text x="0" y="70" text-anchor="middle" fill="#94a3b8" font-size="32" font-family="Arial, sans-serif">/ 100</text>
  </g>
  
  <text x="540" y="720" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="bold" font-family="Arial, sans-serif">${scoreGrade}</text>
  
  <g transform="translate(540, 820)">
    <rect x="-380" y="0" width="230" height="60" rx="30" fill="#ef4444" fill-opacity="0.2"/>
    <text x="-265" y="40" text-anchor="middle" fill="#ef4444" font-size="24" font-weight="bold" font-family="Arial, sans-serif">HIGH ${highCount}</text>
    
    <rect x="-125" y="0" width="230" height="60" rx="30" fill="#f97316" fill-opacity="0.2"/>
    <text x="-10" y="40" text-anchor="middle" fill="#f97316" font-size="24" font-weight="bold" font-family="Arial, sans-serif">MEDIUM ${mediumCount}</text>
    
    <rect x="130" y="0" width="230" height="60" rx="30" fill="#22c55e" fill-opacity="0.2"/>
    <text x="245" y="40" text-anchor="middle" fill="#22c55e" font-size="24" font-weight="bold" font-family="Arial, sans-serif">LOW ${lowCount}</text>
  </g>
  
  <rect x="140" y="920" width="800" height="80" rx="40" fill="#FF6B35" fill-opacity="0.2"/>
  <text x="540" y="970" text-anchor="middle" fill="#FF6B35" font-size="28" font-weight="bold" font-family="Arial, sans-serif">app.sundayhug.kr/customer/sleep</text>
  
  <text x="540" y="1050" text-anchor="middle" fill="#64748b" font-size="20" font-family="Arial, sans-serif">${analysisDate}</text>
</svg>`;
}

/**
 * 세로형 인스타그램 카드 (4:5 비율, 스토리/릴스용)
 */
export function generateVerticalShareCardSVG(data: ShareCardData): string {
  const { safetyScore, highCount, mediumCount, lowCount, analysisDate } = data;
  const scoreColor = getScoreColor(safetyScore);
  const scoreGrade = getScoreGrade(safetyScore);
  
  const radius = 150;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="scoreGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${scoreColor}"/>
      <stop offset="100%" stop-color="${scoreColor}88"/>
    </linearGradient>
  </defs>
  
  <rect width="1080" height="1350" fill="url(#bgGradient2)"/>
  <circle cx="900" cy="200" r="300" fill="${scoreColor}" fill-opacity="0.05"/>
  
  <text x="540" y="120" text-anchor="middle" fill="#ffffff" font-size="60" font-weight="bold" font-family="Arial, sans-serif">SUNDAYHUG</text>
  <text x="540" y="180" text-anchor="middle" fill="#94a3b8" font-size="30" font-family="Arial, sans-serif">Baby Sleep Safety Analysis</text>
  
  <g transform="translate(540, 500)">
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#374151" stroke-width="28"/>
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="url(#scoreGradient2)" stroke-width="28" 
            stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90)"/>
    <text x="0" y="15" text-anchor="middle" fill="#ffffff" font-size="140" font-weight="bold" font-family="Arial, sans-serif">${safetyScore}</text>
    <text x="0" y="80" text-anchor="middle" fill="#94a3b8" font-size="36" font-family="Arial, sans-serif">/ 100</text>
  </g>
  
  <text x="540" y="780" text-anchor="middle" fill="#ffffff" font-size="56" font-weight="bold" font-family="Arial, sans-serif">${scoreGrade}</text>
  
  <g transform="translate(540, 900)">
    <rect x="-400" y="0" width="250" height="70" rx="35" fill="#ef4444" fill-opacity="0.2"/>
    <text x="-275" y="46" text-anchor="middle" fill="#ef4444" font-size="28" font-weight="bold" font-family="Arial, sans-serif">HIGH ${highCount}</text>
    
    <rect x="-125" y="0" width="250" height="70" rx="35" fill="#f97316" fill-opacity="0.2"/>
    <text x="0" y="46" text-anchor="middle" fill="#f97316" font-size="28" font-weight="bold" font-family="Arial, sans-serif">MEDIUM ${mediumCount}</text>
    
    <rect x="150" y="0" width="250" height="70" rx="35" fill="#22c55e" fill-opacity="0.2"/>
    <text x="275" y="46" text-anchor="middle" fill="#22c55e" font-size="28" font-weight="bold" font-family="Arial, sans-serif">LOW ${lowCount}</text>
  </g>
  
  <rect x="140" y="1100" width="800" height="100" rx="50" fill="#FF6B35" fill-opacity="0.2"/>
  <text x="540" y="1162" text-anchor="middle" fill="#FF6B35" font-size="32" font-weight="bold" font-family="Arial, sans-serif">app.sundayhug.kr/customer/sleep</text>
  
  <text x="540" y="1300" text-anchor="middle" fill="#64748b" font-size="24" font-family="Arial, sans-serif">${analysisDate}</text>
</svg>`;
}

/**
 * 공유 카드 데이터 생성
 */
export function createShareCardData(
  analysis: {
    id: string;
    safetyScore?: number;
    scoreComment?: string;
    feedbackItems?: { riskLevel: string }[];
    created_at?: string;
  },
  babyName?: string
): ShareCardData {
  const feedbackItems = analysis.feedbackItems || [];
  
  return {
    safetyScore: analysis.safetyScore || 70,
    scoreComment: analysis.scoreComment || "Sleep analysis complete",
    highCount: feedbackItems.filter(i => i.riskLevel === "High").length,
    mediumCount: feedbackItems.filter(i => i.riskLevel === "Medium").length,
    lowCount: feedbackItems.filter(i => i.riskLevel === "Low" || i.riskLevel === "Info").length,
    babyName,
    analysisDate: analysis.created_at 
      ? new Date(analysis.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    analysisId: analysis.id,
  };
}
