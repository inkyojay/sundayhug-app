/**
 * Share Card Image Generator
 * 
 * 수면 분석 결과를 공유용 카드 이미지로 생성합니다.
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
  if (score >= 90) return "매우 안전";
  if (score >= 75) return "안전";
  if (score >= 60) return "보통";
  if (score >= 40) return "주의";
  return "위험";
}

// 별점 생성
function getStars(score: number): string {
  const starCount = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  return "⭐".repeat(starCount) + "☆".repeat(5 - starCount);
}

interface ShareCardData {
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
 * SVG 공유 카드 생성
 */
export function generateShareCardSVG(data: ShareCardData): string {
  const { safetyScore, scoreComment, highCount, mediumCount, lowCount, babyName, analysisDate, analysisId } = data;
  const scoreColor = getScoreColor(safetyScore);
  const scoreGrade = getScoreGrade(safetyScore);
  const stars = getStars(safetyScore);
  
  // 원형 진행률 계산
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  return `
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${scoreColor}"/>
      <stop offset="100%" style="stop-color:${scoreColor}88"/>
    </linearGradient>
  </defs>
  
  <!-- 배경 -->
  <rect width="600" height="400" rx="24" fill="url(#bgGradient)"/>
  
  <!-- 브랜드 로고 영역 -->
  <text x="40" y="45" fill="#ffffff" font-size="18" font-weight="bold" font-family="sans-serif">🌙 썬데이허그</text>
  <text x="40" y="68" fill="#94a3b8" font-size="13" font-family="sans-serif">AI 수면 환경 분석</text>
  
  <!-- 점수 원형 -->
  <g transform="translate(130, 200)">
    <!-- 배경 원 -->
    <circle cx="0" cy="0" r="70" fill="none" stroke="#334155" stroke-width="10"/>
    <!-- 진행률 원 -->
    <circle cx="0" cy="0" r="70" fill="none" stroke="url(#scoreGradient)" stroke-width="10" 
            stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90)"/>
    <!-- 점수 텍스트 -->
    <text x="0" y="-10" text-anchor="middle" fill="#ffffff" font-size="42" font-weight="bold" font-family="sans-serif">${safetyScore}</text>
    <text x="0" y="15" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif">/ 100점</text>
  </g>
  
  <!-- 오른쪽 정보 영역 -->
  <g transform="translate(250, 120)">
    <!-- 별점 -->
    <text x="0" y="0" fill="#fbbf24" font-size="20" font-family="sans-serif">${stars}</text>
    
    <!-- 등급 -->
    <text x="0" y="35" fill="#ffffff" font-size="24" font-weight="bold" font-family="sans-serif">${scoreGrade}</text>
    
    <!-- 코멘트 -->
    <text x="0" y="65" fill="#cbd5e1" font-size="13" font-family="sans-serif">${scoreComment.slice(0, 25)}${scoreComment.length > 25 ? '...' : ''}</text>
    
    <!-- 분석 항목 요약 -->
    <g transform="translate(0, 100)">
      <rect x="0" y="0" width="80" height="28" rx="14" fill="#ef444422"/>
      <text x="40" y="19" text-anchor="middle" fill="#ef4444" font-size="12" font-weight="600" font-family="sans-serif">🚨 위험 ${highCount}</text>
      
      <rect x="90" y="0" width="80" height="28" rx="14" fill="#f9731622"/>
      <text x="130" y="19" text-anchor="middle" fill="#f97316" font-size="12" font-weight="600" font-family="sans-serif">⚠️ 주의 ${mediumCount}</text>
      
      <rect x="180" y="0" width="80" height="28" rx="14" fill="#22c55e22"/>
      <text x="220" y="19" text-anchor="middle" fill="#22c55e" font-size="12" font-weight="600" font-family="sans-serif">✅ 양호 ${lowCount}</text>
    </g>
  </g>
  
  <!-- 하단 CTA -->
  <g transform="translate(0, 330)">
    <rect x="40" y="0" width="520" height="50" rx="12" fill="#FF6B3520"/>
    <text x="300" y="32" text-anchor="middle" fill="#FF6B35" font-size="14" font-weight="600" font-family="sans-serif">📱 나도 무료 분석 받기 → sundayhug.com/sleep</text>
  </g>
  
  <!-- 날짜 -->
  <text x="560" y="45" text-anchor="end" fill="#64748b" font-size="11" font-family="sans-serif">${analysisDate}</text>
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


