/**
 * Upload Form Component - 모바일 최적화 버전
 *
 * 스텝 기반 UI로 직관적인 사용자 경험 제공
 */
import { Baby, Camera, AlertCircle, Check, Plus, Phone, Instagram, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Checkbox } from "~/core/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import { cn } from "~/core/lib/utils";

export interface UploadFormData {
  imageBase64: string;
  imageMimeType: string;
  imagePreview: string;
  birthDate: string;
  phoneNumber?: string;
  instagramId?: string;
  newBabyName?: string;
  newBabyGender?: string;
}

interface BabyProfile {
  id: string;
  name: string;
  birth_date: string;
  gender: string | null;
}

interface UploadFormProps {
  onSubmit: (data: UploadFormData) => void;
  isLoading?: boolean;
  defaultPhoneNumber?: string;
  babies?: BabyProfile[];
  isLoggedIn?: boolean;
}

/**
 * Convert file to base64 string
 */
async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function UploadForm({
  onSubmit,
  isLoading = false,
  defaultPhoneNumber = "",
  babies = [],
  isLoggedIn = false,
}: UploadFormProps) {
  const { t } = useTranslation(["sleep-analysis", "common"]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  
  // 아이 선택 또는 새 아이 입력
  const [selectedBabyId, setSelectedBabyId] = useState<string>("");
  const [isAddingNewBaby, setIsAddingNewBaby] = useState(babies.length === 0);
  const [newBabyName, setNewBabyName] = useState("");
  const [newBabyBirthDate, setNewBabyBirthDate] = useState("");
  const [newBabyGender, setNewBabyGender] = useState("");
  
  const [phoneNumber, setPhoneNumber] = useState<string>(defaultPhoneNumber);
  const [instagramId, setInstagramId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];

  // 아이가 없으면 자동으로 새 아이 입력 모드
  useEffect(() => {
    if (babies.length === 0) {
      setIsAddingNewBaby(true);
    }
  }, [babies]);

  // 전화번호 기본값 설정
  useEffect(() => {
    if (defaultPhoneNumber) {
      setPhoneNumber(formatPhone(defaultPhoneNumber));
    }
  }, [defaultPhoneNumber]);

  function formatPhone(value: string) {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }

  // 선택된 아이 정보 가져오기
  const selectedBaby = babies.find(b => b.id === selectedBabyId);
  
  // 분석에 사용할 생년월일
  const birthDateToUse = isAddingNewBaby ? newBabyBirthDate : selectedBaby?.birth_date || "";

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(t("sleep-analysis:errors.invalidImage"));
      return;
    }

    setError(null);
    setImagePreview(URL.createObjectURL(file));
    setImageMimeType(file.type);

    try {
      const base64 = await toBase64(file);
      setImageBase64(base64);
    } catch {
      setError(t("sleep-analysis:errors.uploadFailed"));
    }
  }, [t]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const handleSubmit = () => {
    if (!imageBase64 || !imageMimeType || !imagePreview) {
      setError(t("sleep-analysis:upload.validation.selectPhoto", { defaultValue: "분석할 사진을 선택해주세요." }));
      return;
    }

    if (isAddingNewBaby) {
      if (!newBabyName) {
        setError(t("sleep-analysis:upload.validation.enterBabyName", { defaultValue: "아이 이름을 입력해주세요." }));
        return;
      }
      if (!newBabyBirthDate) {
        setError(t("sleep-analysis:upload.validation.enterBirthDate", { defaultValue: "아이 생년월일을 입력해주세요." }));
        return;
      }
    } else {
      if (!selectedBabyId) {
        setError(t("sleep-analysis:upload.validation.selectBaby", { defaultValue: "분석할 아이를 선택해주세요." }));
        return;
      }
    }

    if (!phoneNumber) {
      setError(t("sleep-analysis:upload.validation.enterPhone", { defaultValue: "전화번호를 입력해주세요." }));
      return;
    }
    if (!privacyAgreed) {
      setError(t("sleep-analysis:upload.validation.agreePrivacy", { defaultValue: "개인정보 수집 및 이용에 동의해주세요." }));
      return;
    }

    onSubmit({
      imageBase64,
      imageMimeType,
      imagePreview,
      birthDate: birthDateToUse,
      phoneNumber: phoneNumber.replace(/-/g, "") || undefined,
      instagramId: instagramId || undefined,
      newBabyName: isAddingNewBaby ? newBabyName : undefined,
      newBabyGender: isAddingNewBaby ? newBabyGender : undefined,
    });
  };

  const resetImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 아이 나이 계산
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "";
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

    if (months < 1) return t("sleep-analysis:upload.baby.newborn", { defaultValue: "신생아" });
    if (months < 12) return t("sleep-analysis:upload.baby.months", { count: months, defaultValue: `${months}개월` });
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return t("sleep-analysis:upload.baby.years", { count: years, defaultValue: `${years}세` });
    return t("sleep-analysis:upload.baby.yearsMonths", { years, months: remainingMonths, defaultValue: `${years}세 ${remainingMonths}개월` });
  };

  // 폼 완성도 체크
  const isPhotoReady = !!imageBase64;
  const isBabyInfoReady = isAddingNewBaby 
    ? (!!newBabyName && !!newBabyBirthDate) 
    : !!selectedBabyId;
  const isPhoneReady = !!phoneNumber && phoneNumber.replace(/-/g, "").length >= 10;

  return (
    <div className="space-y-4">
      {/* ===== STEP 1: 사진 업로드 ===== */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
        {/* 사진 업로드 영역 */}
        <label
          htmlFor="image-upload"
          className={cn(
            "block cursor-pointer transition-all relative",
            !imagePreview && "min-h-[280px]"
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="sr-only"
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt={t("sleep-analysis:upload.uploadedPhoto", { defaultValue: "업로드된 사진" })}
                className="w-full aspect-[4/3] object-cover"
              />
              {/* 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* 하단 정보 */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-medium">{t("sleep-analysis:upload.photoReady", { defaultValue: "사진 준비 완료" })}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      resetImage();
                    }}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    {t("sleep-analysis:upload.reselect", { defaultValue: "다시 선택" })}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 min-h-[280px] bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700">
              {/* 아이콘 */}
              <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35] to-[#FF8F65] rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-orange-200 dark:shadow-none">
                <Camera className="h-10 w-10 text-white" />
              </div>

              {/* 텍스트 */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t("sleep-analysis:upload.title")}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6 max-w-[240px]">
                {t("sleep-analysis:upload.description")}
              </p>

              {/* CTA 버튼 */}
              <div className="flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-2xl font-semibold shadow-lg shadow-orange-200 dark:shadow-none">
                <Camera className="w-5 h-5" />
                <span>{t("sleep-analysis:upload.button")}</span>
              </div>

              {/* 가이드 힌트 */}
              <div className="mt-6 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="text-green-500">✓</span> {t("sleep-analysis:hub.guide.tips.0", { defaultValue: "침대 전체" })}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-green-500">✓</span> {t("sleep-analysis:hub.guide.tips.2", { defaultValue: "밝은 조명" })}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-green-500">✓</span> {t("sleep-analysis:upload.clearPhoto", { defaultValue: "선명한 사진" })}
                </span>
              </div>
            </div>
          )}
        </label>
      </div>

      {/* ===== STEP 2: 아이 정보 ===== */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            isBabyInfoReady
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-500"
          )}>
            {isBabyInfoReady ? <Check className="w-4 h-4" /> : "1"}
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{t("sleep-analysis:upload.babyInfo", { defaultValue: "아이 정보" })}</h3>
        </div>
        
        {/* 등록된 아이가 있는 경우 */}
        {babies.length > 0 && !isAddingNewBaby && (
          <div className="space-y-2">
            {babies.map((baby) => (
              <button
                key={baby.id}
                type="button"
                onClick={() => setSelectedBabyId(baby.id)}
                className={cn(
                  "w-full p-4 rounded-2xl border-2 text-left transition-all",
                  selectedBabyId === baby.id
                    ? "border-[#FF6B35] bg-orange-50 dark:bg-orange-900/20"
                    : "border-gray-100 dark:border-gray-700 hover:border-gray-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">
                      {baby.gender === "male" ? "👦" : baby.gender === "female" ? "👧" : "👶"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{baby.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {baby.gender === "male" ? t("sleep-analysis:upload.baby.male", { defaultValue: "남아" }) : baby.gender === "female" ? t("sleep-analysis:upload.baby.female", { defaultValue: "여아" }) : ""}
                      {baby.birth_date && ` · ${calculateAge(baby.birth_date)}`}
                    </p>
                  </div>
                  {selectedBabyId === baby.id && (
                    <div className="w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            {/* 새 아이 추가 버튼 */}
            <button
              type="button"
              onClick={() => {
                setIsAddingNewBaby(true);
                setSelectedBabyId("");
              }}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">{t("sleep-analysis:upload.addNewBaby", { defaultValue: "새 아이로 분석하기" })}</span>
            </button>
          </div>
        )}
        
        {/* 새 아이 입력 폼 */}
        {(isAddingNewBaby || babies.length === 0) && (
          <div className="space-y-4">
            {babies.length > 0 && (
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500">{t("sleep-analysis:upload.newBabyInfo", { defaultValue: "새 아이 정보" })}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewBaby(false);
                    setNewBabyName("");
                    setNewBabyBirthDate("");
                    setNewBabyGender("");
                  }}
                  className="text-sm text-[#FF6B35] font-medium"
                >
                  {t("common:cancel", { defaultValue: "취소" })}
                </button>
              </div>
            )}

            {/* 이름 */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t("sleep-analysis:upload.baby.name", { defaultValue: "이름 또는 별명" })} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t("sleep-analysis:upload.baby.namePlaceholder", { defaultValue: "예: 콩이, 서준이" })}
                value={newBabyName}
                onChange={(e) => setNewBabyName(e.target.value)}
                className="h-14 rounded-2xl border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 text-base px-4"
              />
            </div>

            {/* 생년월일 */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t("sleep-analysis:upload.baby.birthDate", { defaultValue: "생년월일" })} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={newBabyBirthDate}
                onChange={(e) => setNewBabyBirthDate(e.target.value)}
                max={today}
                className="h-14 rounded-2xl border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 text-base px-4"
              />
            </div>

            {/* 성별 */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                {t("sleep-analysis:upload.baby.gender", { defaultValue: "성별" })} <span className="text-gray-400">({t("common:optional", { defaultValue: "선택" })})</span>
              </Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewBabyGender("male")}
                  className={cn(
                    "flex-1 h-14 rounded-2xl border-2 font-medium transition-all flex items-center justify-center gap-2",
                    newBabyGender === "male"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  )}
                >
                  <span className="text-xl">👦</span>
                  <span>{t("sleep-analysis:upload.baby.male", { defaultValue: "남아" })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewBabyGender("female")}
                  className={cn(
                    "flex-1 h-14 rounded-2xl border-2 font-medium transition-all flex items-center justify-center gap-2",
                    newBabyGender === "female"
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  )}
                >
                  <span className="text-xl">👧</span>
                  <span>{t("sleep-analysis:upload.baby.female", { defaultValue: "여아" })}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== STEP 3: 연락처 ===== */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            isPhoneReady
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-500"
          )}>
            {isPhoneReady ? <Check className="w-4 h-4" /> : "2"}
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{t("sleep-analysis:upload.contact", { defaultValue: "연락처" })}</h3>
        </div>

        <div className="space-y-4">
          {/* 전화번호 */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FF6B35]" />
              {t("sleep-analysis:upload.phone", { defaultValue: "전화번호" })} <span className="text-red-500">*</span>
            </Label>
            <Input
              type="tel"
              placeholder="010-0000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
              maxLength={13}
              className="h-14 rounded-2xl border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 text-base px-4"
            />
            <p className="text-xs text-gray-500 mt-2">{t("sleep-analysis:upload.phoneHint", { defaultValue: "분석 결과 안내를 위해 필요합니다" })}</p>
          </div>

          {/* 인스타그램 ID */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              {t("sleep-analysis:upload.instagram", { defaultValue: "인스타그램" })} <span className="text-gray-400">({t("common:optional", { defaultValue: "선택" })})</span>
            </Label>
            <Input
              type="text"
              placeholder="@instagram_id"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              className="h-14 rounded-2xl border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 text-base px-4"
            />
          </div>
        </div>
      </div>

      {/* ===== Error Message ===== */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ===== Privacy Agreement ===== */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            id="privacy-agree"
            checked={privacyAgreed}
            onCheckedChange={(checked) => setPrivacyAgreed(checked === true)}
            className="mt-0.5 w-5 h-5 rounded-md border-gray-300 dark:border-gray-600 data-[state=checked]:bg-[#FF6B35] data-[state=checked]:border-[#FF6B35]"
          />
          <div className="text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">{t("sleep-analysis:upload.privacyAgree", { defaultValue: "개인정보 수집 동의" })}</span>
            <span className="text-red-500 ml-1">*</span>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs leading-relaxed">
              {t("sleep-analysis:upload.privacyDescription", { defaultValue: "업로드된 사진은 분석 용도로만 사용되며, 연락처로 결과를 안내해드립니다." })}
            </p>
          </div>
        </label>
      </div>

      {/* ===== Submit Button ===== */}
      <div className="pt-2 pb-4">
        <Button
          onClick={handleSubmit}
          disabled={!imageBase64 || !privacyAgreed || isLoading}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-lg transition-all",
            imageBase64 && privacyAgreed
              ? "bg-gradient-to-r from-[#FF6B35] to-[#FF8F65] hover:from-[#FF5722] hover:to-[#FF6B35] text-white shadow-lg shadow-orange-200 dark:shadow-none"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
          )}
          size="lg"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t("sleep-analysis:upload.analyzing")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {t("sleep-analysis:hub.startButton")}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
