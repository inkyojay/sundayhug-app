/**
 * A/S 신청 페이지
 */
import type { Route } from "./+types/as-request";

import { useState, useEffect } from "react";
import { data, useNavigate, useParams, useActionData, Form } from "react-router";
import { ArrowLeftIcon, Loader2Icon, CheckCircleIcon, WrenchIcon } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import FormErrors from "~/core/components/form-error";

// Helper wrapper for FormErrors
const FormError = ({ children }: { children: string }) => (
  <FormErrors errors={[children]} />
);
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "A/S 신청 | 썬데이허그" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { warrantyId } = params;
  
  if (!warrantyId) {
    return data({ warranty: null });
  }

  const [supabase] = makeServerClient(request);
  
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select("*")
    .eq("id", warrantyId)
    .single();

  if (error) {
    console.error("보증서 조회 오류:", error);
    return data({ warranty: null });
  }

  return data({ warranty });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { warrantyId } = params;
  const formData = await request.formData();
  
  const requestType = formData.get("requestType") as string;
  const issueDescription = formData.get("issueDescription") as string;
  const contactName = formData.get("contactName") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const contactAddress = formData.get("contactAddress") as string;

  if (!warrantyId || !requestType || !issueDescription || !contactName || !contactPhone) {
    return data({ success: false, error: "필수 항목을 모두 입력해주세요." });
  }

  const [supabase] = makeServerClient(request);

  // A/S 신청 저장
  const { data: asRequest, error } = await supabase
    .from("as_requests")
    .insert({
      warranty_id: warrantyId,
      request_type: requestType,
      issue_description: issueDescription,
      contact_name: contactName,
      contact_phone: contactPhone.replace(/-/g, ""),
      contact_address: contactAddress || null,
      status: "received",
    })
    .select()
    .single();

  if (error) {
    console.error("A/S 신청 오류:", error);
    return data({ success: false, error: "A/S 신청에 실패했습니다. 다시 시도해주세요." });
  }

  return data({ success: true, asRequestId: asRequest.id });
}

const requestTypes = [
  { value: "repair", label: "수리", description: "제품 고장/파손 수리" },
  { value: "exchange", label: "교환", description: "동일 제품으로 교환" },
  { value: "refund", label: "환불", description: "제품 반품 및 환불" },
  { value: "inquiry", label: "기타 문의", description: "기타 A/S 관련 문의" },
];

export default function AsRequestScreen({ loaderData }: Route.ComponentProps) {
  const { warranty } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const params = useParams();
  
  const [requestType, setRequestType] = useState("repair");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");
    if (!customerId) {
      navigate("/customer/login");
    }
  }, [navigate]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  if (!warranty) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <WrenchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">보증서를 찾을 수 없습니다</p>
            <Button 
              className="mt-4" 
              onClick={() => navigate("/customer/mypage/warranties")}
            >
              내 보증서 확인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">A/S 신청 완료</h2>
            <p className="text-muted-foreground mb-4">
              신청이 접수되었습니다.
              <br />
              담당자가 확인 후 연락드리겠습니다.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate("/customer/mypage/as")} className="w-full">
                A/S 이력 확인
              </Button>
              <Button variant="outline" onClick={() => navigate("/customer/mypage")} className="w-full">
                마이페이지로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/customer/mypage/warranty/${params.warrantyId}`)}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">A/S 신청</h1>
        </div>

        {/* 제품 정보 */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">신청 제품</p>
            <p className="font-medium">{warranty.product_name}</p>
            <p className="text-sm text-muted-foreground">{warranty.product_option}</p>
            <p className="text-xs text-muted-foreground mt-1">
              보증서: {warranty.warranty_number}
            </p>
          </CardContent>
        </Card>

        {/* 신청 폼 */}
        <Form method="post">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A/S 신청서</CardTitle>
              <CardDescription>신청 내용을 작성해주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {actionData && !actionData.success && "error" in actionData && (
                <FormError>{actionData.error}</FormError>
              )}

              {/* 신청 유형 */}
              <div className="space-y-3">
                <Label>신청 유형</Label>
                <RadioGroup 
                  name="requestType" 
                  value={requestType} 
                  onValueChange={setRequestType}
                >
                  {requestTypes.map((type) => (
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
                    defaultValue={warranty.customer_name || ""}
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

        {/* 안내 사항 */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">안내 사항</p>
            <ul className="list-disc list-inside space-y-1">
              <li>A/S 신청 후 영업일 기준 1-2일 내 연락드립니다.</li>
              <li>수리/교환 시 제품 상태에 따라 처리 기간이 다를 수 있습니다.</li>
              <li>보증기간 내 품질 보증 사유인 경우 무상 A/S가 가능합니다.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

