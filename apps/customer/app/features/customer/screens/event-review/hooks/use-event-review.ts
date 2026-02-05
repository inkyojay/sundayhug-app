/**
 * Event Review State Management Hook
 */
import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { PhotoItem, UserProfile, Warranty, WarrantyMode, ReviewEvent, EventProduct, EventGift } from "../types";

interface UseEventReviewProps {
  events: ReviewEvent[];
  profile: UserProfile | null;
  warranties: Warranty[];
}

export function useEventReview({ events, profile, warranties }: UseEventReviewProps) {
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mallFileInputRef = useRef<HTMLInputElement>(null);
  const warrantyFileInputRef = useRef<HTMLInputElement>(null);

  // Event/Product/Gift selection
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length === 1 ? events[0].id : null
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);

  // Warranty
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);
  const [warrantyMode, setWarrantyMode] = useState<WarrantyMode>(null);
  const [warrantyName, setWarrantyName] = useState(profile?.name || "");
  const [warrantyPhone, setWarrantyPhone] = useState(profile?.phone || "");
  const [warrantyPurchaseDate, setWarrantyPurchaseDate] = useState("");
  const [warrantyPhoto, setWarrantyPhoto] = useState<PhotoItem | null>(null);
  const [isWarrantyUploading, setIsWarrantyUploading] = useState(false);
  const [localWarranties, setLocalWarranties] = useState(warranties);

  // Form inputs
  const [reviewUrl, setReviewUrl] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [mallPhotos, setMallPhotos] = useState<PhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Buyer info
  const [buyerName, setBuyerName] = useState(profile?.name || "");
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone || "");
  const [purchaseChannel, setPurchaseChannel] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Shipping info
  const [shippingName, setShippingName] = useState(profile?.name || "");
  const [shippingPhone, setShippingPhone] = useState(profile?.phone || "");
  const [shippingZipcode, setShippingZipcode] = useState(profile?.zipcode || "");
  const [shippingAddress, setShippingAddress] = useState(profile?.address || "");
  const [shippingAddressDetail, setShippingAddressDetail] = useState(profile?.address_detail || "");

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [isAddressApiReady, setIsAddressApiReady] = useState(false);

  const fetcherData = fetcher.data as { success: boolean; error?: string; warrantyId?: string } | undefined;
  const isSubmitting = fetcher.state === "submitting";

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const eventProducts = selectedEvent?.review_event_products || [];
  const eventGifts = selectedEvent?.review_event_gifts || [];

  const availableGifts = eventGifts.filter(
    (g) => g.product_id === selectedProductId || !g.product_id
  );

  // Update local warranties when warranty is registered
  useEffect(() => {
    if (fetcherData?.warrantyRegistered && fetcherData?.newWarrantyId) {
      const newWarranty: Warranty = {
        id: fetcherData.newWarrantyId,
        warranty_number: fetcherData.newWarrantyNumber,
        product_name: "ABC 이동식 아기침대",
        buyer_name: warrantyName,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setLocalWarranties((prev) => [newWarranty, ...prev]);
      setSelectedWarrantyId(fetcherData.newWarrantyId);
      setWarrantyMode("select");
      setWarrantyPhoto(null);
    }
  }, [fetcherData, warrantyName]);

  // Determine warranty mode when product is selected
  useEffect(() => {
    if (selectedProductId) {
      if (selectedEvent?.show_warranty_link === false) {
        setWarrantyMode(null);
        setSelectedWarrantyId(null);
        return;
      }

      const hasWarranty = localWarranties.some(
        (w) => w.product_name?.includes("ABC") || w.product_name?.includes("아기침대")
      );

      setWarrantyMode(hasWarranty ? "select" : "register");
    } else {
      setWarrantyMode(null);
      setSelectedWarrantyId(null);
    }
  }, [selectedProductId, localWarranties, selectedEvent?.show_warranty_link]);

  // Load Daum Postcode API
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.daum?.Postcode) {
        setIsAddressApiReady(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = () => setIsAddressApiReady(true);
      document.body.appendChild(script);
    }
  }, []);

  const handleSearchAddress = () => {
    if (!window.daum) {
      alert("주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        setShippingZipcode(data.zonecode);
        setShippingAddress(data.address);
        setShippingAddressDetail("");
        document.getElementById("addressDetail")?.focus();
      },
    }).open();
  };

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
      setTargetPhotos((prev) => [...prev, { file, preview: reader.result as string }].slice(0, 3));
    };
    reader.readAsDataURL(file);

    const inputRef = type === "review" ? fileInputRef : mallFileInputRef;
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePhoto = (index: number, type: "review" | "mall") => {
    const setTargetPhotos = type === "review" ? setPhotos : setMallPhotos;
    setTargetPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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

  return {
    // Refs
    fileInputRef,
    mallFileInputRef,
    warrantyFileInputRef,

    // Fetcher
    fetcher,
    fetcherData,
    isSubmitting,

    // Event selection
    selectedEventId,
    setSelectedEventId,
    selectedProductId,
    setSelectedProductId,
    selectedGiftId,
    setSelectedGiftId,
    selectedEvent,
    eventProducts,
    eventGifts,
    availableGifts,

    // Warranty
    selectedWarrantyId,
    setSelectedWarrantyId,
    warrantyMode,
    setWarrantyMode,
    warrantyName,
    setWarrantyName,
    warrantyPhone,
    setWarrantyPhone,
    warrantyPurchaseDate,
    setWarrantyPurchaseDate,
    warrantyPhoto,
    setWarrantyPhoto,
    isWarrantyUploading,
    setIsWarrantyUploading,
    localWarranties,
    handleWarrantyPhotoSelect,

    // Photos
    photos,
    setPhotos,
    mallPhotos,
    setMallPhotos,
    isUploading,
    setIsUploading,
    handlePhotoSelect,
    removePhoto,

    // Form
    reviewUrl,
    setReviewUrl,
    showForm,
    setShowForm,

    // Buyer
    buyerName,
    setBuyerName,
    buyerPhone,
    setBuyerPhone,
    purchaseChannel,
    setPurchaseChannel,
    referralSource,
    setReferralSource,

    // Shipping
    shippingName,
    setShippingName,
    shippingPhone,
    setShippingPhone,
    shippingZipcode,
    setShippingZipcode,
    shippingAddress,
    setShippingAddress,
    shippingAddressDetail,
    setShippingAddressDetail,
    isAddressApiReady,
    handleSearchAddress,
  };
}
