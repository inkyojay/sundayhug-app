/**
 * Color Badge Component
 * 
 * 색상명에 따라 자동으로 배경색과 텍스트 색상을 지정하는 뱃지 컴포넌트
 */
import { cn } from "~/core/lib/utils";

// 색상 팔레트 매핑 (색상명 -> 배경색)
const colorPalette: Record<string, string> = {
  // 기본 색상
  "블랙": "#1a1a1a",
  "블랙색": "#1a1a1a",
  "검정": "#1a1a1a",
  "검은색": "#1a1a1a",
  "차콜": "#36454F",
  "차콜블랙": "#36454F",
  "그레이": "#808080",
  "회색": "#808080",
  "라이트그레이": "#D3D3D3",
  "다크그레이": "#505050",
  "화이트": "#ffffff",
  "흰색": "#ffffff",
  "아이보리": "#FFFFF0",
  "크림": "#FFFDD0",
  "베이지": "#F5F5DC",
  "오트밀": "#DFD4C7",
  
  // 브라운 계열
  "브라운": "#8B4513",
  "갈색": "#8B4513",
  "카멜": "#C19A6B",
  "카키": "#8B8B00",
  "모카": "#967969",
  "초콜릿": "#7B3F00",
  "탄": "#D2B48C",
  "카라멜": "#FFD59A",
  "샌드": "#C2B280",
  
  // 레드 계열
  "레드": "#FF0000",
  "빨강": "#FF0000",
  "빨간색": "#FF0000",
  "와인": "#722F37",
  "버건디": "#800020",
  "코랄": "#FF7F50",
  "피치": "#FFCBA4",
  "핑크": "#FFC0CB",
  "로즈": "#FF007F",
  "핫핑크": "#FF69B4",
  "샐몬": "#FA8072",
  
  // 오렌지/옐로우 계열
  "오렌지": "#FFA500",
  "주황": "#FFA500",
  "머스타드": "#FFDB58",
  "옐로우": "#FFFF00",
  "노랑": "#FFFF00",
  "노란색": "#FFFF00",
  "레몬": "#FFF44F",
  "골드": "#FFD700",
  "금색": "#FFD700",
  
  // 그린 계열
  "그린": "#008000",
  "녹색": "#008000",
  "초록": "#008000",
  "올리브": "#808000",
  "카키그린": "#728C00",
  "민트": "#98FF98",
  "라임": "#32CD32",
  "포레스트": "#228B22",
  "에메랄드": "#50C878",
  "터콰이즈": "#40E0D0",
  "틸": "#008080",
  
  // 블루 계열
  "블루": "#0000FF",
  "파랑": "#0000FF",
  "파란색": "#0000FF",
  "네이비": "#000080",
  "남색": "#000080",
  "스카이블루": "#87CEEB",
  "로얄블루": "#4169E1",
  "베이비블루": "#89CFF0",
  "청록": "#008B8B",
  "인디고": "#4B0082",
  "아쿠아": "#00FFFF",
  "데님": "#1560BD",
  
  // 퍼플 계열
  "퍼플": "#800080",
  "보라": "#800080",
  "보라색": "#800080",
  "바이올렛": "#8B00FF",
  "라벤더": "#E6E6FA",
  "플럼": "#8E4585",
  "라일락": "#C8A2C8",
  "마젠타": "#FF00FF",
  
  // 기타
  "멀티": "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)",
  "믹스": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "컬러": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "실버": "#C0C0C0",
  "은색": "#C0C0C0",
  "메탈릭": "#BCC6CC",
  "펄": "#EAE0C8",
  "클리어": "transparent",
  "투명": "transparent",
};

// 밝은 색상 판단 (텍스트 색상 결정용)
function isLightColor(hex: string): boolean {
  if (hex.startsWith("linear-gradient") || hex === "transparent") return true;
  
  const color = hex.replace("#", "");
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// 색상명에서 배경색 가져오기
export function getColorFromName(colorName: string | null | undefined): string {
  if (!colorName) return "#9CA3AF";
  const normalizedName = colorName.trim().toLowerCase();
  
  // 직접 매칭
  for (const [key, value] of Object.entries(colorPalette)) {
    if (key.toLowerCase() === normalizedName) {
      return value;
    }
  }
  
  // 부분 매칭
  for (const [key, value] of Object.entries(colorPalette)) {
    if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
      return value;
    }
  }
  
  // 기본값 (회색)
  return "#9CA3AF";
}

interface ColorBadgeProps {
  colorName?: string | null;
  color?: string | null; // alias for colorName
  className?: string;
  showColorDot?: boolean;
}

export function ColorBadge({ colorName, color, className, showColorDot = true }: ColorBadgeProps) {
  const actualColorName = colorName || color;
  if (!actualColorName) return null;
  
  const bgColor = getColorFromName(actualColorName);
  const isLight = isLightColor(bgColor);
  const isGradient = bgColor.startsWith("linear-gradient");
  const isTransparent = bgColor === "transparent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
        isTransparent ? "border border-dashed border-slate-300 bg-white text-slate-600" :
        isLight ? "text-slate-700 border border-slate-200" : "text-white",
        className
      )}
      style={{ 
        background: isTransparent ? "white" : bgColor,
      }}
    >
      {showColorDot && !isTransparent && (
        <span 
          className={cn(
            "w-2 h-2 rounded-full border",
            isLight ? "border-slate-300" : "border-white/30"
          )}
          style={{ backgroundColor: isGradient ? "#888" : bgColor }}
        />
      )}
      {actualColorName}
    </span>
  );
}

interface SizeBadgeProps {
  size?: string | null;
  className?: string;
}

export function SizeBadge({ size, className }: SizeBadgeProps) {
  if (!size) return null;
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200",
        className
      )}
    >
      {size}
    </span>
  );
}

