/**
 * A/S 신청 페이지 (통합)
 * 
 * - ABC 아기침대: 보증서 선택 필요
 * - 다른 제품: 바로 신청 가능
 * - 신청 유형: 수리(repair)로 통일
 * - 사진 첨부 가능 (선택)
 */
import type { Route } from "./+types/as-list";

import { useState, useRef } from "react";
import { Link, redirect, useLoaderData, useFetcher, data } from "react-router";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Package,
  ShieldCheck,
  Send,
  Camera,
  X,
  ImagePlus
} from "lucide-react";

import { Badge } from "~/core/components/ui/badge";
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "A/S 신청 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login");
  }

  // 프로필 정보
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", user.id)
    .single();
  
  // 승인된 보증서 목록 (ABC 아기침대용)
  const { data: warranties } = await supabase
    .from("warranties")
    .select("id, warranty_number, product_name, product_option, status")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // A/S 이력 조회 (user_id로 조회 - 보증서 유무 관계없이)
  const { data: requests } = await supabase
    .from("as_requests")
    .select(`
      *,
      warranties (
        product_name,
        product_option,
        warranty_number
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  const asRequests = requests || [];

  return data({ 
    warranties: warranties || [], 
    asRequests,
    user: {
      name: profile?.name || "",
      phone: profile?.phone || "",
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const formData = await request.formData();
  const productType = formData.get("productType") as string;
  const warrantyId = formData.get("warrantyId") as string;
  const issueDescription = formData.get("issueDescription") as string;
  const contactName = formData.get("contactName") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const otherProductName = formData.get("otherProductName") as string;
  const photoUrls = formData.get("photoUrls") as string;

  if (!issueDescription || !contactName || !contactPhone) {
    return { success: false, error: "필수 정보를 모두 입력해주세요." };
  }

  // ABC 아기침대인 경우 보증서 필수
  if (productType === "abc" && !warrantyId) {
    return { success: false, error: "보증서를 선택해주세요." };
  }

  // 다른 제품인 경우 제품명 필수
  if (productType === "other" && !otherProductName) {
    return { success: false, error: "제품명을 입력해주세요." };
  }

  try {
    // 사진 URL 배열 파싱
    let issuePhotos: string[] = [];
    if (photoUrls) {
      try {
        issuePhotos = JSON.parse(photoUrls);
      } catch (e) {
        // 파싱 실패 시 빈 배열
      }
    }

    const insertData: any = {
      request_type: "repair", // 수리로 통일
      issue_description: productType === "other" 
        ? `[제품: ${otherProductName}]\n\n${issueDescription}`
        : issueDescription,
      contact_name: contactName,
      contact_phone: contactPhone.replace(/-/g, ""),
      status: "received",
      issue_photos: issuePhotos.length > 0 ? issuePhotos : null,
      user_id: user.id, // 항상 user_id 저장
    };

    // ABC 아기침대인 경우 보증서 연결
    if (productType === "abc" && warrantyId) {
      insertData.warranty_id = warrantyId;
    }

    const { error } = await adminClient
      .from("as_requests")
      .insert(insertData);

    if (error) {
      console.error("A/S 신청 오류:", error);
      return { success: false, error: "신청 중 오류가 발생했습니다." };
    }

    return { success: true, message: "A/S 신청이 접수되었습니다." };
  } catch (error: any) {
    return { success: false, error: error.message || "신청 중 오류가 발생했습니다." };
  }
}

const statusConfig = {
  received: { label: "접수됨", color: "bg-blue-100 text-blue-700", icon: Clock },
  processing: { label: "처리 중", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  completed: { label: "완료", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "취소됨", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

const typeLabels: Record<string, string> = {
  repair: "수리",
  exchange: "교환",
  refund: "환불",
  inquiry: "문의",
};

export default function MypageAsListScreen() {
  const { warranties, asRequests, user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation(["customer", "common"]);
  
  const [productType, setProductType] = useState<"abc" | "other" | null>(null);
  const [selectedWarranty, setSelectedWarranty] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    contactName: user.name,
    contactPhone: user.phone ? formatPhone(user.phone) : "",
    otherProductName: "",
    issueDescription: "",
  });

  const fetcherData = fetcher.data as any;
  const isSubmitting = fetcher.state === "submitting";

  function formatPhone(value: string) {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 현재 사진 개수 체크
    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) {
      alert("사진은 최대 3장까지 첨부할 수 있습니다.");
      return;
    }

    // 첫 번째 파일만 처리 (단순화)
    const file = files[0];
    
    // 파일 크기 체크
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    // 파일 형식 체크 (HEIC는 브라우저에서 타입이 다를 수 있음)
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", ""];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      alert("JPG, PNG, WEBP, HEIC 형식만 지원합니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // FileReader로 미리보기 생성
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      setPhotos(prev => [...prev, { file, preview }].slice(0, 3));
    };
    reader.onerror = () => {
      alert("파일을 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsDataURL(file);

    // 입력 초기화
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
        const fileName = `as_${timestamp}_${Math.random().toString(36).slice(2)}.${fileExt}`;

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
      console.error("사진 업로드 오류:", error);
    } finally {
      setIsUploading(false);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 사진 업로드
    const photoUrls = await uploadPhotos();
    
    fetcher.submit(
      {
        productType: productType || "",
        warrantyId: selectedWarranty,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        otherProductName: formData.otherProductName,
        issueDescription: formData.issueDescription,
        photoUrls: JSON.stringify(photoUrls),
      },
      { method: "POST" }
    );
  };

  const resetForm = () => {
    setProductType(null);
    setSelectedWarranty("");
    setPhotos([]);
    setUploadedUrls([]);
    setFormData({
      contactName: user.name,
      contactPhone: user.phone ? formatPhone(user.phone) : "",
      otherProductName: "",
      issueDescription: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/customer/mypage"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("customer:as.title")}</h1>
            <p className="text-sm text-gray-500">{t("customer:as.subtitle")}</p>
          </div>
        </div>

        {/* 성공/에러 메시지 */}
        {fetcherData?.success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-green-700 font-medium">{t("customer:as.success")}</p>
            <p className="text-green-600 text-sm mt-1">{t("customer:as.successDescription")}</p>
            <button
              onClick={resetForm}
              className="mt-3 text-sm text-green-700 underline"
            >
              {t("customer:as.newRequest")}
            </button>
          </div>
        )}

        {fetcherData?.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-700">❌ {fetcherData.error}</p>
          </div>
        )}

        {/* 제품 선택 */}
        {!fetcherData?.success && (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">{t("customer:as.selectProduct")}</h2>

            <div className="grid grid-cols-2 gap-3">
              {/* ABC 아기침대 */}
              <button
                type="button"
                onClick={() => {
                  setProductType("abc");
                  setFormData(prev => ({ ...prev, otherProductName: "" }));
                }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  productType === "abc"
                    ? "border-[#FF6B35] bg-[#FF6B35]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                  productType === "abc" ? "bg-[#FF6B35]/10" : "bg-gray-100"
                }`}>
                  <ShieldCheck className={`w-5 h-5 ${productType === "abc" ? "text-[#FF6B35]" : "text-gray-400"}`} />
                </div>
                <p className={`font-medium ${productType === "abc" ? "text-[#FF6B35]" : "text-gray-900"}`}>
                  {t("customer:as.productType.abc")}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t("customer:as.productType.abcDescription")}</p>
              </button>

              {/* 다른 제품 */}
              <button
                type="button"
                onClick={() => {
                  setProductType("other");
                  setSelectedWarranty("");
                }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  productType === "other"
                    ? "border-[#FF6B35] bg-[#FF6B35]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                  productType === "other" ? "bg-[#FF6B35]/10" : "bg-gray-100"
                }`}>
                  <Package className={`w-5 h-5 ${productType === "other" ? "text-[#FF6B35]" : "text-gray-400"}`} />
                </div>
                <p className={`font-medium ${productType === "other" ? "text-[#FF6B35]" : "text-gray-900"}`}>
                  {t("customer:as.productType.other")}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t("customer:as.productType.otherDescription")}</p>
              </button>
            </div>
          </div>
        )}

        {/* ABC 아기침대 - 보증서 선택 */}
        {productType === "abc" && !fetcherData?.success && (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">{t("customer:as.selectWarranty")}</h2>

            {warranties.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{t("customer:as.noWarranty")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("customer:as.noWarrantyDescription")}</p>
                <Link
                  to="/customer/warranty"
                  className="inline-flex items-center gap-2 mt-4 text-[#FF6B35] font-medium text-sm"
                >
                  {t("customer:as.registerWarranty")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {warranties.map((w: any) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWarranty(w.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedWarranty === w.id
                        ? "border-[#FF6B35] bg-[#FF6B35]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{w.product_name}</p>
                        {w.product_option && (
                          <p className="text-sm text-gray-500">{w.product_option}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 font-mono">{w.warranty_number}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedWarranty === w.id
                          ? "border-[#FF6B35] bg-[#FF6B35]"
                          : "border-gray-300"
                      }`}>
                        {selectedWarranty === w.id && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 신청 폼 */}
        {productType && (productType === "other" || selectedWarranty) && !fetcherData?.success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 다른 제품 - 제품명 입력 */}
            {productType === "other" && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">{t("customer:as.productInfo")}</h2>
                <div className="space-y-2">
                  <Label className="text-gray-700">{t("customer:as.productName")} *</Label>
                  <Input
                    placeholder={t("customer:as.productNamePlaceholder")}
                    value={formData.otherProductName}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherProductName: e.target.value }))}
                    className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
            )}

            {/* 증상 설명 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">{t("customer:as.issueDescription")}</h2>
              <Textarea
                placeholder={t("customer:as.issueDescriptionPlaceholder")}
                value={formData.issueDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                className="min-h-[140px] rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            {/* 사진 첨부 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-2">{t("customer:as.photoAttachment")}</h2>
              <p className="text-sm text-gray-500 mb-4">{t("customer:as.photoAttachmentDescription")}</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div className="flex flex-wrap gap-3">
                {/* 업로드된 사진들 */}
                {photos.map((photo, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img 
                      src={photo.preview} 
                      alt={`첨부 사진 ${index + 1}`}
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

                {/* 사진 추가 버튼 */}
                {photos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                  >
                    <ImagePlus className="w-6 h-6 mb-1" />
                    <span className="text-xs">{photos.length}/3</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                {t("customer:as.photoFormat")}
              </p>
            </div>

            {/* 연락처 정보 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">{t("customer:as.contactInfo")}</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">{t("customer:as.contactName")} *</Label>
                  <Input
                    placeholder={t("common:form.placeholder.name")}
                    value={formData.contactName}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                    className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">{t("customer:as.contactPhone")} *</Label>
                  <Input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: formatPhone(e.target.value) }))}
                    maxLength={13}
                    className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="w-full h-14 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-lg"
            >
              {isSubmitting || isUploading ? (
                isUploading ? t("common:status.uploading") : t("common:status.processing")
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {t("customer:as.submitButton")}
                </>
              )}
            </Button>
          </form>
        )}

        {/* A/S 이력 */}
        {asRequests.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 mb-4"
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-900">{t("customer:as.history")}</span>
                <Badge variant="outline" className="rounded-full">{asRequests.length}</Badge>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>

            {showHistory && (
              <div className="space-y-3">
                {asRequests.map((req: any) => {
                  const status = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.received;
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={`${status.color} px-3 py-1 rounded-full font-medium`}>
                          <StatusIcon className="w-3.5 h-3.5 mr-1" />
                          {t(`customer:as.status.${req.status}`)}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {req.warranties?.product_name || t("customer:as.otherProduct")}
                        </h3>
                        {req.warranties?.product_option && (
                          <p className="text-sm text-gray-500">{req.warranties.product_option}</p>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {req.issue_description}
                      </p>

                      {/* 첨부 사진 */}
                      {req.issue_photos && req.issue_photos.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {req.issue_photos.map((url: string, idx: number) => (
                            <img 
                              key={idx}
                              src={url} 
                              alt={`첨부 사진 ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          {t("customer:as.requestDate")}: {new Date(req.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>

                      {req.resolution && (
                        <div className="mt-3 p-4 bg-green-50 rounded-xl">
                          <p className="font-medium text-green-800 text-sm mb-1">{t("customer:as.resolution")}</p>
                          <p className="text-green-700 text-sm">{req.resolution}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <a
            href="https://pf.kakao.com/_crxgDxj/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-[#FAE100] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            {t("customer:as.kakaoInquiry")}
          </a>
        </div>
      </div>
    </div>
  );
}
