/**
 * Story Card Modal Component
 *
 * 생성된 스토리 카드 이미지를 전체 화면으로 표시
 * 모바일에서 길게 눌러서 저장할 수 있도록 안내
 */
import { X } from "lucide-react";
import { useEffect } from "react";

interface StoryCardModalProps {
  imageUrl: string;
  score: number;
  onClose: () => void;
}

export function StoryCardModal({ imageUrl, score, onClose }: StoryCardModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* 상단 헤더 */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 text-white">
        <div className="text-lg font-bold">스토리 카드 저장</div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 이미지 영역 */}
      <div 
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={`수면 분석 결과 ${score}점`}
          className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        />
      </div>

      {/* 하단 안내 */}
      <div className="flex-shrink-0 p-6 text-center">
        <div className="bg-white/10 rounded-2xl p-5 max-w-sm mx-auto">
          <p className="text-white text-lg font-bold mb-2">
            📱 이미지를 길게 눌러서 저장하세요
          </p>
          <p className="text-white/70 text-sm">
            저장 후 인스타그램 스토리에 공유해보세요!
          </p>
        </div>

        {/* PC용 다운로드 버튼 */}
        <a
          href={imageUrl}
          download={`수면분석-${score}점.png`}
          className="mt-4 inline-block px-6 py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors md:hidden-none"
          onClick={(e) => e.stopPropagation()}
        >
          이미지 다운로드
        </a>
      </div>
    </div>
  );
}

