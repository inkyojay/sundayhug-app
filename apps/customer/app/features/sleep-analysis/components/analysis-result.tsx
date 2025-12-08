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
import { getProductRecommendationsFromDB, type FeedbackItem, type Product } from "../lib/product-recommendations";
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
  products?: Product[];  // DB에서 가져온 추천 제품 목록
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
  products = [],
  onReset,
  onDownloadSlides,
  isDownloading = false,
}: AnalysisResultProps) {
  const [activeFeedbackId, setActiveFeedbackId] = useState<number | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // 제품 추천 생성 (DB 데이터 사용)
  const productRecommendations = getProductRecommendationsFromDB(
    products,
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

  // 인스타그램 카드 슬라이드
  const [showShareModal, setShowShareModal] = useState(false);
  const [slideUrls, setSlideUrls] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const [slideError, setSlideError] = useState<string | null>(null);
  
  // 터치 스와이프 지원
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // 최소 스와이프 거리
    
    if (diff > threshold && currentSlide < slideUrls.length - 1) {
      // 왼쪽으로 스와이프 → 다음 슬라이드
      setCurrentSlide(prev => prev + 1);
    } else if (diff < -threshold && currentSlide > 0) {
      // 오른쪽으로 스와이프 → 이전 슬라이드
      setCurrentSlide(prev => prev - 1);
    }
  };
  
  // 슬라이드 로드
  const loadSlides = async () => {
    if (!analysisId || slideUrls.length > 0) return;
    
    setIsLoadingSlides(true);
    setSlideError(null);
    
    try {
      // 먼저 기존 슬라이드가 있는지 확인
      const getResponse = await fetch(`/api/sleep/${analysisId}/slides`);
      const getData = await getResponse.json();
      
      if (getData.success && getData.data?.slideUrls?.length > 0) {
        setSlideUrls(getData.data.slideUrls);
        return;
      }
      
      // 없으면 새로 생성
      const postResponse = await fetch(`/api/sleep/${analysisId}/slides`, { method: "POST" });
      const postData = await postResponse.json();
      
      if (postData.success && postData.data?.slideUrls) {
        setSlideUrls(postData.data.slideUrls);
      } else {
        throw new Error(postData.error || "슬라이드 생성 실패");
      }
    } catch (error) {
      console.error("슬라이드 로드 에러:", error);
      setSlideError("슬라이드를 불러올 수 없습니다.");
    } finally {
      setIsLoadingSlides(false);
    }
  };
  
  // 서버에서 SVG 생성 후 클라이언트에서 PNG 변환
  const handleSaveAsImage = async (style: "square" | "vertical" = "square") => {
    if (!analysisId || isSavingImage) {
      alert("분석 결과가 저장된 후 이미지를 생성할 수 있어요.");
      return;
    }

    setIsSavingImage(true);
    setSaveProgress("SVG 생성 중...");
    
    try {
      // SVG 가져오기
      const svgUrl = `/api/sleep/${analysisId}/share-card?style=${style}`;
      const response = await fetch(svgUrl);
      
      if (!response.ok) {
        throw new Error("이미지 생성에 실패했습니다.");
      }
      
      const svgText = await response.text();
      setSaveProgress("PNG 변환 중...");
      
      // SVG → PNG 변환
      const width = style === "vertical" ? 1080 : 1080;
      const height = style === "vertical" ? 1350 : 1080;
      
      // SVG를 data URL로 변환
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const svgDataUrl = URL.createObjectURL(svgBlob);
      
      // Canvas에 그리기
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Canvas 컨텍스트를 생성할 수 없습니다.");
      }
      
      // 이미지 로드 및 그리기
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.fillStyle = "#0f172a"; // 배경색
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => reject(new Error("SVG 로드 실패"));
        img.src = svgDataUrl;
      });
      
      URL.revokeObjectURL(svgDataUrl);
      
      // Canvas → PNG Blob
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG 변환 실패"));
        }, "image/png", 1.0);
      });
      
      const fileName = `썬데이허그_수면분석_${new Date().toISOString().split("T")[0]}.png`;
      setSaveProgress("저장 중...");
      
      // 모바일 체크
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Web Share API로 공유 (모바일 우선)
      if (isMobile && navigator.share && navigator.canShare) {
        const file = new File([pngBlob], fileName, { type: "image/png" });
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
            console.log("공유 취소됨");
          }
        }
      }
      
      // 일반 다운로드 (PC 또는 Web Share 미지원 시)
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowShareModal(false);
      
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
          onClick={() => {
            setShowShareModal(true);
            loadSlides();
          }}
          disabled={isLoadingSlides || !analysisId}
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

      {/* 캐러셀 슬라이드 모달 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => { setShowShareModal(false); setCurrentSlide(0); }}
              className="text-white text-lg font-medium"
            >
              ✕ 닫기
            </button>
            <span className="text-white font-bold">
              {slideUrls.length > 0 ? `${currentSlide + 1} / ${slideUrls.length}` : "인스타 카드"}
            </span>
            <div className="w-16"></div>
          </div>
          
          {/* 안내 메시지 */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 py-2 px-4 text-center">
            <p className="text-white font-bold text-sm">
              👆 이미지 길게 누르면 저장! 👈👉 스와이프로 넘기기
            </p>
          </div>
          
          {/* 캐러셀 영역 */}
          <div 
            className="flex-1 relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoadingSlides ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  <p className="text-white">카드뉴스 생성 중...</p>
                  <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
                </div>
              </div>
            ) : slideError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">😢</div>
                  <p className="text-white mb-2">{slideError}</p>
                  <button 
                    onClick={loadSlides}
                    className="text-orange-400 underline"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            ) : slideUrls.length > 0 ? (
              <>
                {/* 슬라이드 컨테이너 */}
                <div 
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {slideUrls.map((url, index) => (
                    <div 
                      key={index}
                      className="min-w-full h-full flex items-center justify-center p-4"
                    >
                      <img 
                        src={url}
                        alt={`슬라이드 ${index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        style={{ WebkitTouchCallout: 'default' }}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
                
                {/* 좌우 네비게이션 버튼 */}
                {currentSlide > 0 && (
                  <button
                    onClick={() => setCurrentSlide(prev => prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-2xl backdrop-blur-sm"
                  >
                    ‹
                  </button>
                )}
                {currentSlide < slideUrls.length - 1 && (
                  <button
                    onClick={() => setCurrentSlide(prev => prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-2xl backdrop-blur-sm"
                  >
                    ›
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-4">📸</div>
                  <p className="text-white mb-4">카드뉴스를 불러오는 중...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* 하단 인디케이터 & 안내 */}
          <div className="p-4 bg-black/80">
            {/* 페이지 인디케이터 */}
            {slideUrls.length > 0 && (
              <div className="flex justify-center gap-2 mb-3">
                {slideUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide 
                        ? "bg-white w-6" 
                        : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
            
            <p className="text-gray-400 text-sm text-center">
              원하는 이미지만 골라서 저장하세요! ✨
            </p>
            <p className="text-orange-400 text-xs text-center mt-1">
              @sundayhug.official 태그하면 선물이! 🎁
            </p>
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
