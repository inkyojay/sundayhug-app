/**
 * Upload Form Component
 *
 * Handles image upload with drag and drop support and baby information input.
 */
import { Baby, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "~/core/components/ui/button";
import { Card, CardContent } from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { cn } from "~/core/lib/utils";

export interface UploadFormData {
  imageBase64: string;
  imageMimeType: string;
  imagePreview: string;
  birthDate: string;
  phoneNumber?: string;
  instagramId?: string;
}

interface UploadFormProps {
  onSubmit: (data: UploadFormData) => void;
  isLoading?: boolean;
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
      // Remove data URL prefix to get raw base64
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function UploadForm({ onSubmit, isLoading = false }: UploadFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [instagramId, setInstagramId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setError(null);
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
      setError("분석할 이미지를 선택해주세요.");
      return;
    }
    if (!birthDate) {
      setError("아기의 생년월일을 입력해주세요.");
      return;
    }

    onSubmit({
      imageBase64,
      imageMimeType,
      imagePreview,
      birthDate,
      phoneNumber: phoneNumber || undefined,
      instagramId: instagramId || undefined,
    });
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="pt-6">
        {/* Image Upload Area */}
        <label
          htmlFor="image-upload"
          className={cn(
            "block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            "border-muted-foreground/25 hover:border-primary hover:bg-muted/50",
            imagePreview && "border-primary bg-muted/30"
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
            <img
              src={imagePreview}
              alt="Preview"
              className="mx-auto max-h-60 rounded-lg pointer-events-none"
            />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center pointer-events-none">
              <Upload className="mb-4 h-12 w-12" />
              <p className="font-semibold">
                이미지를 드래그 앤 드롭하거나 클릭하여 업로드하세요
              </p>
              <p className="text-sm">아기가 자고 있는 환경 사진을 올려주세요</p>
            </div>
          )}
        </label>

        {/* Form Fields */}
        <div className="mt-6 space-y-4">
          {/* Birth Date */}
          <div>
            <Label htmlFor="birthdate" className="flex items-center gap-2">
              <Baby className="text-muted-foreground h-5 w-5" />
              아기 생년월일 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              id="birthdate"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={today}
              className="mt-2"
              required
            />
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              📞 전화번호 (선택사항)
            </Label>
            <Input
              type="tel"
              id="phone"
              placeholder="010-1234-5678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Instagram ID (Optional) */}
          <div>
            <Label htmlFor="instagram" className="flex items-center gap-2">
              📸 인스타그램 ID (선택사항)
            </Label>
            <Input
              type="text"
              id="instagram"
              placeholder="@your_instagram_id"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 text-destructive mt-4 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!imageBase64 || !birthDate || isLoading}
          className="mt-8 w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              분석 중...
            </>
          ) : (
            "수면 환경 분석하기"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

