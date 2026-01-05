/**
 * A/S 신청 폼 컴포넌트
 */

import { useState } from "react";
import { Form } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import FormErrors from "~/core/components/form-error";

import { AS_REQUEST_TYPES, formatPhoneNumber } from "../lib/customer.shared";

// Helper wrapper for FormErrors
const FormError = ({ children }: { children: string }) => (
  <FormErrors errors={[children]} />
);

interface AsRequestFormProps {
  defaultContactName?: string;
  error?: string;
}

export function AsRequestForm({ defaultContactName, error }: AsRequestFormProps) {
  const [requestType, setRequestType] = useState("repair");
  const [contactPhone, setContactPhone] = useState("");

  return (
    <Form method="post">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">A/S 신청서</CardTitle>
          <CardDescription>신청 내용을 작성해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <FormError>{error}</FormError>}

          {/* 신청 유형 */}
          <div className="space-y-3">
            <Label>신청 유형</Label>
            <RadioGroup
              name="requestType"
              value={requestType}
              onValueChange={setRequestType}
            >
              {AS_REQUEST_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {type.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 증상/문의 내용 */}
          <div className="space-y-2">
            <Label htmlFor="issueDescription">
              {requestType === "inquiry" ? "문의 내용" : "증상 설명"} *
            </Label>
            <Textarea
              id="issueDescription"
              name="issueDescription"
              placeholder={
                requestType === "inquiry"
                  ? "문의하실 내용을 자세히 적어주세요"
                  : "제품의 문제 증상을 자세히 설명해주세요"
              }
              rows={4}
              required
            />
          </div>

          {/* 연락처 정보 */}
          <div className="space-y-4">
            <h4 className="font-medium">연락처 정보</h4>

            <div className="space-y-2">
              <Label htmlFor="contactName">이름 *</Label>
              <Input
                id="contactName"
                name="contactName"
                placeholder="이름"
                defaultValue={defaultContactName || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">연락처 *</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="010-1234-5678"
                value={contactPhone}
                onChange={(e) => setContactPhone(formatPhoneNumber(e.target.value))}
                maxLength={13}
                required
              />
            </div>

            {(requestType === "repair" || requestType === "exchange") && (
              <div className="space-y-2">
                <Label htmlFor="contactAddress">
                  수거/배송 주소 {requestType === "repair" ? "(수리 시)" : "*"}
                </Label>
                <Input
                  id="contactAddress"
                  name="contactAddress"
                  placeholder="주소를 입력해주세요"
                  required={requestType === "exchange"}
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            A/S 신청하기
          </Button>
        </CardContent>
      </Card>
    </Form>
  );
}
