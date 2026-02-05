/**
 * 전화번호 인증 컴포넌트
 *
 * SMS OTP를 통한 전화번호 인증 UI.
 * 회원가입, 보증서 등록 등에서 재사용 가능.
 */
import { useState, useEffect, useRef } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { formatPhoneNumber } from "~/core/lib/formatters";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/core/components/ui/input-otp";

interface PhoneVerificationProps {
  initialPhone?: string;
  onVerified: (phone: string) => void;
  onError: (message: string) => void;
  onSuccess?: (message: string) => void;
  disabled?: boolean;
}

export function PhoneVerification({
  initialPhone = "",
  onVerified,
  onError,
  onSuccess,
  disabled = false,
}: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.replace(/-/g, "").length < 10) {
      onError("올바른 전화번호를 입력해주세요.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.replace(/-/g, "") }),
      });
      const result = await response.json();

      if (result.success) {
        setOtpSent(true);
        setCountdown(60);
        onSuccess?.("인증번호가 발송되었습니다.");
      } else {
        onError(result.error || "인증번호 발송에 실패했습니다.");
      }
    } catch {
      onError("인증번호 발송 중 오류가 발생했습니다.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      onError("인증번호 6자리를 입력해주세요.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch("/api/auth/phone/verify-otp-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/-/g, ""),
          otp: otpCode,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setPhoneVerified(true);
        onVerified(phoneNumber);
      } else {
        onError(result.error || "인증번호가 일치하지 않습니다.");
      }
    } catch {
      onError("인증 확인 중 오류가 발생했습니다.");
    } finally {
      setOtpLoading(false);
    }
  };

  if (phoneVerified) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">전화번호 *</Label>
        <div className="p-4 bg-green-50 rounded-2xl flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">
            {phoneNumber} 인증 완료
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
          전화번호 *
        </Label>
        <div className="flex gap-2">
          <Input
            id="phone"
            type="tel"
            placeholder="010-1234-5678"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(formatPhoneNumber(e.target.value));
              setPhoneVerified(false);
              setOtpSent(false);
              setOtpCode("");
            }}
            maxLength={13}
            disabled={disabled}
            className="flex-1 h-14 rounded-2xl border-gray-200 bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B35] focus:ring-[#FF6B35] disabled:bg-gray-100"
          />
          <Button
            type="button"
            onClick={handleSendOtp}
            disabled={
              otpLoading ||
              countdown > 0 ||
              phoneNumber.replace(/-/g, "").length < 10
            }
            className="h-14 px-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-sm whitespace-nowrap disabled:opacity-50"
          >
            {otpLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : countdown > 0 ? (
              `${countdown}초`
            ) : otpSent ? (
              "재발송"
            ) : (
              "인증번호 발송"
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          전화번호는 A/S 신청, 알림톡 발송 등에 사용됩니다.
        </p>
      </div>

      {otpSent && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            인증번호 입력
          </Label>
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(value) => setOtpCode(value)}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-14 w-12 rounded-xl border-gray-200 bg-white text-xl text-gray-900"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpCode.length !== 6}
              className="w-full h-14 rounded-2xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-medium text-base disabled:opacity-50"
            >
              {otpLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "인증번호 확인"
              )}
            </Button>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">
              인증번호가 오지 않았나요?
            </p>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading || countdown > 0}
              className="text-sm text-[#FF6B35] font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {countdown > 0
                ? `${countdown}초 후 재발송 가능`
                : "인증번호 다시 보내기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
