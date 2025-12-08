/**
 * Analysis Result Component - Redesigned
 *
 * PC와 모바일 모두에서 세련되게 보이는 분석 결과 컴포넌트
 */
import { 
  ChevronDown, 
  Download, 
  RefreshCw, 
  Share2, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  Moon,
  Image as ImageIcon,
  MessageCircle,
  Instagram
} from "lucide-react";
import { useState, useRef } from "react";

import { Button } from "~/core/components/ui/button";
import { cn } from "~/core/lib/utils";

import type { AnalysisReport, RiskLevel } from "../schema";
import { getProductRecommendations, type FeedbackItem } from "../lib/product-recommendations";
import { ProductRecommendations } from "./product-recommendations";

// 점수에 따른 색상 반환
function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e"; // green-500
  if (score >= 75) return "#84cc16"; // lime-500
  if (score >= 60) return "#eab308"; // yellow-500
  if (score >= 40) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

// 점수에 따른 등급 반환
function getScoreGrade(score: number): string {
  if (score >= 90) return "매우 안전한 환경이에요! 🎉";
  if (score >= 75) return "안전한 환경이에요! 👍";
  if (score >= 60) return "괜찮지만 개선이 필요해요";
  if (score >= 40) return "주의가 필요한 환경이에요 ⚠️";
  return "즉시 개선이 필요해요! 🚨";
}

// 기본 점수 코멘트
function getDefaultScoreComment(score: number): string {
  if (score >= 90) return "우리 아기가 안전하게 잘 수 있는 환경입니다.";
  if (score >= 75) return "전반적으로 양호하지만 몇 가지 개선점이 있어요.";
  if (score >= 60) return "안전을 위해 개선이 필요한 부분이 있어요.";
  if (score >= 40) return "아기의 안전을 위해 즉시 조치가 필요해요.";
  return "심각한 위험 요소가 있어요. 즉시 개선해주세요.";
}

// 별점 렌더링
function renderStars(score: number) {
  const starCount = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <span 
        key={i} 
        className={`text-xl ${i < starCount ? "text-yellow-400" : "text-white/20"}`}
      >
        ⭐
      </span>
    );
  }
  return stars;
}

interface AnalysisResultProps {
  report: AnalysisReport;
  imagePreview: string;
  analysisId?: string;
  babyAgeMonths?: number;
  onReset: () => void;
  onDownloadSlides?: () => void;
  isDownloading?: boolean;
}

// 위험도별 설정 (영문 키 사용 - Gemini API 응답 형식)
const riskConfig = {
  High: { 
    bg: "bg-red-50", 
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
    label: "위험",
    icon: AlertTriangle,
    pin: "bg-red-500"
  },
  Medium: { 
    bg: "bg-amber-50", 
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    label: "주의",
    icon: AlertCircle,
    pin: "bg-amber-500"
  },
  Low: { 
    bg: "bg-emerald-50", 
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    label: "양호",
    icon: CheckCircle,
    pin: "bg-emerald-500"
  },
  Info: { 
    bg: "bg-blue-50", 
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    label: "정보",
    icon: AlertCircle,
    pin: "bg-blue-500"
  },
};

export function AnalysisResult({
  report,
  imagePreview,
  analysisId,
  babyAgeMonths,
  onReset,
  onDownloadSlides,
  isDownloading = false,
}: AnalysisResultProps) {
  const [activeFeedbackId, setActiveFeedbackId] = useState<number | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // 제품 추천 생성
  const productRecommendations = getProductRecommendations(
    report.feedbackItems as FeedbackItem[],
    babyAgeMonths
  );

  // 카카오톡 공유
  const handleKakaoShare = async () => {
    // 결과 페이지 URL 생성
    const shareUrl = analysisId 
      ? `${window.location.origin}/customer/sleep/result/${analysisId}`
      : window.location.href;

    // 공유 카드 이미지 URL (analysisId가 있으면 서버 생성 이미지 사용)
    const shareImageUrl = analysisId 
      ? `${window.location.origin}/api/sleep/${analysisId}/share-card?format=png`
      : "https://sundayhug.com/images/sleep-analysis-og.png";

    // 점수 정보 포함한 설명
    const scoreInfo = report.safetyScore 
      ? `점수: ${report.safetyScore}점 ⭐ | ` 
      : "";
    const description = `${scoreInfo}${report.scoreComment || report.summary.substring(0, 80)}`;

    // Kakao SDK가 있는 경우
    if (typeof window !== "undefined" && (window as any).Kakao?.Share) {
      try {
        (window as any).Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: `🌙 수면 환경 분석 결과: ${report.safetyScore || 70}점`,
            description: description,
            imageUrl: shareImageUrl,
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
          social: {
            likeCount: report.safetyScore || 70,
          },
          buttons: [
            {
              title: "내 결과 보기",
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
            {
              title: "나도 분석받기",
              link: {
                mobileWebUrl: `${window.location.origin}/customer/sleep/analyze`,
                webUrl: `${window.location.origin}/customer/sleep/analyze`,
              },
            },
          ],
        });
        return;
      } catch (error) {
        console.log("Kakao share failed, using fallback:", error);
      }
    }
    
    // 대체 공유 방법
    fallbackShare(shareUrl, description);
  };

  // 대체 공유 방법
  const fallbackShare = (url: string, description: string) => {
    if (navigator.share) {
      navigator.share({
        title: `🌙 수면 환경 분석 결과: ${report.safetyScore || 70}점`,
        text: description,
        url: url,
      });
    } else {
      // 클립보드에 복사
      navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다! 카카오톡에 붙여넣기 해주세요.");
    }
  };

  // 인스타그램 카드 이미지 저장/공유
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  
  // 서버에서 생성한 이미지 다운로드/공유 (Vercel OG 사용)
  const handleSaveAsImage = async (style: "square" | "vertical" = "square") => {
    if (!analysisId || isSavingImage) {
      alert("분석 결과가 저장된 후 이미지를 생성할 수 있어요.");
      return;
    }

    setIsSavingImage(true);
    setSaveProgress("이미지 생성 중...");
    
    try {
      // Vercel OG로 한글 지원 이미지 생성
      const imageUrl = `/api/sleep/${analysisId}/instagram-card?style=${style}`;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error("이미지 생성에 실패했습니다.");
      }
      
      const blob = await response.blob();
      const fileName = `썬데이허그_수면분석_${new Date().toISOString().split("T")[0]}.png`;
      
      setSaveProgress("이미지 저장 중...");
      
      // 모바일 체크
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Web Share API로 공유 (모바일 우선)
      if (isMobile && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: "image/png" });
        const shareData = { 
          files: [file],
          title: "🌙 수면 환경 분석 결과",
          text: `아기 수면 환경 점수: ${report.safetyScore}점! 나도 무료로 분석 받아보세요 👉 app.sundayhug.kr/customer/sleep`,
        };
        
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            setShowShareModal(false);
            setIsSavingImage(false);
            setSaveProgress("");
            return;
          } catch (shareError) {
            // 공유 취소됨 - 일반 다운로드로 폴백
            console.log("공유 취소됨");
          }
        }
      }
      
      // 일반 다운로드 (PC 또는 Web Share 미지원 시)
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // 다운로드 완료 안내
      if (isMobile) {
        alert("이미지가 저장되었어요! 📸\n\n인스타그램에 공유하고 친구들에게 자랑해보세요!");
      }
      
    } catch (error) {
      console.error("이미지 저장 실패:", error);
      const errorMsg = error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`이미지 저장에 실패했습니다.\n오류: ${errorMsg}`);
    } finally {
      setIsSavingImage(false);
      setSaveProgress("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons - 모바일 친화적 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Button 
          onClick={onReset} 
          variant="outline"
          className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 h-12"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          새로 분석
        </Button>

        {/* 인스타그램 공유 버튼 - 가장 눈에 띄게 */}
        <Button 
          onClick={() => setShowShareModal(true)}
          disabled={isSavingImage || !analysisId}
          className="rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white hover:opacity-90 h-12 font-semibold shadow-lg"
        >
          {isSavingImage ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {saveProgress || "생성 중..."}
            </>
          ) : (
            <>
              <Instagram className="mr-2 h-5 w-5" />
              인스타 카드 만들기
            </>
          )}
        </Button>
      </div>

      {analysisId && (
        <p className="text-center text-sm text-gray-500">
          ✓ 분석 저장 완료 (ID: {analysisId.substring(0, 8)}...)
        </p>
      )}

      {/* 공유 모달 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">📸 인스타 카드 만들기</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              분석 결과를 예쁜 카드로 저장하고<br />
              인스타그램에 공유해보세요! ✨
            </p>
            
            {/* 카드 스타일 선택 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleSaveAsImage("square")}
                disabled={isSavingImage}
                className="flex flex-col items-center p-4 rounded-2xl border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-orange-50 transition-all"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mb-2 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{report.safetyScore}</span>
                </div>
                <span className="font-medium text-gray-900">1:1 정사각형</span>
                <span className="text-xs text-gray-500">피드 포스트용</span>
              </button>
              
              <button
                onClick={() => handleSaveAsImage("vertical")}
                disabled={isSavingImage}
                className="flex flex-col items-center p-4 rounded-2xl border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-orange-50 transition-all"
              >
                <div className="w-12 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mb-2 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{report.safetyScore}</span>
                </div>
                <span className="font-medium text-gray-900">4:5 세로형</span>
                <span className="text-xs text-gray-500">스토리/릴스용</span>
              </button>
            </div>
            
            {/* 안내 메시지 */}
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-700">
                💡 <strong>Tip!</strong> 저장 후 인스타그램 앱에서 공유하세요
              </p>
              <p className="text-xs text-gray-500 mt-1">
                @sundayhug.official 태그하면 소정의 선물이! 🎁
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div ref={resultRef} data-result-card className="space-y-6 bg-[#F5F5F0] p-4 rounded-3xl">
        {/* Score Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl">
          {/* 점수 영역 */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            {/* 점수 원형 */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={getScoreColor(report.safetyScore)}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(report.safetyScore / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{report.safetyScore}</span>
                <span className="text-white/60 text-sm">/ 100</span>
              </div>
            </div>
            
            {/* 점수 정보 */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                {renderStars(report.safetyScore)}
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                {getScoreGrade(report.safetyScore)}
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                {report.scoreComment || getDefaultScoreComment(report.safetyScore)}
              </p>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <Moon className="w-5 h-5 text-white/60" />
              <h3 className="font-semibold text-white/90">종합 분석</h3>
            </div>
            <p className="text-white/80 leading-relaxed text-sm md:text-base">
              {report.summary}
            </p>
          </div>
        </div>

        {/* PC: 2컬럼 레이아웃, 모바일: 1컬럼 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image with Pins */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <div className="relative">
              <img
                src={imagePreview}
                alt="분석된 수면 환경"
                className="w-full h-auto"
              />

              {/* Risk Pins */}
              {report.feedbackItems.map((item) => {
                const risk = riskConfig[item.riskLevel as keyof typeof riskConfig] || riskConfig["낮음"];
                return (
                  <button
                    key={item.id}
                    className={cn(
                      "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg transition-all duration-200",
                      risk.pin,
                      activeFeedbackId === item.id
                        ? "scale-125 ring-4 ring-white z-20"
                        : "scale-100 hover:scale-110 z-10"
                    )}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    onMouseEnter={() => setActiveFeedbackId(item.id)}
                    onMouseLeave={() => setActiveFeedbackId(null)}
                    onClick={() => setActiveFeedbackId(item.id === activeFeedbackId ? null : item.id)}
                  >
                    {item.id}
                  </button>
                );
              })}
            </div>

            {/* 이미지 범례 */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-red-500"></span>
                  <span className="text-gray-600">위험 높음</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500"></span>
                  <span className="text-gray-600">주의 필요</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                  <span className="text-gray-600">양호</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Items */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              📋 상세 분석
              <span className="text-sm font-normal text-gray-500">
                ({report.feedbackItems.length}개 항목)
              </span>
            </h3>

            <div className="space-y-3">
              {report.feedbackItems.map((item) => {
                const risk = riskConfig[item.riskLevel as keyof typeof riskConfig] || riskConfig["낮음"];
                const RiskIcon = risk.icon;
                const isActive = activeFeedbackId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl p-4 border-2 transition-all duration-200 cursor-pointer",
                      risk.bg,
                      isActive ? "border-gray-400 shadow-md scale-[1.02]" : risk.border,
                    )}
                    onMouseEnter={() => setActiveFeedbackId(item.id)}
                    onMouseLeave={() => setActiveFeedbackId(null)}
                    onClick={() => setActiveFeedbackId(item.id === activeFeedbackId ? null : item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        risk.pin
                      )}>
                        <span className="text-white font-bold text-sm">{item.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base">
                            {item.title}
                          </h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            risk.badge
                          )}>
                            {risk.label}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {item.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* References */}
        {report.references && report.references.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">📚 참고 자료</h3>
            <ul className="space-y-2">
              {report.references.map((ref, index) => (
                <li key={index} className="text-sm">
                  <a
                    href={ref.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {ref.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 제품 추천 섹션 */}
        <ProductRecommendations recommendations={productRecommendations} />
      </div>

      {/* 안내 메시지 */}
      <div className="bg-gray-100 rounded-2xl p-4 text-center">
        <p className="text-gray-600 text-sm">
          ⚠️ AI 분석 결과는 참고용이며,<br className="md:hidden" /> 전문가 상담을 권장합니다.
        </p>
      </div>
    </div>
  );
}
