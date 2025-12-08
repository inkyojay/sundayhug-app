/**
 * 일반 후기 인증 페이지 (포인트 적립용)
 * - 이벤트 없이 단순 후기 인증
 * - 승인 시 포인트 적립
 */
import type { Route } from "./+types/review-submit";

import { useState, useRef } from "react";
import { Link, redirect, useLoaderData, useFetcher, data } from "react-router";
import { 
  ArrowLeft, 
  X,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Instagram,
  FileText,
  Gift,
  ImagePlus,
  ExternalLink,
  Coins
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

  // 프로필 정보 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, points")
    .eq("id", user.id)
    .single();

  // 제품 목록 조회 (자동완성용)
  const { data: products } = await supabase
    .from("parent_products")
    .select("parent_sku, product_name")
    .eq("is_active", true)
    .order("product_name");

  // 후기 인증 이력 조회
  const { data: submissions } = await supabase
    .from("review_submissions")
    .select("*")
    .eq("user_id", user.id)
    .is("event_id", null) // 이벤트 없는 일반 후기만
    .order("created_at", { ascending: false });

  const productList = (products || [])
    .filter((p: any) => p.product_name && p.product_name.trim() !== "")
    .map((p: any) => p.product_name);

  return data({ 
    submissions: submissions || [],
    profile: profile || null,
    productList,
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
  const buyerName = formData.get("buyerName") as string;
  const buyerPhone = formData.get("buyerPhone") as string;
  const purchaseChannel = formData.get("purchaseChannel") as string;

  if (!reviewType || !reviewUrl) {
    return { success: false, error: "필수 정보를 입력해주세요." };
  }

  if (!buyerName || !buyerPhone) {
    return { success: false, error: "구매자명과 연락처는 필수입니다." };
  }

  // URL 유효성 검사
  try {
    new URL(reviewUrl);
  } catch {
    return { success: false, error: "올바른 URL을 입력해주세요." };
  }

  // 중복 신청 체크
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
    try { screenshots = JSON.parse(screenshotUrls); } catch {}
  }

  const { error } = await supabase
    .from("review_submissions")
    .insert({
      user_id: user.id,
      review_type: reviewType,
      review_url: reviewUrl,
      product_name: productName || null,
      screenshot_urls: screenshots.length > 0 ? screenshots : null,
      buyer_name: buyerName,
      buyer_phone: buyerPhone.replace(/-/g, ""),
      purchase_channel: purchaseChannel || null,
      // 이벤트 관련 필드는 NULL
      event_id: null,
      event_product_id: null,
      selected_gift_id: null,
    });

  if (error) {
    console.error("후기 인증 신청 오류:", error);
    return { success: false, error: "신청 중 오류가 발생했습니다." };
  }

  return { success: true, message: "후기 인증 신청이 완료되었습니다!" };
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
    description: "맘스홀릭, 맘이베베 등",
    points: 500,
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
    points: 300,
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
    points: 500,
  },
];

const statusConfig = {
  pending: { label: "검토 중", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved: { label: "승인됨", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "반려됨", color: "bg-red-100 text-red-700", icon: XCircle },
};

const purchaseChannels = [
  "쿠팡", "네이버 스마트스토어", "자사몰 (sundayhug.kr)",
  "11번가", "G마켓/옥션", "위메프", "티몬", "카카오선물하기", "기타",
];

export default function ReviewSubmitScreen() {
  const { submissions, profile, productList } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [buyerName, setBuyerName] = useState(profile?.name || "");
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone || "");
  const [purchaseChannel, setPurchaseChannel] = useState("");

  const fetcherData = fetcher.data as any;
  const isSubmitting = fetcher.state === "submitting";
  const [showComplete, setShowComplete] = useState(false);

  const selectedTypeInfo = reviewTypes.find(t => t.id === selectedType);

  // 성공 시 완료 화면 표시
  if (fetcherData?.success && !showComplete) {
    setShowComplete(true);
  }

  const filteredProducts = productSearch.length > 0
    ? productList.filter((p: string) => p.toLowerCase().includes(productSearch.toLowerCase()))
    : productList;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 3) {
      alert("스크린샷은 최대 3장까지 첨부할 수 있습니다.");
      return;
    }

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotos(prev => [...prev, { file, preview: reader.result as string }].slice(0, 3));
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];
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
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !reviewUrl) {
      alert("후기 유형과 URL을 입력해주세요.");
      return;
    }

    if (!buyerName || !buyerPhone) {
      alert("구매자명과 연락처는 필수입니다.");
      return;
    }

    setIsUploading(true);
    
    try {
      const screenshotUrls = await uploadPhotos();
      
      fetcher.submit(
        {
          reviewType: selectedType,
          reviewUrl,
          productName,
          screenshotUrls: JSON.stringify(screenshotUrls),
          buyerName,
          buyerPhone,
          purchaseChannel,
        },
        { method: "POST" }
      );
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setReviewUrl("");
    setProductName("");
    setProductSearch("");
    setPhotos([]);
  };

  const handleNewSubmit = () => {
    setShowComplete(false);
    resetForm();
  };

  // 완료 화면
  if (showComplete) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {/* 성공 아이콘 */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            
            {/* 완료 메시지 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              후기 인증 신청 완료!
            </h1>
            <p className="text-gray-500 text-center mb-8">
              검토 후 1~2 영업일 내 포인트가 적립됩니다.
            </p>
            
            {/* 적립 예정 포인트 */}
            {selectedTypeInfo && (
              <div className="bg-white rounded-2xl p-6 mb-8 w-full max-w-sm border border-gray-100">
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-1">적립 예정 포인트</p>
                  <p className="text-3xl font-bold text-orange-500">+{selectedTypeInfo.points}P</p>
                </div>
              </div>
            )}
            
            {/* 버튼들 */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <Button
                onClick={handleNewSubmit}
                className="h-14 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium"
              >
                추가로 인증하기
              </Button>
              <Link to="/customer/mypage">
                <Button
                  variant="outline"
                  className="w-full h-14 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  마이페이지로 돌아가기
                </Button>
              </Link>
            </div>
            
            {/* 안내 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-2xl w-full max-w-sm">
              <p className="text-sm text-blue-700 text-center">
                💡 신청 내역은 마이페이지에서 확인하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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
            <p className="text-sm text-gray-500">
              {profile?.points !== undefined && (
                <span className="text-orange-600 font-medium">보유 포인트: {profile.points?.toLocaleString()}P</span>
              )}
            </p>
          </div>
        </div>

        {fetcherData?.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-700">❌ {fetcherData.error}</p>
          </div>
        )}

        {/* 이벤트 참여 안내 */}
        <Link 
          to="/customer/event/review"
          className="block bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 mb-6 text-white hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5" />
                <span className="font-bold">🎁 후기 이벤트 진행 중!</span>
              </div>
              <p className="text-white/90 text-sm">
                사은품 받고 싶으시면 이벤트에 참여해주세요
              </p>
            </div>
            <span className="text-white/80">→</span>
          </div>
        </Link>

        {/* 포인트 안내 */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">후기 작성 포인트</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            후기 유형에 따라 승인 시 포인트가 적립됩니다.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {reviewTypes.map((type) => (
              <div key={type.id} className={`p-3 rounded-xl text-center ${type.bgColor}`}>
                <p className={`font-semibold ${type.textColor}`}>{type.name}</p>
                <p className={`text-lg font-bold ${type.textColor}`}>+{type.points}P</p>
              </div>
            ))}
          </div>
        </div>

        {/* 후기 유형 선택 */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">후기 유형 선택 *</h2>
          
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
                  <p className={`text-xs mt-1 ${isSelected ? type.textColor : "text-gray-500"}`}>
                    +{type.points}P
                  </p>
                </button>
              );
            })}
          </div>
        </div>

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

            {/* 제품명 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <Label className="text-gray-700 font-medium mb-2 block">
                제품명
              </Label>
              <div className="relative">
                <Input
                  placeholder="제품명을 검색하세요 (선택)"
                  value={productSearch || productName}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductName(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                />
                
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((product: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setProductName(product);
                          setProductSearch(product);
                          setShowProductDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left text-gray-900 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        {product}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 구매자 정보 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">구매자 정보 *</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 text-sm mb-1.5 block">구매자명</Label>
                  <Input
                    placeholder="주문 시 입력한 이름"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-700 text-sm mb-1.5 block">연락처</Label>
                  <Input
                    type="tel"
                    placeholder="010-0000-0000"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-700 text-sm mb-1.5 block">구매처 (선택)</Label>
                  <select
                    value={purchaseChannel}
                    onChange={(e) => setPurchaseChannel(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900"
                  >
                    <option value="">구매처를 선택하세요</option>
                    {purchaseChannels.map((channel) => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 스크린샷 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <Label className="text-gray-700 font-medium mb-2 block">
                스크린샷 (선택)
              </Label>
              <p className="text-sm text-gray-500 mb-4">
                후기 스크린샷을 첨부하면 더 빠른 검토가 가능합니다.
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
                      <div className="text-right">
                        <Badge className={`${status?.color} px-3 py-1 rounded-full`}>
                          <StatusIcon className="w-3.5 h-3.5 mr-1" />
                          {status?.label}
                        </Badge>
                        {sub.status === "approved" && sub.points_awarded > 0 && (
                          <p className="text-xs text-green-600 font-medium mt-1">+{sub.points_awarded}P</p>
                        )}
                      </div>
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
            <li>• 승인 시 포인트가 자동 적립됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
