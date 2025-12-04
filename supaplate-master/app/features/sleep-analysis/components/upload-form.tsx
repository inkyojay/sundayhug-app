/**
 * Upload Form Component
 *
 * Handles image upload with drag and drop support and baby information input.
 */
import { Baby, Upload, Check, Camera, AlertCircle, ChevronDown, Plus } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";

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

// 예시 이미지 가이드
const photoGuides = [
  {
    emoji: "✅",
    title: "좋은 예시",
    items: [
      "아기 침대 전체가 보이는 사진",
      "아기가 자고 있는 모습",
      "수면 공간이 보이는 사진",
    ],
  },
  {
    emoji: "❌",
    title: "분석 불가",
    items: [
      "수면 환경이 아닌 사진",
      "너무 어둡거나 흐린 사진",
      "스크린샷, 문서 사진",
    ],
  },
];

export function UploadForm({ 
  onSubmit, 
  isLoading = false, 
  defaultPhoneNumber = "",
  babies = [],
  isLoggedIn = false,
}: UploadFormProps) {
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
  const [showGuide, setShowGuide] = useState(true);

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
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setError(null);
    setShowGuide(false);
    setImagePreview(URL.createObjectURL(file));
    setImageMimeType(file.type);

    try {
      const base64 = await toBase64(file);
      setImageBase64(base64);
    } catch {
      setError("이미지를 처리하는 중 오류가 발생했습니다.");
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
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
      setError("분석할 사진을 선택해주세요.");
      return;
    }
    
    if (isAddingNewBaby) {
      if (!newBabyName) {
        setError("아이 이름을 입력해주세요.");
        return;
      }
      if (!newBabyBirthDate) {
        setError("아이 생년월일을 입력해주세요.");
        return;
      }
    } else {
      if (!selectedBabyId) {
        setError("분석할 아이를 선택해주세요.");
        return;
      }
    }
    
    if (!phoneNumber) {
      setError("전화번호를 입력해주세요.");
      return;
    }
    if (!privacyAgreed) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
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
    setShowGuide(true);
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
    
    if (months < 1) return "신생아";
    if (months < 12) return `${months}개월`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years}세`;
    return `${years}세 ${remainingMonths}개월`;
  };

  return (
    <div className="space-y-6">
      {/* 사진 가이드 */}
      {showGuide && !imagePreview && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">어떤 사진을 올려야 하나요?</h3>
          </div>
          <div className="flex gap-4">
            {photoGuides.map((guide) => (
              <div key={guide.title} className="flex-1 space-y-1.5">
                <p className={`font-medium text-xs ${guide.emoji === "✅" ? "text-green-700" : "text-red-700"}`}>
                  {guide.emoji} {guide.title}
                </p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {guide.items.map((item, i) => (
                    <li key={i} className="leading-tight">• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload Area */}
      <div>
        <label
          htmlFor="image-upload"
          className={cn(
            "block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
            "border-gray-300 hover:border-[#FF6B35] hover:bg-orange-50/50",
            imagePreview && "border-[#FF6B35] bg-orange-50/30"
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="sr-only"
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="mx-auto max-h-60 rounded-xl pointer-events-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  resetImage();
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="text-gray-500 flex flex-col items-center pointer-events-none">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                📷 사진 촬영 또는 앨범에서 선택
              </p>
              <p className="text-sm text-gray-500">
                탭하여 아기 수면 환경 사진을 올려주세요
              </p>
            </div>
          )}
        </label>
      </div>

      {/* 아이 정보 섹션 */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-gray-700 font-medium">
          <Baby className="text-[#FF6B35] h-5 w-5" />
          아이 정보 <span className="text-red-500">*</span>
        </Label>
        
        {/* 등록된 아이가 있는 경우 - 선택 또는 새로 추가 */}
        {babies.length > 0 && (
          <div className="space-y-3">
            {/* 아이 선택 */}
            {!isAddingNewBaby && (
              <div className="space-y-2">
                {babies.map((baby) => (
                  <button
                    key={baby.id}
                    type="button"
                    onClick={() => setSelectedBabyId(baby.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all",
                      selectedBabyId === baby.id
                        ? "border-[#FF6B35] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">
                          {baby.gender === "male" ? "👦" : baby.gender === "female" ? "👧" : "👶"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{baby.name}</p>
                        <p className="text-sm text-gray-500">
                          {baby.gender === "male" ? "남아" : baby.gender === "female" ? "여아" : ""} 
                          {baby.birth_date && ` · ${calculateAge(baby.birth_date)}`}
                        </p>
                      </div>
                      {selectedBabyId === baby.id && (
                        <Check className="w-5 h-5 text-[#FF6B35]" />
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
                  className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  새 아이 정보로 분석
                </button>
              </div>
            )}
            
            {/* 새 아이 입력 모드 (기존 아이가 있는 경우) */}
            {isAddingNewBaby && (
              <div className="space-y-4 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">새 아이 정보 입력</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewBaby(false);
                      setNewBabyName("");
                      setNewBabyBirthDate("");
                      setNewBabyGender("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    취소
                  </button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">아이 이름 또는 별명 <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="예: 콩이, 서준이"
                    value={newBabyName}
                    onChange={(e) => setNewBabyName(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">생년월일 <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={newBabyBirthDate}
                    onChange={(e) => setNewBabyBirthDate(e.target.value)}
                    max={today}
                    className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">성별 (선택)</Label>
                  <RadioGroup
                    value={newBabyGender}
                    onValueChange={setNewBabyGender}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="male" className="border-gray-800 text-gray-900 data-[state=checked]:border-[#FF6B35] data-[state=checked]:text-[#FF6B35]" />
                      <span className="text-gray-900">남아</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="female" className="border-gray-800 text-gray-900 data-[state=checked]:border-[#FF6B35] data-[state=checked]:text-[#FF6B35]" />
                      <span className="text-gray-900">여아</span>
                    </label>
                  </RadioGroup>
                </div>
                
                {isLoggedIn && (
                  <p className="text-xs text-gray-500">
                    💡 입력한 정보는 내 프로필에 저장됩니다
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 등록된 아이가 없는 경우 - 바로 입력 폼 */}
        {babies.length === 0 && (
          <div className="space-y-4 bg-pink-50 rounded-xl p-4 border border-pink-200">
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-pink-600" />
              <p className="font-medium text-gray-900">아이 정보 입력</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">아이 이름 또는 별명 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="예: 콩이, 서준이"
                value={newBabyName}
                onChange={(e) => setNewBabyName(e.target.value)}
                className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">생년월일 <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={newBabyBirthDate}
                onChange={(e) => setNewBabyBirthDate(e.target.value)}
                max={today}
                className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">성별 (선택)</Label>
              <RadioGroup
                value={newBabyGender}
                onValueChange={setNewBabyGender}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="male" className="border-gray-800 text-gray-900 data-[state=checked]:border-[#FF6B35] data-[state=checked]:text-[#FF6B35]" />
                  <span className="text-gray-900">남아</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="female" className="border-gray-800 text-gray-900 data-[state=checked]:border-[#FF6B35] data-[state=checked]:text-[#FF6B35]" />
                  <span className="text-gray-900">여아</span>
                </label>
              </RadioGroup>
            </div>
            
            {isLoggedIn && (
              <p className="text-xs text-gray-500">
                💡 입력한 정보는 내 프로필에 저장되어 다음에도 사용할 수 있어요
              </p>
            )}
          </div>
        )}
      </div>

      {/* Phone Number (Required) */}
      <div>
        <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700 font-medium">
          📞 전화번호 <span className="text-red-500">*</span>
        </Label>
        <Input
          type="tel"
          id="phone"
          placeholder="010-1234-5678"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
          maxLength={13}
          className="mt-2 h-12 rounded-xl border-gray-200 text-gray-900 bg-white"
          required
        />
        <p className="text-xs text-gray-500 mt-1">분석 결과 안내를 위해 필요합니다</p>
      </div>

      {/* Instagram ID (Optional) */}
      <div>
        <Label htmlFor="instagram" className="flex items-center gap-2 text-gray-700 font-medium">
          📸 인스타그램 ID (선택)
        </Label>
        <Input
          type="text"
          id="instagram"
          placeholder="@your_instagram_id"
          value={instagramId}
          onChange={(e) => setInstagramId(e.target.value)}
          className="mt-2 h-12 rounded-xl border-gray-200 text-gray-900 bg-white"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!imageBase64 || !privacyAgreed || isLoading}
        className="w-full h-14 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-lg disabled:opacity-50"
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            분석 중...
          </>
        ) : (
          "수면 환경 분석하기"
        )}
      </Button>

      {/* Privacy Agreement */}
      <div className="bg-gray-100 rounded-xl p-4 border border-gray-300">
        <div className="flex items-start gap-3">
          <Checkbox 
            id="privacy-agree" 
            checked={privacyAgreed}
            onCheckedChange={(checked) => setPrivacyAgreed(checked === true)}
            className="mt-0.5 border-gray-400 data-[state=checked]:bg-[#FF6B35] data-[state=checked]:border-[#FF6B35]"
          />
          <label htmlFor="privacy-agree" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
            <span className="font-semibold text-gray-900">개인정보 수집 및 이용 동의</span>
            <span className="text-red-500 ml-1">*</span>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>• 업로드된 사진은 <strong className="text-gray-800 dark:text-gray-200">분석 사용 용도로만 이용됩니다</strong></li>
              <li>• 수집된 전화번호로 분석 결과를 안내해드립니다</li>
              <li>• 아이 정보와 전화번호는 내 프로필에 저장됩니다</li>
            </ul>
          </label>
        </div>
      </div>
    </div>
  );
}
