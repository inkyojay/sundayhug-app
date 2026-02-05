/**
 * 이벤트 후기 참여 페이지
 * - 사은품 안내, 참여방법, 유의사항 표시
 * - 제품/사은품 선택
 * - 배송지 입력
 */
import type { Route } from "./+types/event-review";

import { useState, useRef, useEffect } from "react";
import { Link, redirect, useLoaderData, useFetcher, data } from "react-router";
import { 
  ArrowLeft, 
  X,
  Send,
  CheckCircle,
  Gift,
  ImagePlus,
  MapPin,
  Package,
  ChevronDown,
  Truck,
  AlertCircle
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Badge } from "~/core/components/ui/badge";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "후기 이벤트 참여 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login?redirect=/customer/event/review");
  }

  // 프로필 정보 조회 (프리필드용 - 주소 포함)
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, address, address_detail, zipcode")
    .eq("id", user.id)
    .single();

  // 진행 중인 이벤트 조회
  const today = new Date().toISOString().split('T')[0];
  const { data: events } = await supabase
    .from("review_events")
    .select(`
      *,
      review_event_products (*),
      review_event_gifts (*)
    `)
    .eq("is_active", true)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("created_at", { ascending: false });

  // 사용자의 승인된 보증서 목록 조회
  const { data: warranties } = await supabase
    .from("warranties")
    .select("id, warranty_number, product_name, buyer_name, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return data({ 
    events: events || [],
    profile: profile || null,
    warranties: warranties || [],
  });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  // 보증서 등록 처리
  if (actionType === "registerWarranty") {
    const customerName = formData.get("warrantyName") as string;
    const phone = formData.get("warrantyPhone") as string;
    const purchaseDate = formData.get("warrantyPurchaseDate") as string;
    const photoUrl = formData.get("warrantyPhotoUrl") as string;
    const productName = formData.get("warrantyProductName") as string;

    if (!customerName || !phone) {
      return { success: false, error: "이름과 연락처를 입력해주세요.", warrantyError: true };
    }

    const normalizedPhone = phone.replace(/-/g, "");

    // 보증서 번호 생성
    const { data: warrantyNumber } = await supabase.rpc("generate_warranty_number");

    const { data: warranty, error } = await supabase
      .from("warranties")
      .insert({
        warranty_number: warrantyNumber || `SH-W-${Date.now()}`,
        user_id: user.id,
        buyer_name: customerName,
        customer_phone: normalizedPhone,
        product_name: productName || "ABC 이동식 아기침대",
        order_date: purchaseDate ? new Date(purchaseDate).toISOString().split("T")[0] : null,
        status: "pending",
        product_photo_url: photoUrl || null,
        photo_uploaded_at: photoUrl ? new Date().toISOString() : null,
      })
      .select("id, warranty_number")
      .single();

    if (error) {
      console.error("보증서 등록 오류:", error);
      return { success: false, error: "보증서 등록 중 오류가 발생했습니다.", warrantyError: true };
    }

    return { 
      success: true, 
      warrantyRegistered: true,
      newWarrantyId: warranty?.id,
      newWarrantyNumber: warranty?.warranty_number,
      message: "보증서 등록이 완료되었습니다! 이제 후기를 제출해주세요." 
    };
  }

  const reviewUrl = formData.get("reviewUrl") as string;
  const mallScreenshotUrls = formData.get("mallScreenshotUrls") as string;
  const screenshotUrls = formData.get("screenshotUrls") as string;
  const buyerName = formData.get("buyerName") as string;
  const buyerPhone = formData.get("buyerPhone") as string;
  const purchaseChannel = formData.get("purchaseChannel") as string;
  const referralSource = formData.get("referralSource") as string;
  
  // 이벤트 관련
  const eventId = formData.get("eventId") as string;
  const eventProductId = formData.get("eventProductId") as string;
  const selectedGiftId = formData.get("selectedGiftId") as string;
  const productName = formData.get("productName") as string;
  const warrantyId = formData.get("warrantyId") as string;
  
  // 배송지
  const shippingName = formData.get("shippingName") as string;
  const shippingPhone = formData.get("shippingPhone") as string;
  const shippingZipcode = formData.get("shippingZipcode") as string;
  const shippingAddress = formData.get("shippingAddress") as string;
  const shippingAddressDetail = formData.get("shippingAddressDetail") as string;

  if (!eventId || !reviewUrl) {
    return { success: false, error: "필수 정보를 입력해주세요." };
  }

  if (!buyerName || !buyerPhone) {
    return { success: false, error: "구매자명과 연락처는 필수입니다." };
  }

  if (!shippingName || !shippingPhone || !shippingAddress) {
    return { success: false, error: "사은품 수령을 위해 배송지 정보를 입력해주세요." };
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
    try { screenshots = JSON.parse(screenshotUrls); } catch {}
  }

  let mallScreenshots: string[] = [];
  if (mallScreenshotUrls) {
    try { mallScreenshots = JSON.parse(mallScreenshotUrls); } catch {}
  }

  const { error } = await supabase
    .from("review_submissions")
    .insert({
      user_id: user.id,
      review_type: "momcafe", // 이벤트는 맘카페 고정
      review_url: reviewUrl,
      product_name: productName || null,
      screenshot_urls: screenshots.length > 0 ? screenshots : null,
      mall_review_screenshot_urls: mallScreenshots.length > 0 ? mallScreenshots : null,
      buyer_name: buyerName,
      buyer_phone: buyerPhone.replace(/-/g, ""),
      purchase_channel: purchaseChannel || null,
      referral_source: referralSource || null,
      // 이벤트 관련
      event_id: eventId,
      event_product_id: eventProductId || null,
      selected_gift_id: selectedGiftId || null,
      warranty_id: warrantyId || null, // 보증서 연동
      // 배송지
      shipping_name: shippingName,
      shipping_phone: shippingPhone.replace(/-/g, ""),
      shipping_zipcode: shippingZipcode || null,
      shipping_address: shippingAddress,
      shipping_address_detail: shippingAddressDetail || null,
    });

  if (error) {
    console.error("후기 인증 신청 오류:", error);
    return { success: false, error: "신청 중 오류가 발생했습니다." };
  }

  // 프로필에 주소 저장
  await supabase
    .from("profiles")
    .update({
      address: shippingAddress,
      address_detail: shippingAddressDetail || null,
      zipcode: shippingZipcode || null,
      phone: buyerPhone.replace(/-/g, ""),
    })
    .eq("id", user.id);

  return { success: true, message: "후기 이벤트 참여가 완료되었습니다!" };
}

const purchaseChannels = [
  "쿠팡", "네이버 스마트스토어", "자사몰 (sundayhug.kr)",
  "11번가", "G마켓/옥션", "위메프", "티몬", "카카오선물하기", "기타",
];

const referralSources = [
  { value: "naver", label: "네이버 검색" },
  { value: "instagram", label: "인스타그램 광고" },
  { value: "momcafe", label: "맘카페 내 추천" },
  { value: "referral", label: "주변 지인 추천" },
  { value: "other", label: "기타" },
];

// 다음 우편번호 API 타입
declare global {
  interface Window {
    daum: any;
  }
}

export default function EventReviewScreen() {
  const { events, profile, warranties } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mallFileInputRef = useRef<HTMLInputElement>(null);
  const warrantyFileInputRef = useRef<HTMLInputElement>(null);
  
  // 이벤트/제품/사은품 선택
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length === 1 ? events[0].id : null
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  
  // 보증서 관련
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);
  const [warrantyMode, setWarrantyMode] = useState<"select" | "register" | null>(null);
  const [warrantyName, setWarrantyName] = useState(profile?.name || "");
  const [warrantyPhone, setWarrantyPhone] = useState(profile?.phone || "");
  const [warrantyPurchaseDate, setWarrantyPurchaseDate] = useState("");
  const [warrantyPhoto, setWarrantyPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [isWarrantyUploading, setIsWarrantyUploading] = useState(false);
  const [localWarranties, setLocalWarranties] = useState(warranties);
  
  // 폼 입력
  const [reviewUrl, setReviewUrl] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [mallPhotos, setMallPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // 구매자 정보
  const [buyerName, setBuyerName] = useState(profile?.name || "");
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone || "");
  const [purchaseChannel, setPurchaseChannel] = useState("");
  const [referralSource, setReferralSource] = useState("");
  
  // 배송지 정보
  const [shippingName, setShippingName] = useState(profile?.name || "");
  const [shippingPhone, setShippingPhone] = useState(profile?.phone || "");
  const [shippingZipcode, setShippingZipcode] = useState(profile?.zipcode || "");
  const [shippingAddress, setShippingAddress] = useState(profile?.address || "");
  const [shippingAddressDetail, setShippingAddressDetail] = useState(profile?.address_detail || "");

  // 폼 표시 여부
  const [showForm, setShowForm] = useState(false);
  
  // 주소 검색 API 로딩 상태
  const [isAddressApiReady, setIsAddressApiReady] = useState(false);

  const fetcherData = fetcher.data as { success: boolean; error?: string; warrantyId?: string } | undefined;
  const isSubmitting = fetcher.state === "submitting";

  const selectedEvent = events.find((e: any) => e.id === selectedEventId);
  const eventProducts = selectedEvent?.review_event_products || [];
  const eventGifts = selectedEvent?.review_event_gifts || [];

  // 보증서 등록 완료 시 localWarranties 업데이트
  useEffect(() => {
    if (fetcherData?.warrantyRegistered && fetcherData?.newWarrantyId) {
      const newWarranty = {
        id: fetcherData.newWarrantyId,
        warranty_number: fetcherData.newWarrantyNumber,
        product_name: "ABC 이동식 아기침대",
        buyer_name: warrantyName,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setLocalWarranties((prev: any) => [newWarranty, ...prev]);
      setSelectedWarrantyId(fetcherData.newWarrantyId);
      setWarrantyMode("select");
      setWarrantyPhoto(null);
    }
  }, [fetcherData]);

  // 제품 선택 시 보증서 모드 결정
  useEffect(() => {
    if (selectedProductId) {
      // 보증서 연동이 비활성화된 경우 warrantyMode를 null로 유지
      if (selectedEvent?.show_warranty_link === false) {
        setWarrantyMode(null);
        setSelectedWarrantyId(null);
        return;
      }
      
      // ABC 침대 관련 보증서가 있는지 확인
      const hasWarranty = localWarranties.some((w: any) => 
        w.product_name?.includes("ABC") || w.product_name?.includes("아기침대")
      );
      
      if (hasWarranty) {
        setWarrantyMode("select");
      } else {
        setWarrantyMode("register");
      }
    } else {
      setWarrantyMode(null);
      setSelectedWarrantyId(null);
    }
  }, [selectedProductId, localWarranties, selectedEvent?.show_warranty_link]);

  // 보증서 사진 선택
  const handleWarrantyPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setWarrantyPhoto({ file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // 보증서 등록 제출
  const handleWarrantySubmit = async () => {
    if (!warrantyName || !warrantyPhone) {
      alert("이름과 연락처를 입력해주세요.");
      return;
    }

    setIsWarrantyUploading(true);
    let photoUrl = "";

    try {
      // 사진 업로드
      if (warrantyPhoto) {
        const timestamp = Date.now();
        const fileExt = warrantyPhoto.file.name.split(".").pop();
        const fileName = `warranty_${timestamp}.${fileExt}`;

        const response = await fetch("/api/warranty/upload-photo", {
          method: "POST",
          body: (() => {
            const fd = new FormData();
            fd.append("file", warrantyPhoto.file);
            fd.append("fileName", fileName);
            return fd;
          })(),
        });

        if (response.ok) {
          const result = await response.json();
          photoUrl = result.url;
        }
      }

      // 보증서 등록 요청
      fetcher.submit(
        {
          actionType: "registerWarranty",
          warrantyName,
          warrantyPhone,
          warrantyPurchaseDate,
          warrantyPhotoUrl: photoUrl,
          warrantyProductName: eventProducts.find((p: any) => p.id === selectedProductId)?.product_name || "ABC 이동식 아기침대",
        },
        { method: "POST" }
      );
    } finally {
      setIsWarrantyUploading(false);
    }
  };
  
  // 선택한 제품의 사은품 또는 공통 사은품
  const availableGifts = eventGifts.filter(
    (g: any) => g.product_id === selectedProductId || !g.product_id
  );

  // 다음 우편번호 API
  const handleSearchAddress = () => {
    if (!window.daum) {
      alert("주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        setShippingZipcode(data.zonecode);
        setShippingAddress(data.address);
        setShippingAddressDetail("");
        
        const detailInput = document.getElementById("addressDetail");
        if (detailInput) detailInput.focus();
      }
    }).open();
  };

  // 다음 API 스크립트 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 이미 로드된 경우
      if (window.daum?.Postcode) {
        setIsAddressApiReady(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = () => {
        setIsAddressApiReady(true);
      };
      document.body.appendChild(script);
    }
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "review" | "mall") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const targetPhotos = type === "review" ? photos : mallPhotos;
    const setTargetPhotos = type === "review" ? setPhotos : setMallPhotos;

    if (targetPhotos.length >= 3) {
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
      setTargetPhotos(prev => [...prev, { file, preview: reader.result as string }].slice(0, 3));
    };
    reader.readAsDataURL(file);

    const inputRef = type === "review" ? fileInputRef : mallFileInputRef;
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePhoto = (index: number, type: "review" | "mall") => {
    const setTargetPhotos = type === "review" ? setPhotos : setMallPhotos;
    setTargetPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (photosToUpload: { file: File; preview: string }[]): Promise<string[]> => {
    if (photosToUpload.length === 0) return [];
    const urls: string[] = [];
    try {
      for (const photo of photosToUpload) {
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
    
    if (!selectedEventId) {
      alert("이벤트를 선택해주세요.");
      return;
    }

    if (eventProducts.length > 0 && !selectedProductId) {
      alert("후기 작성 제품을 선택해주세요.");
      return;
    }

    if (availableGifts.length > 1 && !selectedGiftId) {
      alert("사은품을 선택해주세요.");
      return;
    }

    if (!reviewUrl) {
      alert("맘카페 후기 링크를 입력해주세요.");
      return;
    }

    if (!buyerName || !buyerPhone) {
      alert("구매자명과 연락처는 필수입니다.");
      return;
    }

    if (!shippingAddress) {
      alert("배송지 주소를 입력해주세요.");
      return;
    }

    setIsUploading(true);
    
    try {
      const screenshotUrls = await uploadPhotos(photos);
      const mallScreenshotUrls = await uploadPhotos(mallPhotos);
      
      // 제품명 가져오기
      const selectedProduct = eventProducts.find((p: any) => p.id === selectedProductId);
      const productName = selectedProduct?.product_name || "";

      // 사은품이 1개면 자동 선택
      const finalGiftId = selectedGiftId || (availableGifts.length === 1 ? availableGifts[0].id : null);

      fetcher.submit(
        {
          actionType: "submitReview",
          reviewUrl,
          screenshotUrls: JSON.stringify(screenshotUrls),
          mallScreenshotUrls: JSON.stringify(mallScreenshotUrls),
          buyerName,
          buyerPhone,
          purchaseChannel,
          referralSource,
          eventId: selectedEventId,
          eventProductId: selectedProductId || "",
          selectedGiftId: finalGiftId || "",
          productName,
          warrantyId: selectedWarrantyId || "",
          shippingName,
          shippingPhone,
          shippingZipcode,
          shippingAddress,
          shippingAddressDetail,
        },
        { method: "POST" }
      );
    } finally {
      setIsUploading(false);
    }
  };

  // 진행 중인 이벤트가 없으면
  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
          <div className="flex items-center gap-4 mb-8">
            <Link 
              to="/customer"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">후기 이벤트</h1>
          </div>
          
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">현재 진행 중인 이벤트가 없습니다.</p>
            <p className="text-sm text-gray-400">새로운 이벤트가 시작되면 알려드릴게요!</p>
            
            <Link to="/customer/mypage/review-submit">
              <Button className="mt-6" variant="outline">
                일반 후기 인증하러 가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* 헤더 */}
      <header className="bg-[#1A1A1A] text-white py-12 px-6 text-center">
        <Link 
          to="/customer"
          className="absolute left-4 top-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        
        <p className="text-xs font-medium tracking-widest text-gray-400 mb-4">SUNDAY HUG</p>
        <h1 className="text-2xl font-light mb-2">
          소중한 후기를 남겨주세요<br />
          <strong className="font-semibold">특별한 선물을 드립니다</strong>
        </h1>
        <p className="text-sm text-gray-400 mt-4">
          썬데이허그를 선택해주신 고객님께 감사의 마음을 담아<br />
          다양한 혜택을 준비했습니다.
        </p>
      </header>

      <div className="bg-[#F5F5F0] rounded-t-3xl min-h-screen">
        <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">
          {/* 제출 완료 화면 */}
          {fetcherData?.success && !fetcherData?.warrantyRegistered && (
            <div className="fixed inset-0 z-50 bg-[#F5F5F0] flex items-center justify-center">
              <div className="max-w-md w-full mx-4 text-center">
                {/* 성공 아이콘 */}
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  후기 이벤트 참여 완료! 🎉
                </h2>
                <p className="text-gray-600 mb-6">
                  성공적으로 제출되었습니다.<br />
                  검토 후 <strong>1~2 영업일 내</strong> 결과를 알려드립니다.
                </p>

                {/* 안내 카드 */}
                <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 text-left">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-600 font-bold text-sm">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">관리자 검토</p>
                        <p className="text-sm text-gray-500">제출하신 후기를 확인합니다</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-600 font-bold text-sm">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">승인 알림</p>
                        <p className="text-sm text-gray-500">카카오톡으로 결과를 안내드립니다</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Gift className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">사은품 발송</p>
                        <p className="text-sm text-gray-500">승인 후 차주 금요일에 일괄 발송</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 버튼들 */}
                <div className="space-y-4">
                  <Link to="/customer/mypage">
                    <Button className="w-full h-14 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium">
                      마이페이지에서 확인하기
                    </Button>
                  </Link>
                  <Link to="/customer" className="block mt-2">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-gray-300">
                      홈으로 돌아가기
                    </Button>
                  </Link>
                </div>

                {/* 푸터 */}
                <p className="mt-8 text-sm text-gray-400">
                  문의사항은 카카오톡 채널로 연락주세요
                </p>
              </div>
            </div>
          )}

          {fetcherData?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-700">❌ {fetcherData.error}</p>
            </div>
          )}

          {/* 이벤트 선택 (여러 개일 때만) */}
          {events.length > 1 && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">이벤트 선택</h2>
              <div className="space-y-3">
                {events.map((event: any) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setSelectedProductId(null);
                      setSelectedGiftId(null);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedEventId === event.id
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {selectedEventId === event.id ? (
                        <CheckCircle className="w-5 h-5 text-orange-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 선택된 이벤트 정보 */}
          {selectedEvent && (
            <>
              {/* 사은품 안내 - 제품별 1:1 매칭 */}
              <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
                <div className="text-center mb-6">
                  <Badge className="bg-gray-900 text-white mb-3">EVENT</Badge>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    포토 리뷰 이벤트
                  </h2>
                  <p className="text-sm text-gray-500">
                    구매하신 사이트 & 맘카페에 후기 작성 시 사은품 증정
                  </p>
                </div>

                {/* 제품별 사은품 1:1 매칭 카드 */}
                <div className="space-y-3">
                  {eventProducts.map((product: any) => {
                    // 이 제품에 매칭된 사은품 찾기
                    const matchedGift = eventGifts.find((g: any) => g.product_id === product.id);
                    
                    return (
                      <div 
                        key={product.id}
                        className="bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 rounded-2xl p-4 border border-orange-100"
                      >
                        <div className="flex items-center gap-3">
                          {/* 후기 제품 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-orange-600 font-semibold mb-1">후기 작성</p>
                            <div className="bg-white rounded-xl p-3 border border-orange-100">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 text-sm truncate">{product.product_name}</p>
                                  {product.product_sub_name && (
                                    <p className="text-xs text-gray-500 truncate">{product.product_sub_name}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 화살표 */}
                          <div className="flex flex-col items-center flex-shrink-0 px-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                              <span className="text-white text-lg">→</span>
                            </div>
                          </div>

                          {/* 사은품 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-green-600 font-semibold mb-1">사은품 증정</p>
                            <div className="bg-white rounded-xl p-3 border border-green-100">
                              {matchedGift ? (
                                <div className="flex items-center gap-2">
                                  {matchedGift.gift_image_url ? (
                                    <img
                                      src={matchedGift.gift_image_url}
                                      alt={matchedGift.gift_name}
                                      className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                    />
                                  ) : (
                                    <Gift className="w-5 h-5 text-green-500 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-900 text-sm truncate">{matchedGift.gift_name}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Gift className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                  <p className="text-gray-500 text-sm">선택 가능</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 공통 사은품이 있는 경우 (product_id가 null인 사은품) */}
                {eventGifts.filter((g: any) => !g.product_id).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
                      🎁 공통 사은품 (선택 가능)
                    </p>
                    <div className="grid gap-3 grid-cols-2">
                      {eventGifts.filter((g: any) => !g.product_id).map((gift: any) => (
                        <div 
                          key={gift.id}
                          className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-200"
                        >
                          {gift.gift_image_url ? (
                            <img
                              src={gift.gift_image_url}
                              alt={gift.gift_name}
                              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                              <Gift className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            {gift.gift_code && (
                              <span className="inline-block px-2 py-0.5 bg-gray-900 text-white rounded text-xs font-bold mb-1">
                                {gift.gift_code}
                              </span>
                            )}
                            <p className="font-medium text-gray-900 text-sm">{gift.gift_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 참여 방법 */}
              <div className="bg-[#F8F6F4] rounded-2xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-5 text-center">참여 방법</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">쇼핑몰 후기 남기기</p>
                      <p className="text-sm text-gray-500">구매하신 쇼핑몰에 제품 후기를 작성해주세요</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">맘카페 후기 남기기</p>
                      <p className="text-sm text-gray-500">맘스홀릭 / 맘이베베 중 한 곳에 제품 사용 후기 작성</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">아래 버튼을 눌러 인증하기</p>
                      <p className="text-sm text-gray-500">후기 작성 후 인증 폼을 제출해주세요</p>
                    </div>
                  </div>
                </div>

                {!showForm && (
                  <div className="text-center mt-6">
                    <Button 
                      onClick={() => setShowForm(true)}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-lg"
                    >
                      후기 제출하기
                    </Button>
                  </div>
                )}
              </div>

              {/* 유의사항 */}
              <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-semibold text-amber-600 mb-2 text-sm">1. 사은품 안내</p>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        사은품은 <span className="text-amber-600 font-medium">후기제출 후 차주 금요일</span>에 일괄 발송됩니다.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        사은품의 색상은 <span className="text-amber-600 font-medium">랜덤으로 발송</span>됩니다.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        후기 사은품 소진 시 다른 상품으로 대체될 수 있습니다.
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-semibold text-amber-600 mb-2 text-sm">2. 참여 유의사항</p>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-amber-600 font-medium">동일 제품 중복 참여</span> 시 사은품 발송이 어려울 수 있습니다.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        작성해주신 글이 <span className="text-amber-600 font-medium">삭제 또는 미노출시</span> 사은품 발송이 어려울 수 있습니다.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        후기글에 <span className="text-amber-600 font-medium">제품 사진, 구매인증사진, 5줄 이상의 텍스트</span>를 포함해 주세요.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 제출 폼 */}
              {showForm && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 제품 선택 */}
                  {eventProducts.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        후기 작성 제품 *
                      </h3>
                      <div className="space-y-2">
                        {eventProducts.map((product: any) => {
                          const productGift = eventGifts.find((g: any) => g.product_id === product.id);
                          
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setSelectedGiftId(null);
                              }}
                              className={`w-full p-4 rounded-xl border transition-all text-left ${
                                selectedProductId === product.id
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {selectedProductId === product.id ? (
                                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">{product.product_name}</p>
                                  {product.product_sub_name && (
                                    <p className="text-sm text-gray-500">{product.product_sub_name}</p>
                                  )}
                                </div>
                                {productGift && (
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-400">사은품</p>
                                    <p className="text-sm text-green-600 font-medium">{productGift.gift_name}</p>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 보증서 연동 섹션 - show_warranty_link가 false가 아닌 경우에만 표시 */}
                  {selectedProductId && warrantyMode && selectedEvent?.show_warranty_link !== false && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        보증서 연동
                      </h3>

                      {/* 보증서가 있는 경우: 선택 */}
                      {warrantyMode === "select" && localWarranties.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 mb-3">
                            등록된 보증서를 선택하거나 새로 등록해주세요.
                          </p>
                          
                          {localWarranties.filter((w: any) => 
                            w.product_name?.includes("ABC") || w.product_name?.includes("아기침대")
                          ).map((warranty: any) => (
                            <button
                              key={warranty.id}
                              type="button"
                              onClick={() => setSelectedWarrantyId(warranty.id)}
                              className={`w-full p-4 rounded-xl border transition-all text-left ${
                                selectedWarrantyId === warranty.id
                                  ? "border-emerald-400 bg-emerald-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {selectedWarrantyId === warranty.id ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">{warranty.product_name}</p>
                                  <p className="text-sm text-gray-500">
                                    {warranty.warranty_number} · {warranty.buyer_name}
                                  </p>
                                </div>
                                <Badge className={warranty.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                                  {warranty.status === "approved" ? "승인됨" : "대기중"}
                                </Badge>
                              </div>
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() => setWarrantyMode("register")}
                            className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                          >
                            + 새 보증서 등록하기
                          </button>
                        </div>
                      )}

                      {/* 보증서가 없거나 새로 등록하는 경우 */}
                      {warrantyMode === "register" && (
                        <div className="space-y-4">
                          {fetcherData?.warrantyError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                              ❌ {fetcherData.error}
                            </div>
                          )}
                          
                          {fetcherData?.warrantyRegistered && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">
                              ✅ {fetcherData.message}
                            </div>
                          )}

                          <p className="text-sm text-gray-600">
                            이벤트 참여를 위해 보증서를 먼저 등록해주세요.
                          </p>

                          <div className="grid gap-3">
                            <div>
                              <Label className="text-gray-700 text-sm mb-1.5 block">구매자명 *</Label>
                              <Input
                                placeholder="구매자 이름"
                                value={warrantyName}
                                onChange={(e) => setWarrantyName(e.target.value)}
                                className="h-12 rounded-xl border-gray-200 bg-white text-gray-900"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700 text-sm mb-1.5 block">연락처 *</Label>
                              <Input
                                type="tel"
                                placeholder="010-0000-0000"
                                value={warrantyPhone}
                                onChange={(e) => setWarrantyPhone(e.target.value)}
                                className="h-12 rounded-xl border-gray-200 bg-white text-gray-900"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700 text-sm mb-1.5 block">구매일 (선택)</Label>
                              <Input
                                type="date"
                                value={warrantyPurchaseDate}
                                onChange={(e) => setWarrantyPurchaseDate(e.target.value)}
                                className="h-12 rounded-xl border-gray-200 bg-white text-gray-900"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700 text-sm mb-1.5 block">제품 사진 (선택)</Label>
                              <input
                                ref={warrantyFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleWarrantyPhotoSelect}
                                className="hidden"
                              />
                              {warrantyPhoto ? (
                                <div className="relative w-24 h-24">
                                  <img 
                                    src={warrantyPhoto.preview} 
                                    alt="제품 사진"
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setWarrantyPhoto(null)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => warrantyFileInputRef.current?.click()}
                                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
                                >
                                  <ImagePlus className="w-6 h-6" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {localWarranties.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setWarrantyMode("select")}
                                className="flex-1 h-12 rounded-xl"
                              >
                                기존 보증서 선택
                              </Button>
                            )}
                            <Button
                              type="button"
                              onClick={handleWarrantySubmit}
                              disabled={isWarrantyUploading || isSubmitting}
                              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isWarrantyUploading ? "등록 중..." : "보증서 등록"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 사은품 선택 (여러 개일 때) */}
                  {availableGifts.length > 1 && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-green-500" />
                        사은품 선택 *
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {availableGifts.map((gift: any) => (
                          <button
                            key={gift.id}
                            type="button"
                            onClick={() => setSelectedGiftId(gift.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                              selectedGiftId === gift.id
                                ? "border-green-400 bg-green-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {gift.gift_code && (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${
                                selectedGiftId === gift.id
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200 text-gray-700"
                              }`}>
                                {gift.gift_code}
                              </span>
                            )}
                            {gift.gift_image_url && (
                              <img
                                src={gift.gift_image_url}
                                alt={gift.gift_name}
                                className="w-full aspect-square object-cover rounded-lg mb-2"
                              />
                            )}
                            <p className="font-medium text-gray-900 text-sm">{gift.gift_name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 쇼핑몰 후기 스크린샷 - 맘카페 이벤트가 아닌 경우만 표시 */}
                  {!selectedEvent?.name?.includes("맘카페") && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                      <Label className="text-gray-700 font-medium mb-2 block">
                        공식몰 또는 스마트스토어 후기 *
                      </Label>
                      <p className="text-sm text-gray-500 mb-4">
                        후기 작성한 사진을 캡쳐해서 올려주세요.
                      </p>
                      
                      <input
                        ref={mallFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoSelect(e, "mall")}
                        className="hidden"
                      />

                      <div className="flex flex-wrap gap-3">
                        {mallPhotos.map((photo, index) => (
                          <div key={index} className="relative w-20 h-20">
                            <img 
                              src={photo.preview} 
                              alt={`스크린샷 ${index + 1}`}
                              className="w-full h-full object-cover rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index, "mall")}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {mallPhotos.length < 3 && (
                          <button
                            type="button"
                            onClick={() => mallFileInputRef.current?.click()}
                            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                          >
                            <ImagePlus className="w-5 h-5 mb-1" />
                            <span className="text-xs">{mallPhotos.length}/3</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 맘카페 후기 URL */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100">
                    <Label className="text-gray-700 font-medium mb-2 block">
                      맘카페 후기 링크 *
                    </Label>
                    <Input
                      type="url"
                      placeholder="작성해주신 후기 링크를 남겨주세요"
                      value={reviewUrl}
                      onChange={(e) => setReviewUrl(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                      required
                    />
                  </div>

                  {/* 유입경로 - show_referral_source가 false가 아닌 경우에만 표시 */}
                  {selectedEvent?.show_referral_source !== false && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                      <Label className="text-gray-700 font-medium mb-2 block">
                        썬데이허그를 어떻게 알게 되셨나요? *
                      </Label>
                      <p className="text-sm text-gray-500 mb-3">
                        구매하시는데 가장 큰 영향을 주신 항목을 선택해 주세요.
                      </p>
                      <div className="space-y-2">
                        {/* 이벤트 설정의 보기 옵션 사용, 없으면 기본값 */}
                        {(selectedEvent?.referral_source_options || referralSources.map(s => s.label)).map((option: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setReferralSource(option)}
                            className={`w-full p-3 rounded-xl border text-left transition-colors ${
                              referralSource === option
                                ? "border-orange-400 bg-orange-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {referralSource === option ? (
                                <CheckCircle className="w-5 h-5 text-orange-500" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                              )}
                              <span className="text-gray-900">{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 구매자 정보 */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">구매자 정보</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-700 text-sm mb-1.5 block">구매자명 *</Label>
                        <Input
                          placeholder="주문 시 입력한 이름"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 text-sm mb-1.5 block">연락처 *</Label>
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

                  {/* 배송지 정보 */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">제품 받으실 주소 *</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-700 text-sm mb-1.5 block">수령인</Label>
                          <Input
                            placeholder="수령인 이름"
                            value={shippingName}
                            onChange={(e) => setShippingName(e.target.value)}
                            className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 text-sm mb-1.5 block">연락처</Label>
                          <Input
                            type="tel"
                            placeholder="010-0000-0000"
                            value={shippingPhone}
                            onChange={(e) => setShippingPhone(e.target.value)}
                            className="h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-700 text-sm mb-1.5 block">주소</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="우편번호"
                            value={shippingZipcode}
                            readOnly
                            className="w-32 h-12 rounded-xl border-gray-200 bg-gray-50 text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={handleSearchAddress}
                            disabled={!isAddressApiReady}
                            style={{
                              backgroundColor: '#7c3aed',
                              color: '#ffffff',
                              padding: '0 20px',
                              height: '48px',
                              borderRadius: '12px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <MapPin className="w-4 h-4" />
                            {isAddressApiReady ? "주소 검색" : "로딩중..."}
                          </button>
                        </div>
                        <Input
                          placeholder="기본 주소"
                          value={shippingAddress}
                          readOnly
                          className="mt-2 h-12 rounded-xl border-gray-200 bg-gray-50 text-gray-900"
                        />
                        <Input
                          id="addressDetail"
                          placeholder="상세 주소 (동/호수)"
                          value={shippingAddressDetail}
                          onChange={(e) => setShippingAddressDetail(e.target.value)}
                          className="mt-2 h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          도로명 주소를 정확히 입력해 주세요. 주소 오류 인하여 재발송은 어렵습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 필수 확인 사항 */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                    <p className="font-semibold text-red-600 mb-3 text-sm">필수 확인 사항 *</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>1. 게시물은 발송일 기준, 카페 측의 제재(삭제예정, 노출제한 등)를 받지 않아야 합니다.</li>
                      <li>2. 텍스트는 5줄 이상 작성, 제품 사진, 구매인증 사진을 꼭 포함해 주세요.</li>
                      <li>3. 도로명 주소가 정확하지 않으면 상품 출고가 어렵습니다.</li>
                      <li>4. 한 게시물에는 한 가지 제품의 후기 만 작성해 주세요.</li>
                    </ul>
                  </div>

                  {/* 제출 버튼 */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="w-full h-14 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium text-lg"
                  >
                    {isSubmitting || isUploading ? (
                      isUploading ? "업로드 중..." : "제출 중..."
                    ) : (
                      "제출"
                    )}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* 푸터 */}
          <footer className="mt-10 text-center text-xs text-gray-400">
            SUNDAY HUG © All rights reserved. www.sundayhug.kr
          </footer>
        </div>
      </div>
    </div>
  );
}

