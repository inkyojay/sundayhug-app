/**
 * Shipping Form Component
 */
import { Truck, MapPin, AlertCircle } from "lucide-react";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

interface ShippingFormProps {
  shippingName: string;
  shippingPhone: string;
  shippingZipcode: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  isAddressApiReady: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressDetailChange: (value: string) => void;
  onSearchAddress: () => void;
}

export function ShippingForm({
  shippingName,
  shippingPhone,
  shippingZipcode,
  shippingAddress,
  shippingAddressDetail,
  isAddressApiReady,
  onNameChange,
  onPhoneChange,
  onAddressDetailChange,
  onSearchAddress,
}: ShippingFormProps) {
  return (
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
              onChange={(e) => onNameChange(e.target.value)}
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
              onChange={(e) => onPhoneChange(e.target.value)}
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
              onClick={onSearchAddress}
              disabled={!isAddressApiReady}
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                padding: "0 20px",
                height: "48px",
                borderRadius: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                cursor: "pointer",
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
            onChange={(e) => onAddressDetailChange(e.target.value)}
            className="mt-2 h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            도로명 주소를 정확히 입력해 주세요. 주소 오류 인하여 재발송은 어렵습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
