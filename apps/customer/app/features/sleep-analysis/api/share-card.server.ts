/**
 * Share Card Image Generator
 * 
 * 수면 분석 결과를 인스타그램 카드뉴스 형태로 생성합니다.
 * 1:1 비율 (1080x1080) 또는 4:5 비율 (1080x1350)
 */

// 점수에 따른 색상
function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// 점수에 따른 등급
function getScoreGrade(score: number): string {
  if (score >= 90) return "매우 안전해요! 🎉";
  if (score >= 75) return "안전한 환경이에요 👍";
  if (score >= 60) return "개선이 필요해요";
  if (score >= 40) return "주의가 필요해요 ⚠️";
  return "즉시 개선 필요! 🚨";
}

// 별점 SVG 생성 (이모지 대신 SVG 별)
function generateStarsSVG(score: number, x: number, y: number): string {
  const starCount = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    const fill = i < starCount ? "#FBBF24" : "#374151";
    stars += `<path d="M${x + i * 50},${y}l11.5,23.3l25.7,3.7l-18.6,18.1l4.4,25.6l-23-12.1l-23,12.1l4.4-25.6L${x + i * 50 - 18.6},${y + 27}l25.7-3.7L${x + i * 50},${y}z" fill="${fill}"/>`;
  }
  return stars;
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
 */
export function generateShareCardSVG(data: ShareCardData): string {
  const { safetyScore, scoreComment, highCount, mediumCount, lowCount, analysisDate } = data;
  const scoreColor = getScoreColor(safetyScore);
  const scoreGrade = getScoreGrade(safetyScore);
  
  // 원형 진행률 계산 (더 큰 원)
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  return `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${scoreColor}"/>
      <stop offset="100%" style="stop-color:${scoreColor}99"/>
    </linearGradient>
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#334155"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- 배경 -->
  <rect width="1080" height="1080" fill="url(#bgGradient)"/>
  
  <!-- 배경 장식 원 -->
  <circle cx="900" cy="150" r="200" fill="${scoreColor}" opacity="0.05"/>
  <circle cx="180" cy="900" r="250" fill="${scoreColor}" opacity="0.03"/>
  
  <!-- 상단 브랜드 영역 -->
  <g transform="translate(540, 80)">
    <text x="0" y="0" text-anchor="middle" fill="#ffffff" font-size="36" font-weight="bold" font-family="system-ui, -apple-system, sans-serif">🌙 AI 수면 환경 분석</text>
    <text x="0" y="45" text-anchor="middle" fill="#94a3b8" font-size="22" font-family="system-ui, sans-serif">썬데이허그 | ${analysisDate}</text>
  </g>
  
  <!-- 메인 점수 카드 -->
  <rect x="80" y="180" width="920" height="480" rx="40" fill="url(#cardGradient)" opacity="0.8"/>
  
  <!-- 점수 원형 (왼쪽) -->
  <g transform="translate(280, 420)">
    <!-- 배경 원 -->
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#374151" stroke-width="20"/>
    <!-- 진행률 원 -->
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="url(#scoreGradient)" stroke-width="20" 
            stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90)" filter="url(#glow)"/>
    <!-- 점수 텍스트 -->
    <text x="0" y="-20" text-anchor="middle" fill="#ffffff" font-size="100" font-weight="bold" font-family="system-ui, sans-serif">${safetyScore}</text>
    <text x="0" y="35" text-anchor="middle" fill="#94a3b8" font-size="28" font-family="system-ui, sans-serif">/ 100점</text>
  </g>
  
  <!-- 오른쪽 정보 영역 -->
  <g transform="translate(500, 280)">
    <!-- 별점 (5개) -->
    <g transform="translate(0, 0)">
      ${Array.from({ length: 5 }, (_, i) => {
        const filled = i < (safetyScore >= 90 ? 5 : safetyScore >= 75 ? 4 : safetyScore >= 60 ? 3 : safetyScore >= 40 ? 2 : 1);
        return `<text x="${i * 55}" y="0" fill="${filled ? '#FBBF24' : '#374151'}" font-size="40">★</text>`;
      }).join('')}
    </g>
    
    <!-- 등급 -->
    <text x="0" y="80" fill="#ffffff" font-size="42" font-weight="bold" font-family="system-ui, sans-serif">${scoreGrade}</text>
    
    <!-- 코멘트 -->
    <text x="0" y="130" fill="#cbd5e1" font-size="22" font-family="system-ui, sans-serif">${scoreComment.slice(0, 20)}${scoreComment.length > 20 ? '...' : ''}</text>
    
    <!-- 분석 항목 요약 -->
    <g transform="translate(0, 180)">
      <rect x="0" y="0" width="150" height="55" rx="27" fill="#ef4444" opacity="0.2"/>
      <text x="75" y="36" text-anchor="middle" fill="#ef4444" font-size="22" font-weight="600" font-family="system-ui, sans-serif">🚨 위험 ${highCount}개</text>
      
      <rect x="165" y="0" width="150" height="55" rx="27" fill="#f97316" opacity="0.2"/>
      <text x="240" y="36" text-anchor="middle" fill="#f97316" font-size="22" font-weight="600" font-family="system-ui, sans-serif">⚠️ 주의 ${mediumCount}개</text>
      
      <rect x="330" y="0" width="150" height="55" rx="27" fill="#22c55e" opacity="0.2"/>
      <text x="405" y="36" text-anchor="middle" fill="#22c55e" font-size="22" font-weight="600" font-family="system-ui, sans-serif">✅ 양호 ${lowCount}개</text>
    </g>
  </g>
  
  <!-- 하단 CTA 영역 -->
  <g transform="translate(540, 750)">
    <rect x="-420" y="0" width="840" height="100" rx="50" fill="#FF6B35" opacity="0.15"/>
    <text x="0" y="42" text-anchor="middle" fill="#ffffff" font-size="28" font-weight="600" font-family="system-ui, sans-serif">📱 나도 무료로 분석 받아보기</text>
    <text x="0" y="78" text-anchor="middle" fill="#FF6B35" font-size="24" font-weight="bold" font-family="system-ui, sans-serif">app.sundayhug.kr/customer/sleep</text>
  </g>
  
  <!-- 하단 브랜드 -->
  <g transform="translate(540, 1000)">
    <text x="0" y="0" text-anchor="middle" fill="#64748b" font-size="20" font-family="system-ui, sans-serif">Powered by 썬데이허그 AI • 안전한 아기 수면을 위해</text>
  </g>
</svg>
  `.trim();
}

/**
 * 세로형 인스타그램 카드 (4:5 비율, 스토리/릴스용)
 */
export function generateVerticalShareCardSVG(data: ShareCardData): string {
  const { safetyScore, scoreComment, highCount, mediumCount, lowCount, analysisDate } = data;
  const scoreColor = getScoreColor(safetyScore);
  const scoreGrade = getScoreGrade(safetyScore);
  
  const radius = 150;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  return `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
    <linearGradient id="scoreGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${scoreColor}"/>
      <stop offset="100%" style="stop-color:${scoreColor}99"/>
    </linearGradient>
    <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- 배경 -->
  <rect width="1080" height="1350" fill="url(#bgGradient2)"/>
  
  <!-- 배경 장식 -->
  <circle cx="900" cy="200" r="300" fill="${scoreColor}" opacity="0.05"/>
  <circle cx="180" cy="1150" r="350" fill="${scoreColor}" opacity="0.03"/>
  
  <!-- 상단 브랜드 -->
  <g transform="translate(540, 100)">
    <text x="0" y="0" text-anchor="middle" fill="#ffffff" font-size="44" font-weight="bold" font-family="system-ui, sans-serif">🌙 AI 수면 환경 분석</text>
    <text x="0" y="55" text-anchor="middle" fill="#94a3b8" font-size="26" font-family="system-ui, sans-serif">썬데이허그 | ${analysisDate}</text>
  </g>
  
  <!-- 메인 점수 원형 (중앙) -->
  <g transform="translate(540, 450)">
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#374151" stroke-width="24"/>
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="url(#scoreGradient2)" stroke-width="24" 
            stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90)" filter="url(#glow2)"/>
    <text x="0" y="-20" text-anchor="middle" fill="#ffffff" font-size="120" font-weight="bold" font-family="system-ui, sans-serif">${safetyScore}</text>
    <text x="0" y="45" text-anchor="middle" fill="#94a3b8" font-size="32" font-family="system-ui, sans-serif">/ 100점</text>
  </g>
  
  <!-- 별점 & 등급 -->
  <g transform="translate(540, 700)">
    <g transform="translate(-137, 0)">
      ${Array.from({ length: 5 }, (_, i) => {
        const filled = i < (safetyScore >= 90 ? 5 : safetyScore >= 75 ? 4 : safetyScore >= 60 ? 3 : safetyScore >= 40 ? 2 : 1);
        return `<text x="${i * 55}" y="0" fill="${filled ? '#FBBF24' : '#374151'}" font-size="50">★</text>`;
      }).join('')}
    </g>
    <text x="0" y="80" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="bold" font-family="system-ui, sans-serif">${scoreGrade}</text>
    <text x="0" y="130" text-anchor="middle" fill="#cbd5e1" font-size="26" font-family="system-ui, sans-serif">${scoreComment.slice(0, 25)}${scoreComment.length > 25 ? '...' : ''}</text>
  </g>
  
  <!-- 분석 항목 요약 -->
  <g transform="translate(540, 920)">
    <rect x="-400" y="0" width="250" height="70" rx="35" fill="#ef4444" opacity="0.2"/>
    <text x="-275" y="46" text-anchor="middle" fill="#ef4444" font-size="26" font-weight="600" font-family="system-ui, sans-serif">🚨 위험 ${highCount}개</text>
    
    <rect x="-125" y="0" width="250" height="70" rx="35" fill="#f97316" opacity="0.2"/>
    <text x="0" y="46" text-anchor="middle" fill="#f97316" font-size="26" font-weight="600" font-family="system-ui, sans-serif">⚠️ 주의 ${mediumCount}개</text>
    
    <rect x="150" y="0" width="250" height="70" rx="35" fill="#22c55e" opacity="0.2"/>
    <text x="275" y="46" text-anchor="middle" fill="#22c55e" font-size="26" font-weight="600" font-family="system-ui, sans-serif">✅ 양호 ${lowCount}개</text>
  </g>
  
  <!-- 하단 CTA -->
  <g transform="translate(540, 1100)">
    <rect x="-420" y="0" width="840" height="120" rx="60" fill="#FF6B35" opacity="0.15"/>
    <text x="0" y="50" text-anchor="middle" fill="#ffffff" font-size="32" font-weight="600" font-family="system-ui, sans-serif">📱 나도 무료로 분석 받아보기</text>
    <text x="0" y="95" text-anchor="middle" fill="#FF6B35" font-size="28" font-weight="bold" font-family="system-ui, sans-serif">app.sundayhug.kr/customer/sleep</text>
  </g>
  
  <!-- 하단 브랜드 -->
  <text x="540" y="1310" text-anchor="middle" fill="#64748b" font-size="22" font-family="system-ui, sans-serif">Powered by 썬데이허그 AI</text>
</svg>
  `.trim();
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
    scoreComment: analysis.scoreComment || "수면 환경을 분석했어요",
    highCount: feedbackItems.filter(i => i.riskLevel === "High").length,
    mediumCount: feedbackItems.filter(i => i.riskLevel === "Medium").length,
    lowCount: feedbackItems.filter(i => i.riskLevel === "Low" || i.riskLevel === "Info").length,
    babyName,
    analysisDate: analysis.created_at 
      ? new Date(analysis.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
    analysisId: analysis.id,
  };
}



