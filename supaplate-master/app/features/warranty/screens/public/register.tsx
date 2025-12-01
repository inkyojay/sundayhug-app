/**
 * 보증서 등록 페이지 (고객용 - Public)
 * 
 * 대상: ABC 이동식 아기침대 (SKU: SH_X_PNPC%)
 * 조건: 구매 후 30일 이내 등록 필수
 * 인증: 수령자 이름 + 전화번호 + 제품 사진
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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";

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

// 대상 제품 SKU 패턴 (ABC 이동식 아기침대)
const TARGET_SKU_PATTERN = "SH_X_PNPC%";

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

  if (step === "verify") {
    // 1단계: 수령자 이름 + 연락처 검증
    const customerName = formData.get("customerName") as string;
    const phoneRaw = formData.get("phone") as string;

    if (!customerName || !phoneRaw) {
      return { success: false, error: "수령자 이름과 연락처를 입력해주세요." };
    }

    // 전화번호 정규화 (하이픈 제거 및 하이픈 포함 버전 둘 다 검색)
    const phoneClean = phoneRaw.replace(/-/g, "");
    const phoneWithDash = phoneClean.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");

    // 30일 전 날짜 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // orders + order_items 조인하여 검색
    // 조건: 이름 매칭 + 전화번호 매칭 + ABC 아기침대 SKU + 30일 이내
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, 
        uniq,
        shop_sale_name, 
        shop_opt_name, 
        ord_time, 
        shop_name, 
        invoice_no, 
        to_name, 
        to_tel, 
        to_htel,
        order_items!inner (
          id,
          sku_cd,
          product_name,
          shop_opt_name
        )
      `)
      .eq("to_name", customerName)
      .or(`to_tel.eq.${phoneClean},to_htel.eq.${phoneClean},to_tel.eq.${phoneWithDash},to_htel.eq.${phoneWithDash}`)
      .like("order_items.sku_cd", "SH_X_PNPC%")
      .gte("ord_time", thirtyDaysAgo.toISOString())
      .order("ord_time", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Order search error:", error);
      return { 
        success: false, 
        error: "주문 조회 중 오류가 발생했습니다." 
      };
    }

    if (!orders || orders.length === 0) {
      return { 
        success: false, 
        error: "보증서 등록 가능한 주문을 찾을 수 없습니다.\n\n확인 사항:\n• ABC 이동식 아기침대 구매 여부\n• 수령자 이름과 연락처 일치 여부\n• 구매 후 30일 이내 여부" 
      };
    }

    const order = orders[0];
    const orderItem = (order.order_items as any[])?.[0];

    // 이미 등록된 보증서가 있는지 확인 (같은 주문번호로)
    const { data: existingWarranty } = await supabase
      .from("warranties")
      .select("id, warranty_number")
      .eq("order_id", order.id)
      .single();

    if (existingWarranty) {
      return { 
        success: false, 
        error: `이미 등록된 보증서가 있습니다.\n보증서 번호: ${existingWarranty.warranty_number}` 
      };
    }

    return {
      success: true,
      step: "verified",
      order: {
        id: order.id,
        uniq: order.uniq,
        productName: orderItem?.product_name || order.shop_sale_name,
        productOption: orderItem?.shop_opt_name || order.shop_opt_name,
        sku: orderItem?.sku_cd,
        orderDate: order.ord_time,
        salesChannel: order.shop_name,
        trackingNumber: order.invoice_no,
        customerName: order.to_name,
      },
    };
  }

  if (step === "register") {
    // 2단계: 보증서 등록 (사진 포함)
    const customerName = formData.get("customerName") as string;
    const phone = formData.get("phone") as string;
    const orderId = formData.get("orderId") as string;
    const orderUniq = formData.get("orderUniq") as string;
    const productName = formData.get("productName") as string;
    const productOption = formData.get("productOption") as string;
    const productSku = formData.get("productSku") as string;
    const orderDate = formData.get("orderDate") as string;
    const salesChannel = formData.get("salesChannel") as string;
    const trackingNumber = formData.get("trackingNumber") as string;
    const photoUrl = formData.get("photoUrl") as string;

    if (!photoUrl) {
      return { success: false, error: "제품 사진을 등록해주세요." };
    }

    // 보증서 번호 생성
    const { data: warrantyNumber } = await supabase
      .rpc("generate_warranty_number");

    // 고객 생성 또는 조회
    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // 이름 업데이트
      await supabase
        .from("customers")
        .update({ name: customerName })
        .eq("id", customerId);
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({ phone, name: customerName })
        .select("id")
        .single();
      customerId = newCustomer?.id || null;
    }

    // 보증서 생성
    const today = new Date();
    const warrantyEnd = new Date(today);
    warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

    const { data: warranty, error } = await supabase
      .from("warranties")
      .insert({
        warranty_number: warrantyNumber || `SH-W-${Date.now()}`,
        customer_id: customerId,
        order_id: orderId || null,
        tracking_number: trackingNumber,
        customer_phone: phone,
        product_name: productName,
        product_option: productOption,
        product_sku: productSku,
        order_date: orderDate ? new Date(orderDate).toISOString().split("T")[0] : null,
        sales_channel: salesChannel,
        warranty_start: today.toISOString().split("T")[0],
        warranty_end: warrantyEnd.toISOString().split("T")[0],
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

export default function WarrantyRegister({ loaderData, actionData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"input" | "confirm" | "photo" | "complete">("input");
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
  });
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // fetcher 결과 처리
  const fetcherData = fetcher.data as any;
  
  // useEffect로 상태 변경 처리
  useEffect(() => {
    if (!fetcherData) return;
    
    // 검증 성공 시 다음 단계로 (사진 업로드)
    if (fetcherData.success && fetcherData.step === "verified" && step === "input") {
      setOrderInfo(fetcherData.order);
      setStep("photo");
    }

    // 등록 성공 시 완료 화면
    if (fetcherData.success && fetcherData.step === "completed" && step === "photo") {
      setStep("complete");
    }
  }, [fetcherData, step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVerify = () => {
    fetcher.submit(
      { step: "verify", ...formData },
      { method: "POST" }
    );
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
      const fileName = `warranty_${orderInfo?.id || timestamp}_${timestamp}.${fileExt}`;

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
          customerName: formData.customerName,
          phone: formData.phone,
          orderId: orderInfo?.id || "",
          orderUniq: orderInfo?.uniq || "",
          productName: orderInfo?.productName || "",
          productOption: orderInfo?.productOption || "",
          productSku: orderInfo?.sku || "",
          orderDate: orderInfo?.orderDate || "",
          salesChannel: orderInfo?.salesChannel || "",
          trackingNumber: orderInfo?.trackingNumber || "",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container max-w-lg mx-auto px-4 py-12">
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
                idx === 0 && step === "input" ? "bg-amber-500 text-white" :
                idx === 1 && step === "photo" ? "bg-amber-500 text-white" :
                idx === 2 && step === "complete" ? "bg-green-500 text-white" :
                idx < ["input", "photo", "complete"].indexOf(step) ? "bg-amber-500 text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {idx + 1}
              </div>
              {idx < 2 && (
                <div className={`w-12 h-0.5 mx-1 ${
                  idx < ["input", "photo", "complete"].indexOf(step) 
                    ? "bg-amber-500" 
                    : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: 정보 입력 */}
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle>구매 정보 입력</CardTitle>
              <CardDescription>
                주문 시 입력한 수령자 정보를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">수령자 이름</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="배송받으신 분 이름"
                  value={formData.customerName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="'-' 없이 숫자만 입력"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              {fetcherData?.error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
                  <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="whitespace-pre-line">{fetcherData.error}</span>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handleVerify}
                disabled={!formData.customerName || !formData.phone || fetcher.state !== "idle"}
              >
                {fetcher.state !== "idle" ? "확인 중..." : "다음"}
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">📌 등록 안내</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>ABC 이동식 아기침대 구매자만 등록 가능</li>
                  <li>구매 후 30일 이내 등록 필수</li>
                  <li>실제 제품 사진 등록 필수</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 사진 등록 */}
        {step === "photo" && orderInfo && (
          <Card>
            <CardHeader>
              <CardTitle>제품 사진 등록</CardTitle>
              <CardDescription>
                실제 제품이 보이는 사진을 등록해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 주문 정보 요약 */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <PackageIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{orderInfo.productName}</p>
                    {orderInfo.productOption && (
                      <p className="text-sm text-muted-foreground">{orderInfo.productOption}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">주문일: </span>
                    {orderInfo.orderDate ? new Date(orderInfo.orderDate).toLocaleDateString("ko-KR") : "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">수령인: </span>
                    {orderInfo.customerName}
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
                  onClick={() => setStep("input")}
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
                보증서 등록이 완료되었습니다.<br />
                관리자 확인 후 카카오톡으로 보증서가 발송됩니다.
              </p>

              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground">보증서 번호</p>
                <p className="text-lg font-mono font-bold">{fetcherData?.warrantyNumber}</p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-800 dark:text-green-200">
                <p>✅ 승인 완료 시 1년간 무상 A/S 가능</p>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                영업일 기준 1-2일 내 처리됩니다
              </p>
            </CardContent>
          </Card>
        )}

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>문의: 1234-5678</p>
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
