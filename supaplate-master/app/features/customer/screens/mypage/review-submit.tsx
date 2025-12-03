/**
 * 후기 인증 신청 페이지
 */
import type { Route } from "./+types/review-submit";

import { useState, useRef } from "react";
import { Link, redirect, useLoaderData, useFetcher, data } from "react-router";
import { 
  ArrowLeft, 
  Camera,
  X,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Instagram,
  FileText,
  Gift,
  ChevronRight,
  ImagePlus,
  ExternalLink
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "후기 인증 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login?redirect=/customer/mypage/review-submit");
  }

  // 후기 인증 이력 조회
  const { data: submissions } = await supabase
    .from("review_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data({ 
    submissions: submissions || [],
  });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const formData = await request.formData();
  const reviewType = formData.get("reviewType") as string;
  const reviewUrl = formData.get("reviewUrl") as string;
  const productName = formData.get("productName") as string;
  const screenshotUrls = formData.get("screenshotUrls") as string;

  if (!reviewType || !reviewUrl) {
    return { success: false, error: "필수 정보를 입력해주세요." };
  }

  // URL 유효성 검사
  try {
    new URL(reviewUrl);
  } catch {
    return { success: false, error: "올바른 URL을 입력해주세요." };
  }

  // 중복 신청 체크 (같은 URL)
  const { data: existing } = await supabase
    .from("review_submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("review_url", reviewUrl)
    .single();

  if (existing) {
    return { success: false, error: "이미 신청한 후기입니다." };
  }

  // 스크린샷 URL 파싱
  let screenshots: string[] = [];
  if (screenshotUrls) {
    try {
      screenshots = JSON.parse(screenshotUrls);
    } catch {
      // 파싱 실패 시 빈 배열
    }
  }

  const { error } = await supabase
    .from("review_submissions")
    .insert({
      user_id: user.id,
      review_type: reviewType,
      review_url: reviewUrl,
      product_name: productName || null,
      screenshot_urls: screenshots.length > 0 ? screenshots : null,
    });

  if (error) {
    console.error("후기 인증 신청 오류:", error);
    return { success: false, error: "신청 중 오류가 발생했습니다." };
  }

  return { success: true, message: "후기 인증 신청이 완료되었습니다." };
}

const reviewTypes = [
  {
    id: "momcafe",
    name: "맘카페",
    icon: MessageSquare,
    color: "bg-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-700",
    description: "네이버 카페, 맘스홀릭 등",
    requirements: [
      "사진 3장 이상",
      "텍스트 200자 이상",
      "공개 게시물",
    ],
  },
  {
    id: "instagram",
    name: "인스타그램",
    icon: Instagram,
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    description: "@sundayhug_official 태그",
    requirements: [
      "#썬데이허그 해시태그",
      "제품 사진 포함",
      "공개 계정",
    ],
  },
  {
    id: "blog",
    name: "블로그",
    icon: FileText,
    color: "bg-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    description: "네이버, 티스토리 등",
    requirements: [
      "사진 5장 이상",
      "텍스트 500자 이상",
      "공개 설정",
    ],
  },
];

const statusConfig = {
  pending: { 
    label: "검토 중", 
    color: "bg-yellow-100 text-yellow-700", 
    icon: Clock,
    description: "관리자 검토 중입니다 (1~2 영업일)"
  },
  approved: { 
    label: "승인됨", 
    color: "bg-green-100 text-green-700", 
    icon: CheckCircle,
    description: "승인 완료! 혜택이 지급되었습니다"
  },
  rejected: { 
    label: "반려됨", 
    color: "bg-red-100 text-red-700", 
    icon: XCircle,
    description: "조건을 확인해주세요"
  },
};

export default function ReviewSubmitScreen() {
  const { submissions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetcherData = fetcher.data as any;
  const isSubmitting = fetcher.state === "submitting";

  const selectedTypeInfo = reviewTypes.find(t => t.id === selectedType);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) {
      alert("스크린샷은 최대 3장까지 첨부할 수 있습니다.");
      return;
    }

    const file = files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(prev => [...prev, { file, preview: reader.result as string }].slice(0, 3));
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    setIsUploading(true);
    const urls: string[] = [];

    try {
      for (const photo of photos) {
        const timestamp = Date.now();
        const fileExt = photo.file.name.split(".").pop();
        const fileName = `review_${timestamp}_${Math.random().toString(36).slice(2)}.${fileExt}`;

        const response = await fetch("/api/warranty/upload-photo", {
          method: "POST",
          body: (() => {
            const fd = new FormData();
            fd.append("file", photo.file);
            fd.append("fileName", fileName);
            return fd;
          })(),
        });

        if (response.ok) {
          const { url } = await response.json();
          urls.push(url);
        }
      }
    } catch (error) {
      console.error("스크린샷 업로드 오류:", error);
    } finally {
      setIsUploading(false);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !reviewUrl) {
      alert("후기 유형과 URL을 입력해주세요.");
      return;
    }

    const screenshotUrls = await uploadPhotos();
    
    fetcher.submit(
      {
        reviewType: selectedType,
        reviewUrl,
        productName,
        screenshotUrls: JSON.stringify(screenshotUrls),
      },
      { method: "POST" }
    );
  };

  const resetForm = () => {
    setSelectedType(null);
    setReviewUrl("");
    setProductName("");
    setPhotos([]);
  };

  // 신청 성공 시 폼 리셋
  if (fetcherData?.success && !isSubmitting) {
    setTimeout(() => {
      resetForm();
    }, 100);
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/mypage"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">후기 인증</h1>
            <p className="text-sm text-gray-500">후기 작성하고 혜택 받으세요!</p>
          </div>
        </div>

        {/* 성공/에러 메시지 */}
        {fetcherData?.success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700 font-medium">{fetcherData.message}</p>
            </div>
            <p className="text-green-600 text-sm">검토 후 1~2 영업일 내 결과를 알려드립니다.</p>
          </div>
        )}

        {fetcherData?.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-700">❌ {fetcherData.error}</p>
          </div>
        )}

        {/* 안내 배너 */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-6 h-6" />
            <h2 className="font-bold text-lg">후기 작성 혜택</h2>
          </div>
          <p className="text-white/90 text-sm">
            맘카페, 인스타그램, 블로그에 후기를 작성하고 인증하시면<br />
            다양한 혜택을 드립니다!
          </p>
        </div>

        {/* 후기 유형 선택 */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">후기 유형 선택</h2>
          
          <div className="grid grid-cols-3 gap-3">
            {reviewTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    isSelected 
                      ? `${type.borderColor} ${type.bgColor}` 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    isSelected ? type.color : "bg-gray-100"
                  }`}>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-gray-400"}`} />
                  </div>
                  <p className={`font-medium text-sm ${isSelected ? type.textColor : "text-gray-900"}`}>
                    {type.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택된 유형의 요구사항 */}
        {selectedTypeInfo && (
          <div className={`${selectedTypeInfo.bgColor} rounded-2xl p-5 mb-6 border ${selectedTypeInfo.borderColor}`}>
            <h3 className={`font-semibold ${selectedTypeInfo.textColor} mb-3`}>
              📋 {selectedTypeInfo.name} 후기 조건
            </h3>
            <ul className="space-y-2">
              {selectedTypeInfo.requirements.map((req, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className={`w-4 h-4 ${selectedTypeInfo.textColor}`} />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 신청 폼 */}
        {selectedType && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 후기 URL */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <Label className="text-gray-700 font-medium mb-2 block">
                후기 링크 *
              </Label>
              <Input
                type="url"
                placeholder="https://..."
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                작성한 후기 게시물의 전체 URL을 입력해주세요
              </p>
            </div>

            {/* 제품명 (선택) */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <Label className="text-gray-700 font-medium mb-2 block">
                제품명 (선택)
              </Label>
              <Input
                placeholder="예: ABC 아기침대, 꿀잠 속싸개"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* 스크린샷 첨부 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <Label className="text-gray-700 font-medium mb-2 block">
                스크린샷 첨부 (선택)
              </Label>
              <p className="text-sm text-gray-500 mb-4">
                후기 게시물의 스크린샷을 첨부하시면 더 빠른 검토가 가능합니다.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div className="flex flex-wrap gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img 
                      src={photo.preview} 
                      alt={`스크린샷 ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {photos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                  >
                    <ImagePlus className="w-5 h-5 mb-1" />
                    <span className="text-xs">{photos.length}/3</span>
                  </button>
                )}
              </div>
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || !reviewUrl}
              className="w-full h-14 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-lg"
            >
              {isSubmitting || isUploading ? (
                isUploading ? "업로드 중..." : "신청 중..."
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  후기 인증 신청하기
                </>
              )}
            </Button>
          </form>
        )}

        {/* 신청 이력 */}
        {submissions.length > 0 && (
          <div className="mt-10">
            <h2 className="font-semibold text-gray-900 mb-4">신청 이력</h2>
            <div className="space-y-3">
              {submissions.map((sub: any) => {
                const typeInfo = reviewTypes.find(t => t.id === sub.review_type);
                const status = statusConfig[sub.status as keyof typeof statusConfig];
                const StatusIcon = status?.icon || Clock;
                const TypeIcon = typeInfo?.icon || MessageSquare;
                
                return (
                  <div key={sub.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeInfo?.color || "bg-gray-100"}`}>
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{typeInfo?.name || sub.review_type}</p>
                          {sub.product_name && (
                            <p className="text-sm text-gray-500">{sub.product_name}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${status?.color} px-3 py-1 rounded-full`}>
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {status?.label}
                      </Badge>
                    </div>
                    
                    <a 
                      href={sub.review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      후기 링크 보기
                    </a>

                    {sub.status === "rejected" && sub.rejection_reason && (
                      <div className="mt-2 p-3 bg-red-50 rounded-xl">
                        <p className="text-sm text-red-700">
                          <strong>반려 사유:</strong> {sub.rejection_reason}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      신청일: {new Date(sub.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-10 p-4 bg-gray-100 rounded-2xl">
          <h3 className="font-medium text-gray-700 mb-2">💡 안내사항</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 후기 인증은 1~2 영업일 내 검토됩니다</li>
            <li>• 조건 미충족 시 반려될 수 있습니다</li>
            <li>• 동일한 후기는 중복 신청이 불가합니다</li>
            <li>• 승인 결과는 카카오톡으로 안내드립니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

