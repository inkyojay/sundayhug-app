/**
 * 보증서 등록 페이지 (새로운 디자인)
 */
import type { Route } from "./+types/register";

import {
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Package,
  Camera,
  AlertCircle,
  Upload,
  X,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useNavigate, redirect, data, useLoaderData } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

import makeServerClient from "~/core/lib/supa-client.server";

export const meta: Route.MetaFunction = () => {
  return [
    { title: `보증서 등록 | 썬데이허그` },
    { name: "description", content: "썬데이허그 ABC 이동식 아기침대 디지털 보증서를 등록하세요." },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login?redirect=/customer/warranty");
  }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", user.id)
    .single();
  
  return data({
    user: {
      id: user.id,
      name: profile?.name || user.user_metadata?.name || "",
      phone: profile?.phone || "",
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  
  const formData = await request.formData();
  const step = formData.get("step") as string;

  if (step === "register") {
    const customerName = formData.get("customerName") as string;
    const phone = formData.get("phone") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const photoUrl = formData.get("photoUrl") as string;

    if (!customerName || !phone) {
      return { success: false, error: "이름과 연락처를 입력해주세요." };
    }

    if (!photoUrl) {
      return { success: false, error: "제품 사진을 등록해주세요." };
    }

    const normalizedPhone = phone.replace(/-/g, "");

    const { data: warrantyNumber } = await supabase
      .rpc("generate_warranty_number");

    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase
        .from("customers")
        .update({ name: customerName })
        .eq("id", customerId);
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({ phone: normalizedPhone, name: customerName })
        .select("id")
        .single();
      customerId = newCustomer?.id || null;
    }

    const { data: warranty, error } = await supabase
      .from("warranties")
      .insert({
        warranty_number: warrantyNumber || `SH-W-${Date.now()}`,
        user_id: user.id,  // Supabase Auth user_id 저장
        customer_id: customerId,
        order_id: null,
        buyer_name: customerName,
        customer_phone: normalizedPhone,
        product_name: "ABC 이동식 아기침대",
        order_date: purchaseDate ? new Date(purchaseDate).toISOString().split("T")[0] : null,
        status: "pending",
        product_photo_url: photoUrl,
        photo_uploaded_at: new Date().toISOString(),
      })
      .select("warranty_number")
      .single();

    if (error) {
      console.error("Warranty insert error:", error);
      return { success: false, error: "보증서 등록 중 오류가 발생했습니다." };
    }

    return {
      success: true,
      step: "completed",
      warrantyNumber: warranty?.warranty_number,
    };
  }

  return { success: false, error: "알 수 없는 요청입니다." };
}

// 제품 목록 (향후 DB에서 가져올 수 있음)
const products = [
  { 
    id: "abc-bed", 
    name: "ABC 이동식 아기침대", 
    description: "접이식 아기침대",
    warrantyPeriod: "1년",
  },
];

export default function WarrantyRegister() {
  const { user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"product" | "info" | "photo" | "complete">("product");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: user.name,
    phone: user.phone ? formatPhoneNumber(user.phone) : "",
    purchaseDate: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetcherData = fetcher.data as any;
  
  useEffect(() => {
    if (!fetcherData) return;
    if (fetcherData.success && fetcherData.step === "completed") {
      setStep("complete");
    }
  }, [fetcherData]);

  function formatPhoneNumber(value: string) {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) });
  };

  const goToPhotoStep = () => {
    if (!formData.customerName || !formData.phone) {
      setUploadError("이름과 연락처를 입력해주세요.");
      return;
    }
    setUploadError(null);
    setStep("photo");
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      setUploadError("JPG, PNG, WEBP, HEIC 형식만 지원합니다.");
      return;
    }

    setUploadError(null);
    setPhotoFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) {
      setUploadError("사진을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const timestamp = Date.now();
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `warranty_${timestamp}.${fileExt}`;

      const response = await fetch("/api/warranty/upload-photo", {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("file", photoFile);
          fd.append("fileName", fileName);
          return fd;
        })(),
      });

      if (!response.ok) {
        throw new Error("업로드 실패");
      }

      const { url } = await response.json();
      setUploadedPhotoUrl(url);

      fetcher.submit(
        { 
          step: "register",
          customerName: formData.customerName,
          phone: formData.phone,
          purchaseDate: formData.purchaseDate,
          photoUrl: url,
        },
        { method: "POST" }
      );
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("사진 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadedPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getSelectedProductInfo = () => products.find(p => p.id === selectedProduct);

  const handleBackClick = () => {
    if (step === "photo") setStep("info");
    else if (step === "info") setStep("product");
    else navigate("/customer");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#121212] transition-colors">
      <div className="mx-auto max-w-lg px-6 py-10">
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">
            {step === "product" ? "홈으로" : "이전"}
          </span>
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">보증서 등록</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {selectedProduct ? getSelectedProductInfo()?.name : "등록할 제품을 선택해주세요"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {["제품선택", "정보입력", "사진등록", "완료"].map((label, idx) => {
            const steps = ["product", "info", "photo", "complete"];
            const currentStepIdx = steps.indexOf(step);
            const isActive = idx === currentStepIdx;
            const isCompleted = idx < currentStepIdx;
            
            return (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive ? "bg-[#FF6B35] text-white" :
                  isCompleted ? "bg-[#FF6B35] text-white" :
                  idx === 3 && step === "complete" ? "bg-green-500 text-white" :
                  "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>
                  {idx + 1}
                </div>
                {idx < 3 && (
                  <div className={`w-8 h-1 mx-1 rounded-full transition-colors ${
                    isCompleted ? "bg-[#FF6B35]" : "bg-gray-200 dark:bg-gray-700"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: 제품 선택 */}
        {step === "product" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">제품 선택</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">보증서를 등록할 제품을 선택해주세요</p>
            
            <div className="space-y-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedProduct === product.id 
                      ? "border-[#FF6B35] bg-[#FFF8F5] dark:bg-[#FF6B35]/10" 
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedProduct === product.id 
                        ? "bg-[#FF6B35] text-white" 
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                    }`}>
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        selectedProduct === product.id 
                          ? "text-[#FF6B35]" 
                          : "text-gray-900 dark:text-white"
                      }`}>
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {product.description} · 보증기간 {product.warrantyPeriod}
                      </p>
                    </div>
                    {selectedProduct === product.id && (
                      <CheckCircle className="w-6 h-6 text-[#FF6B35]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <Button 
              className="w-full h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium mt-6"
              onClick={() => setStep("info")}
              disabled={!selectedProduct}
            >
              다음: 정보 입력
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 mt-6">
              <p className="font-medium mb-2">ℹ️ 보증서 등록 안내</p>
              <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                <li>• 썬데이허그 정품 구매자 대상</li>
                <li>• 등록 후 관리자 확인을 거쳐 승인됩니다</li>
                <li>• 승인 시 보증기간 동안 무상 A/S 가능</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: 정보 입력 */}
        {step === "info" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">구매자 정보</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">제품 구매자 정보를 입력해주세요</p>
            
            {/* 선택한 제품 표시 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{getSelectedProductInfo()?.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">보증기간 {getSelectedProductInfo()?.warrantyPeriod}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  이름 *
                </Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="구매자 이름"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="h-12 rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  연락처 *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  className="h-12 rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <p className="text-xs text-gray-400">
                  승인 결과를 카카오톡으로 안내드립니다
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  구매일 (선택)
                </Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  className="h-12 rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              {uploadError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <Button 
                className="w-full h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium"
                onClick={goToPhotoStep}
                disabled={!formData.customerName || !formData.phone}
              >
                다음: 사진 등록
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="p-4 bg-[#FFF8F5] dark:bg-[#FF6B35]/10 rounded-xl text-sm text-[#FF6B35]">
                <p className="font-medium mb-2">📌 등록 안내</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• {getSelectedProductInfo()?.name} 구매자 대상</li>
                  <li>• 보증기간: {getSelectedProductInfo()?.warrantyPeriod}</li>
                  <li>• 등록 후 관리자 확인을 거쳐 승인됩니다</li>
                  <li>• 승인 결과는 카카오톡으로 안내드립니다</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 사진 등록 */}
        {step === "photo" && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 text-lg mb-1">제품 사진</h2>
            <p className="text-gray-500 text-sm mb-6">실제 제품이 보이는 사진을 등록해주세요</p>

            {/* 입력 정보 요약 */}
            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">ABC 이동식 아기침대</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>신청자: {formData.customerName}</div>
                <div>연락처: {formData.phone}</div>
              </div>
            </div>

            {/* 사진 업로드 */}
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!photoPreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-[#FF6B35] hover:bg-[#FFF8F5] transition-colors"
                >
                  <Camera className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-medium text-gray-700">사진 선택</p>
                  <p className="text-sm text-gray-400 mt-1">
                    JPG, PNG, WEBP, HEIC (최대 5MB)
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="제품 사진 미리보기" 
                    className="w-full rounded-2xl object-cover max-h-64"
                  />
                  <button
                    onClick={removePhoto}
                    className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

              {fetcherData?.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {fetcherData.error}
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 mt-6 mb-6">
              <p className="font-medium mb-2">📷 사진 촬영 팁</p>
              <ul className="space-y-1 text-blue-600">
                <li>• 제품 전체가 보이도록 촬영</li>
                <li>• 밝은 곳에서 선명하게 촬영</li>
                <li>• 제품 라벨이 보이면 더 좋습니다</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl border-gray-300 bg-white text-gray-700 hover:bg-gray-50" 
                onClick={() => setStep("info")}
                disabled={isUploading || fetcher.state !== "idle"}
              >
                이전
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                onClick={handlePhotoUpload}
                disabled={!photoFile || isUploading || fetcher.state !== "idle"}
              >
                {isUploading || fetcher.state !== "idle" ? (
                  "등록 중..."
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    보증서 등록
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === "complete" && (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">등록 완료!</h2>
            <p className="text-gray-500 mb-6">
              보증서 등록 신청이 완료되었습니다.<br />
              관리자 확인 후 <strong>카카오톡</strong>으로 결과를 안내드립니다.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <p className="text-sm text-gray-500">접수 번호</p>
              <p className="text-lg font-mono font-bold text-gray-900">{fetcherData?.warrantyNumber}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-700">
                ⏳ 영업일 기준 1-2일 내 처리됩니다
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700">
                ✅ 승인 완료 시 1년간 무상 A/S 가능
              </div>
            </div>

            <Button
              className="h-12 rounded-xl px-8 bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => navigate("/customer")}
            >
              홈으로 돌아가기
            </Button>
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-10 text-center text-sm text-gray-400">
          <a 
            href="https://pf.kakao.com/_crxgDxj/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-[#FAE100] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            카카오톡 상담 문의
          </a>
          <p className="mt-1">sundayhug.com</p>
        </div>
      </div>
    </div>
  );
}
