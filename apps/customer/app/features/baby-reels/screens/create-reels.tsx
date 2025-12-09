/**
 * 베이비릴스 생성 페이지
 * 
 * 수면 분석 결과 → 아이 사진 업로드 → 가사 생성 → 음악 선택 → 영상 생성
 */
import type { Route } from "./+types/create-reels";

import { Link, useLoaderData, useFetcher, data, useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Upload, 
  Music, 
  Video, 
  Sparkles,
  Image as ImageIcon,
  FileText,
  ChevronRight,
  ChevronLeft,
  Play,
  Download,
  Loader2,
  X,
  Check,
  RefreshCw,
  Baby,
  Moon,
  Sun,
  Heart,
  Star,
  CloudSun,
  Mic2,
  Music2,
  Waves
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "우리 아기 노래 만들기 | 썬데이허그" },
    { name: "description", content: "수면 분석 결과로 우리 아기만의 특별한 노래를 만들어보세요" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ analysis: null, isLoggedIn: false });
  }

  const analysisId = params.analysisId;

  // 수면 분석 결과 가져오기
  const { data: analysis } = await supabase
    .from("sleep_analyses")
    .select("*")
    .eq("id", analysisId)
    .single();

  if (!analysis) {
    return data({ analysis: null, isLoggedIn: true });
  }

  // 아기 프로필
  const { data: babyProfile } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return data({ 
    analysis,
    babyProfile,
    isLoggedIn: true 
  });
}

// 음악 스타일 옵션 (다양화)
const MUSIC_STYLES = [
  { 
    id: "lullaby", 
    name: "포근한 자장가", 
    description: "부드러운 피아노와 오르골 선율",
    emoji: "🌙",
    icon: Moon,
    bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
    borderColor: "border-indigo-200 dark:border-indigo-700",
    activeColor: "bg-indigo-100 dark:bg-indigo-800/50 border-indigo-400 dark:border-indigo-500"
  },
  { 
    id: "upbeat", 
    name: "밝고 경쾌한", 
    description: "우쿨렐레와 기타의 즐거운 멜로디",
    emoji: "☀️",
    icon: Sun,
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-700",
    activeColor: "bg-amber-100 dark:bg-amber-800/50 border-amber-400 dark:border-amber-500"
  },
  { 
    id: "emotional", 
    name: "감성 발라드", 
    description: "피아노와 현악기의 따뜻한 감성",
    emoji: "💕",
    icon: Heart,
    bgColor: "bg-rose-50 dark:bg-rose-900/30",
    borderColor: "border-rose-200 dark:border-rose-700",
    activeColor: "bg-rose-100 dark:bg-rose-800/50 border-rose-400 dark:border-rose-500"
  },
  { 
    id: "hopeful", 
    name: "희망찬 팝", 
    description: "밝은 신스와 리듬감 있는 비트",
    emoji: "✨",
    icon: Star,
    bgColor: "bg-teal-50 dark:bg-teal-900/30",
    borderColor: "border-teal-200 dark:border-teal-700",
    activeColor: "bg-teal-100 dark:bg-teal-800/50 border-teal-400 dark:border-teal-500"
  },
  { 
    id: "dreamy", 
    name: "몽환적 앰비언트", 
    description: "잔잔한 신스와 자연 사운드",
    emoji: "☁️",
    icon: CloudSun,
    bgColor: "bg-sky-50 dark:bg-sky-900/30",
    borderColor: "border-sky-200 dark:border-sky-700",
    activeColor: "bg-sky-100 dark:bg-sky-800/50 border-sky-400 dark:border-sky-500"
  },
  { 
    id: "acoustic", 
    name: "따뜻한 어쿠스틱", 
    description: "포크 기타와 부드러운 보컬",
    emoji: "🎸",
    icon: Music2,
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-700",
    activeColor: "bg-orange-100 dark:bg-orange-800/50 border-orange-400 dark:border-orange-500"
  },
];

// 스텝 정의
const STEPS = [
  { id: 1, name: "사진 업로드", icon: ImageIcon },
  { id: 2, name: "가사 확인", icon: FileText },
  { id: 3, name: "음악 선택", icon: Music },
  { id: 4, name: "영상 생성", icon: Video },
];

export default function CreateReelsScreen() {
  const { analysis, babyProfile, isLoggedIn } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const lyricsFetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 상태 관리
  const [currentStep, setCurrentStep] = useState(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState<string>("");
  const [lyricsTitle, setLyricsTitle] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("lullaby");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // 로그인 체크
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg max-w-sm w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">우리 아기 노래 만들기</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">로그인하고 특별한 노래를 만들어보세요</p>
          <Button asChild className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl">
            <Link to="/customer/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 분석 결과 없음
  if (!analysis) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg max-w-sm w-full">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Baby className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">분석 결과를 찾을 수 없어요</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">먼저 수면 환경 분석을 진행해주세요</p>
          <Button asChild className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl">
            <Link to="/customer/sleep/analyze">수면 분석하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 사진 업로드 핸들러
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 최대 10장 제한
    const newPhotos = [...photos, ...files].slice(0, 10);
    setPhotos(newPhotos);

    // 미리보기 URL 생성
    const newUrls = newPhotos.map(file => URL.createObjectURL(file));
    setPhotoUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return newUrls;
    });
  }, [photos]);

  // 사진 삭제
  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    
    URL.revokeObjectURL(photoUrls[index]);
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 가사 생성
  const generateLyrics = async () => {
    console.log("🎵 가사 생성 시작", { analysisId: analysis.id, summary: analysis.summary });
    setIsGeneratingLyrics(true);
    
    try {
      const response = await fetch("/api/baby-reels/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.id,
          babyName: babyProfile?.name || "우리 아기",
          feedback: analysis.summary,
        }),
      });

      console.log("📡 API 응답 상태:", response.status);
      const result = await response.json();
      console.log("📝 API 응답:", result);
      
      if (result.success) {
        setLyricsTitle(result.title);
        setLyrics(result.lyrics);
        if (result.projectId) {
          setProjectId(result.projectId);
        }
      } else {
        console.error("가사 생성 실패:", result.error);
      }
    } catch (error) {
      console.error("가사 생성 오류:", error);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  // 음악 생성 (데모 모드)
  const generateMusic = async () => {
    if (!lyrics) {
      setMusicError("가사가 필요합니다.");
      return;
    }

    setIsGeneratingMusic(true);
    setMusicError(null);
    
    try {
      const response = await fetch("/api/baby-reels/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: lyricsTitle,
          lyrics,
          style: selectedStyle,
        }),
      });

      const result = await response.json();
      
      if (result.success && result.audioUrl) {
        setMusicUrl(result.audioUrl);
      } else if (result.error?.includes("503") || result.error?.includes("suspended")) {
        // Suno API 문제 - 데모 모드 안내
        setMusicError("현재 음악 생성 서비스가 점검 중입니다. 잠시 후 다시 시도해주세요.");
      } else {
        setMusicError(result.error || "음악 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("음악 생성 오류:", error);
      setMusicError("음악 생성 서비스가 일시 중단되었습니다.");
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  // Step 2로 이동 시 가사 자동 생성
  useEffect(() => {
    if (currentStep === 2 && !lyrics) {
      generateLyrics();
    }
  }, [currentStep]);

  // 다음 스텝
  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 이전 스텝
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 영상 생성 (MVP: 이미지 슬라이드쇼)
  const generateVideo = async () => {
    setIsGeneratingVideo(true);
    
    setTimeout(() => {
      setIsGeneratingVideo(false);
      setVideoUrl("generated");
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212]">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to={`/customer/sleep/result/${analysis.id}`}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">우리 아기 노래 만들기</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">수면 분석 결과로 특별한 노래를 만들어요</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center shadow-lg">
            <Music className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.id < currentStep 
                      ? "bg-green-500 text-white" 
                      : step.id === currentStep 
                      ? "bg-[#FF6B35] text-white" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                  }`}>
                    {step.id < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    step.id <= currentStep 
                      ? "text-gray-700 dark:text-gray-200 font-medium" 
                      : "text-gray-400"
                  }`}>{step.name}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 ${
                    step.id < currentStep ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm min-h-[400px]">
          
          {/* Step 1: 사진 업로드 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-7 h-7 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  아이 사진을 올려주세요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  영상에 사용될 사진을 3~10장 선택해주세요
                </p>
              </div>

              {/* 업로드 영역 */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-200 font-medium">클릭하여 사진 선택</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG (최대 10장)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* 사진 미리보기 */}
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img 
                        src={url} 
                        alt={`사진 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(index);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-gray-600 dark:text-gray-300">선택된 사진</span>
                <span className={`font-bold ${photoUrls.length >= 3 ? "text-green-600" : "text-[#FF6B35]"}`}>
                  {photoUrls.length}/10장
                </span>
              </div>
            </div>
          )}

          {/* Step 2: 가사 확인/수정 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  가사를 확인해주세요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  수면 분석 결과를 바탕으로 가사가 생성되었어요
                </p>
              </div>

              {isGeneratingLyrics ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Mic2 className="w-8 h-8 text-[#FF6B35]" />
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 font-medium">가사를 생성하고 있어요...</p>
                  <p className="text-gray-400 text-sm mt-1">AI가 특별한 가사를 만들고 있어요</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                    <input
                      type="text"
                      value={lyricsTitle}
                      onChange={(e) => setLyricsTitle(e.target.value)}
                      placeholder="노래 제목"
                      className="w-full bg-transparent text-gray-900 dark:text-white text-lg font-bold border-b border-gray-200 dark:border-gray-600 pb-3 mb-4 outline-none focus:border-[#FF6B35] placeholder-gray-400"
                    />
                    <Textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="가사 내용..."
                      className="w-full bg-transparent text-gray-700 dark:text-gray-200 border-0 resize-none min-h-[180px] outline-none placeholder-gray-400"
                      rows={8}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={generateLyrics}
                      variant="outline"
                      className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      가사 다시 생성
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: 음악 스타일 선택 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Music className="w-7 h-7 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  음악 스타일을 선택해주세요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  가사에 어울리는 음악 분위기를 골라주세요
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MUSIC_STYLES.map((style) => {
                  const IconComponent = style.icon;
                  const isSelected = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      disabled={isGeneratingMusic}
                      className={`relative p-4 rounded-2xl text-left transition-all border-2 ${
                        isSelected
                          ? style.activeColor
                          : `${style.bgColor} ${style.borderColor}`
                      } ${isGeneratingMusic ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-white/80" : "bg-white/60 dark:bg-white/20"
                        }`}>
                          <IconComponent className={`w-5 h-5 ${isSelected ? "text-[#FF6B35]" : "text-gray-600 dark:text-gray-300"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 dark:text-white font-bold text-sm truncate">{style.name}</h3>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">{style.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 음악 생성 버튼 */}
              <Button
                onClick={generateMusic}
                disabled={isGeneratingMusic || !lyrics}
                className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl disabled:opacity-50"
              >
                {isGeneratingMusic ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    음악 생성 중...
                  </>
                ) : musicUrl ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    다시 생성하기
                  </>
                ) : (
                  <>
                    <Waves className="w-5 h-5 mr-2" />
                    음악 생성하기
                  </>
                )}
              </Button>

              {/* 에러 메시지 */}
              {musicError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                  <p className="text-red-600 dark:text-red-400 text-sm">{musicError}</p>
                </div>
              )}

              {/* 음악 미리듣기 */}
              {musicUrl && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <p className="text-green-700 dark:text-green-400 text-sm mb-3 text-center font-medium">
                    ✅ 음악이 생성되었어요!
                  </p>
                  <audio 
                    controls 
                    src={musicUrl} 
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: 영상 생성 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Video className="w-7 h-7 text-[#FF6B35]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  영상을 만들어볼까요?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  모든 준비가 완료되었어요!
                </p>
              </div>

              {/* 요약 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-500 dark:text-gray-400">사진</span>
                  <span className="text-gray-900 dark:text-white font-medium">{photos.length}장</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-500 dark:text-gray-400">노래 제목</span>
                  <span className="text-gray-900 dark:text-white font-medium">{lyricsTitle || "미정"}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500 dark:text-gray-400">음악 스타일</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {MUSIC_STYLES.find(s => s.id === selectedStyle)?.name}
                  </span>
                </div>
              </div>

              {videoUrl ? (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-2xl aspect-[9/16] max-w-[240px] mx-auto flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-12 h-12 text-white/40 mx-auto mb-2" />
                      <p className="text-white/60 text-sm">영상 미리보기</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl">
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                    <Button variant="outline" className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl">
                      공유하기
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={generateVideo}
                  disabled={isGeneratingVideo}
                  className="w-full h-14 bg-gradient-to-r from-[#FF6B35] to-orange-500 hover:opacity-90 text-white text-lg font-bold rounded-xl disabled:opacity-50"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      영상 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      영상 만들기
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="outline"
            className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>

          {currentStep < 4 && (
            <Button
              onClick={nextStep}
              disabled={currentStep === 1 && photos.length < 3}
              className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl disabled:opacity-30"
            >
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* 안내 메시지 */}
        {currentStep === 1 && photos.length < 3 && (
          <p className="text-center text-[#FF6B35] text-sm mt-4 font-medium">
            ⚠️ 최소 3장의 사진이 필요해요
          </p>
        )}
      </div>
    </div>
  );
}
