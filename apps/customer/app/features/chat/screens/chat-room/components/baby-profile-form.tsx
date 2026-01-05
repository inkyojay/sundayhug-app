/**
 * Baby Profile Form Component
 */
import { Link } from "react-router";
import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "~/core/components/ui/button";

interface BabyProfileFormProps {
  babyName: string;
  birthDate: string;
  feedingType: string;
  onBabyNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onFeedingTypeChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function BabyProfileForm({
  babyName,
  birthDate,
  feedingType,
  onBabyNameChange,
  onBirthDateChange,
  onFeedingTypeChange,
  onSubmit,
  isSubmitting,
}: BabyProfileFormProps) {
  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0]">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link
          to="/customer/chat"
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="font-bold text-gray-900">AI 육아 상담</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">아기 정보 등록</h2>
            <p className="text-gray-500 text-sm">맞춤형 상담을 위해 아기 정보를 알려주세요</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                아기 이름 (선택)
              </label>
              <input
                type="text"
                value={babyName}
                onChange={(e) => onBabyNameChange(e.target.value)}
                placeholder="예: 콩이"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생년월일 *</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => onBirthDateChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수유 방식 (선택)
              </label>
              <select
                value={feedingType}
                onChange={(e) => onFeedingTypeChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none bg-white"
              >
                <option value="">선택해주세요</option>
                <option value="breast">모유</option>
                <option value="formula">분유</option>
                <option value="mixed">혼합</option>
              </select>
            </div>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl font-medium"
            >
              {isSubmitting ? "저장 중..." : "상담 시작하기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
