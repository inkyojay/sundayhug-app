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
import { useTranslation } from "react-i18next";
import { useFetcher, useNavigate, redirect, data, useLoaderData } from "react-router";
import { formatPhoneNumber } from "~/core/lib/formatters";

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

export default function WarrantyRegister() {
  const { t } = useTranslation(["warranty", "common"]);
  const { user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 제품 목록 (향후 DB에서 가져올 수 있음)
  const products = [
    {
      id: "abc-bed",
      name: "ABC 이동식 아기침대",
      description: "접이식 아기침대",
      warrantyPeriod: "1년",
    },
  ];

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

  const fetcherData = fetcher.data as { success: boolean; error?: string; step?: string; warrantyNumber?: string } | undefined;
  
  useEffect(() => {
    if (!fetcherData) return;
    if (fetcherData.success && fetcherData.step === "completed") {
      setStep("complete");
    }
  }, [fetcherData]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) });
  };

  const goToPhotoStep = () => {
    if (!formData.customerName || !formData.phone) {
      setUploadError(t("warranty:public.register.errors.namePhoneRequired"));
      return;
    }
    setUploadError(null);
    setStep("photo");
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t("warranty:public.register.errors.fileTooLarge"));
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      setUploadError(t("warranty:public.register.errors.unsupportedFormat"));
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
      setUploadError(t("warranty:public.register.errors.selectPhoto"));
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

      const result = await response.json();

      if (!response.ok || result.error) {
        // API에서 반환한 구체적인 에러 메시지 표시
        setUploadError(result.error || t("warranty:public.register.errors.uploadFailed"));
        return;
      }

      setUploadedPhotoUrl(result.url);

      fetcher.submit(
        { 
          step: "register",
          customerName: formData.customerName,
          phone: formData.phone,
          purchaseDate: formData.purchaseDate,
          photoUrl: result.url,
        },
        { method: "POST" }
      );
    } catch (error) {
      console.error("Upload error:", error);
      // 네트워크 오류 등 fetch 자체 실패
      if (error instanceof TypeError && error.message.includes("network")) {
        setUploadError(t("warranty:public.register.errors.networkError"));
      } else {
        setUploadError(t("warranty:public.register.errors.uploadFailed"));
      }
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
            {step === "product" ? t("warranty:public.register.navigation.home") : t("warranty:public.register.navigation.previous")}
          </span>
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("warranty:public.register.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {selectedProduct ? getSelectedProductInfo()?.name : t("warranty:public.register.header")}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[t("warranty:public.register.steps.productSelect"), t("warranty:public.register.steps.infoInput"), t("warranty:public.register.steps.photoUpload"), t("warranty:public.register.steps.complete")].map((label, idx) => {
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
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{t("warranty:public.register.productSelection.title")}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t("warranty:public.register.productSelection.description")}</p>

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
                        {product.description} · {t("warranty:public.register.productSelection.warrantyPeriod", { period: product.warrantyPeriod })}
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
              {t("warranty:public.register.productSelection.next")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 mt-6">
              <p className="font-medium mb-2">{t("warranty:public.register.productSelection.notice.title")}</p>
              <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                <li>• {t("warranty:public.register.productSelection.notice.item1")}</li>
                <li>• {t("warranty:public.register.productSelection.notice.item2")}</li>
                <li>• {t("warranty:public.register.productSelection.notice.item3")}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: 정보 입력 */}
        {step === "info" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{t("warranty:public.register.buyerInfo.title")}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t("warranty:public.register.buyerInfo.description")}</p>

            {/* 선택한 제품 표시 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{getSelectedProductInfo()?.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("warranty:public.register.productSelection.warrantyPeriod", { period: getSelectedProductInfo()?.warrantyPeriod })}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("warranty:public.register.buyerInfo.name")} *
                </Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder={t("warranty:public.register.buyerInfo.namePlaceholder")}
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="h-12 rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("warranty:public.register.buyerInfo.phone")} *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={t("warranty:public.register.buyerInfo.phonePlaceholder")}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  className="h-12 rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <p className="text-xs text-gray-400">
                  {t("warranty:public.register.buyerInfo.phoneHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("warranty:public.register.buyerInfo.purchaseDate")}
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
                {t("warranty:public.register.buyerInfo.next")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="p-4 bg-[#FFF8F5] dark:bg-[#FF6B35]/10 rounded-xl text-sm text-[#FF6B35]">
                <p className="font-medium mb-2">{t("warranty:public.register.buyerInfo.notice.title")}</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• {t("warranty:public.register.buyerInfo.notice.item1", { productName: getSelectedProductInfo()?.name })}</li>
                  <li>• {t("warranty:public.register.buyerInfo.notice.item2", { period: getSelectedProductInfo()?.warrantyPeriod })}</li>
                  <li>• {t("warranty:public.register.buyerInfo.notice.item3")}</li>
                  <li>• {t("warranty:public.register.buyerInfo.notice.item4")}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 사진 등록 */}
        {step === "photo" && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 text-lg mb-1">{t("warranty:public.register.photoUpload.title")}</h2>
            <p className="text-gray-500 text-sm mb-6">{t("warranty:public.register.photoUpload.description")}</p>

            {/* 입력 정보 요약 */}
            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">ABC 이동식 아기침대</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>{t("warranty:public.register.photoUpload.applicant")}: {formData.customerName}</div>
                <div>{t("warranty:public.register.photoUpload.phone")}: {formData.phone}</div>
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
                  <p className="font-medium text-gray-700">{t("warranty:public.register.photoUpload.selectPhoto")}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {t("warranty:public.register.photoUpload.fileFormats")}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt={t("warranty:public.register.photoUpload.title")}
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
              <p className="font-medium mb-2">{t("warranty:public.register.photoUpload.tips.title")}</p>
              <ul className="space-y-1 text-blue-600">
                <li>• {t("warranty:public.register.photoUpload.tips.tip1")}</li>
                <li>• {t("warranty:public.register.photoUpload.tips.tip2")}</li>
                <li>• {t("warranty:public.register.photoUpload.tips.tip3")}</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => setStep("info")}
                disabled={isUploading || fetcher.state !== "idle"}
              >
                {t("warranty:public.register.photoUpload.previous")}
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                onClick={handlePhotoUpload}
                disabled={!photoFile || isUploading || fetcher.state !== "idle"}
              >
                {isUploading || fetcher.state !== "idle" ? (
                  t("warranty:public.register.photoUpload.uploading")
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("warranty:public.register.photoUpload.submit")}
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("warranty:public.register.complete.title")}</h2>
            <p className="text-gray-500 mb-6">
              {t("warranty:public.register.complete.description")}<br />
              <span dangerouslySetInnerHTML={{ __html: t("warranty:public.register.complete.notificationInfo") }} />
            </p>

            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <p className="text-sm text-gray-500">{t("warranty:public.register.complete.receiptNumber")}</p>
              <p className="text-lg font-mono font-bold text-gray-900">{fetcherData?.warrantyNumber}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-700">
                {t("warranty:public.register.complete.processingTime")}
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700">
                {t("warranty:public.register.complete.approvalBenefit")}
              </div>
            </div>

            <Button
              className="h-12 rounded-xl px-8 bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => navigate("/customer")}
            >
              {t("warranty:public.register.complete.backToHome")}
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
