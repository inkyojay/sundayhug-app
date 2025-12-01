/**
 * 보증서 등록 페이지 (고객용 - 로그인 필수)
 * 
 * 대상: ABC 이동식 아기침대
 * 흐름: 정보입력 → 사진등록 → 완료 (주문 검증 없음)
 * 승인: 관리자가 확인 후 카카오톡 알림톡으로 결과 전달
 * 
 * 전제조건: 회원가입 완료 (전화번호 인증 또는 소셜 로그인)
 */
import type { Route } from "./+types/register";

import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PackageIcon,
  CameraIcon,
  AlertCircleIcon,
  UploadIcon,
  XIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useNavigate } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
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
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  
  const step = formData.get("step") as string;

  if (step === "register") {
    // 보증서 등록 (로그인된 회원만)
    const memberId = formData.get("memberId") as string;
    const customerName = formData.get("customerName") as string;
    const phone = formData.get("phone") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const photoUrl = formData.get("photoUrl") as string;

    if (!memberId) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    if (!customerName || !phone) {
      return { success: false, error: "이름과 연락처를 입력해주세요." };
    }

    if (!photoUrl) {
      return { success: false, error: "제품 사진을 등록해주세요." };
    }

    // 전화번호 정규화
    const normalizedPhone = phone.replace(/-/g, "");

    // 보증서 번호 생성
    const { data: warrantyNumber } = await supabase
      .rpc("generate_warranty_number");

    // 고객 생성 또는 조회 (customer_id 호환성 유지)
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

    // 보증서 생성 (status: pending - 관리자 승인 대기)
    const { data: warranty, error } = await supabase
      .from("warranties")
      .insert({
        warranty_number: warrantyNumber || `SH-W-${Date.now()}`,
        member_id: memberId, // 로그인된 회원 ID
        customer_id: customerId, // 호환성 유지
        order_id: null, // 주문 연결 없음
        buyer_name: customerName, // 구매자명 (주문 매핑용)
        customer_phone: normalizedPhone,
        product_name: "ABC 이동식 아기침대",
        order_date: purchaseDate ? new Date(purchaseDate).toISOString().split("T")[0] : null,
        status: "pending", // 승인 대기 상태
        product_photo_url: photoUrl,
        photo_uploaded_at: new Date().toISOString(),
        // warranty_start, warranty_end는 관리자 승인 시 설정
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

export default function WarrantyRegister({ loaderData, actionData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<{ name: string; phone: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [step, setStep] = useState<"info" | "photo" | "complete">("info");
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    purchaseDate: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 로그인 체크 및 회원 정보 로드
  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    const customerName = localStorage.getItem("customerName");
    
    if (!customerId) {
      // 로그인 안 됨 → 로그인 페이지로
      navigate("/customer/login?redirect=/customer/warranty");
      return;
    }
    
    setIsLoggedIn(true);
    setMemberId(customerId);
    
    // 회원 정보 가져오기
    fetch(`/api/customer/member?id=${customerId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.member) {
          setMemberInfo({ name: data.member.name, phone: data.member.phone });
          setFormData(prev => ({
            ...prev,
            customerName: data.member.name || customerName || "",
            phone: data.member.phone ? formatPhoneNumber(data.member.phone) : "",
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            customerName: customerName || "",
          }));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setFormData(prev => ({
          ...prev,
          customerName: customerName || "",
        }));
        setIsLoading(false);
      });
  }, [navigate]);

  // fetcher 결과 처리
  const fetcherData = fetcher.data as any;
  
  useEffect(() => {
    if (!fetcherData) return;
    
    // 등록 성공 시 완료 화면
    if (fetcherData.success && fetcherData.step === "completed") {
      setStep("complete");
    }
  }, [fetcherData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
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

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 파일 타입 체크
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      setUploadError("JPG, PNG, WEBP, HEIC 형식만 지원합니다.");
      return;
    }

    setUploadError(null);
    setPhotoFile(file);
    
    // 미리보기 생성
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
      // Supabase Storage에 업로드
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

      // 보증서 등록 진행
      fetcher.submit(
        { 
          step: "register",
          memberId: memberId || "",
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

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 안 됨 (리다이렉트 전 깜빡임 방지)
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* 뒤로가기 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/customer")}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          돌아가기
        </Button>

        {/* 로고/헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">썬데이허그</h1>
          <p className="text-muted-foreground">ABC 이동식 아기침대 보증서</p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["정보입력", "사진등록", "완료"].map((label, idx) => (
            <div key={label} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                idx === 0 && step === "info" ? "bg-amber-500 text-white" :
                idx === 1 && step === "photo" ? "bg-amber-500 text-white" :
                idx === 2 && step === "complete" ? "bg-green-500 text-white" :
                idx < ["info", "photo", "complete"].indexOf(step) ? "bg-amber-500 text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {idx + 1}
              </div>
              {idx < 2 && (
                <div className={`w-12 h-0.5 mx-1 ${
                  idx < ["info", "photo", "complete"].indexOf(step) 
                    ? "bg-amber-500" 
                    : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: 정보 입력 */}
        {step === "info" && (
          <Card>
            <CardHeader>
              <CardTitle>보증서 정보 입력</CardTitle>
              <CardDescription>
                제품 구매자 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">이름 *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="구매자 이름"
                  value={formData.customerName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처 *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                />
                <p className="text-xs text-muted-foreground">
                  승인 결과를 카카오톡으로 안내드립니다
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">구매일 (선택)</Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
                  <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={goToPhotoStep}
                disabled={!formData.customerName || !formData.phone}
              >
                다음: 사진 등록
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">📌 등록 안내</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>ABC 이동식 아기침대 구매자 대상</li>
                  <li>등록 후 관리자 확인을 거쳐 승인됩니다</li>
                  <li>승인 결과는 카카오톡으로 안내드립니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 사진 등록 */}
        {step === "photo" && (
          <Card>
            <CardHeader>
              <CardTitle>제품 사진 등록</CardTitle>
              <CardDescription>
                실제 제품이 보이는 사진을 등록해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 입력 정보 요약 */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <PackageIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">ABC 이동식 아기침대</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">신청자: </span>
                    {formData.customerName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">연락처: </span>
                    {formData.phone}
                  </div>
                </div>
              </div>

              {/* 사진 업로드 */}
              <div className="space-y-3">
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
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
                  >
                    <CameraIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">사진 선택</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG, WEBP, HEIC (최대 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="제품 사진 미리보기" 
                      className="w-full rounded-lg object-cover max-h-64"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
                    <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}

                {fetcherData?.error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
                    <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {fetcherData.error}
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">📷 사진 촬영 팁</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>제품 전체가 보이도록 촬영</li>
                  <li>밝은 곳에서 선명하게 촬영</li>
                  <li>제품 라벨이 보이면 더 좋습니다</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setStep("info")}
                  disabled={isUploading || fetcher.state !== "idle"}
                >
                  이전
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handlePhotoUpload}
                  disabled={!photoFile || isUploading || fetcher.state !== "idle"}
                >
                  {isUploading || fetcher.state !== "idle" ? (
                    <>등록 중...</>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4 mr-2" />
                      보증서 등록
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: 완료 */}
        {step === "complete" && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">등록 완료!</h2>
              <p className="text-muted-foreground mb-6">
                보증서 등록 신청이 완료되었습니다.<br />
                관리자 확인 후 <strong>카카오톡</strong>으로 결과를 안내드립니다.
              </p>

              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground">접수 번호</p>
                <p className="text-lg font-mono font-bold">{fetcherData?.warrantyNumber}</p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-800 dark:text-amber-200 mb-4">
                <p>⏳ 영업일 기준 1-2일 내 처리됩니다</p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-800 dark:text-green-200">
                <p>✅ 승인 완료 시 1년간 무상 A/S 가능</p>
              </div>

              <Button
                variant="outline"
                className="mt-6"
                onClick={() => navigate("/customer")}
              >
                홈으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>문의: 070-7703-8005</p>
          <p className="mt-1">
            <a href="https://sundayhug.com" className="hover:underline">
              sundayhug.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
