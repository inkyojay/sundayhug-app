/**
 * B2B 업체 등록/수정 폼
 */
import type { Route } from "./+types/b2b-customer-form";

import { BuildingIcon, ArrowLeftIcon, SaveIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useFetcher } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Switch } from "~/core/components/ui/switch";

import makeServerClient from "~/core/lib/supa-client.server";

// 국가 코드 목록
const countries = [
  { code: "KR", name: "한국" },
  { code: "US", name: "미국" },
  { code: "JP", name: "일본" },
  { code: "CN", name: "중국" },
  { code: "VN", name: "베트남" },
  { code: "TH", name: "태국" },
  { code: "SG", name: "싱가포르" },
  { code: "MY", name: "말레이시아" },
  { code: "ID", name: "인도네시아" },
  { code: "PH", name: "필리핀" },
  { code: "AU", name: "호주" },
  { code: "DE", name: "독일" },
  { code: "FR", name: "프랑스" },
  { code: "GB", name: "영국" },
  { code: "CA", name: "캐나다" },
];

// 통화 목록
const currencies = [
  { code: "KRW", name: "원 (KRW)" },
  { code: "USD", name: "달러 (USD)" },
  { code: "EUR", name: "유로 (EUR)" },
  { code: "JPY", name: "엔 (JPY)" },
  { code: "CNY", name: "위안 (CNY)" },
];

export const meta: Route.MetaFunction = ({ params }) => {
  return [{ title: params.id ? "업체 수정 | Sundayhug Admin" : "업체 등록 | Sundayhug Admin" }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { id } = params;

  if (id) {
    // 수정 모드: 기존 데이터 조회
    const { data: customer, error } = await supabase
      .from("b2b_customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !customer) {
      throw new Response("업체를 찾을 수 없습니다", { status: 404 });
    }

    return { customer, isEdit: true };
  }

  // 등록 모드: 새 업체 코드 생성
  const { count } = await supabase
    .from("b2b_customers")
    .select("*", { count: "exact", head: true });

  const newCode = `B2B-${String((count || 0) + 1).padStart(4, "0")}`;

  return { customer: null, isEdit: false, newCode };
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const { id } = params;

  const customerData = {
    customer_code: formData.get("customer_code") as string,
    company_name: formData.get("company_name") as string,
    company_name_en: (formData.get("company_name_en") as string) || null,
    business_type: formData.get("business_type") as string,
    country_code: formData.get("country_code") as string,
    business_registration_no: (formData.get("business_registration_no") as string) || null,
    representative_name: (formData.get("representative_name") as string) || null,
    contact_name: (formData.get("contact_name") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    contact_position: (formData.get("contact_position") as string) || null,
    address: (formData.get("address") as string) || null,
    address_en: (formData.get("address_en") as string) || null,
    shipping_address: (formData.get("shipping_address") as string) || null,
    shipping_address_en: (formData.get("shipping_address_en") as string) || null,
    payment_terms: (formData.get("payment_terms") as string) || null,
    currency: formData.get("currency") as string,
    notes: (formData.get("notes") as string) || null,
    is_active: formData.get("is_active") === "true",
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // 수정
    const { error } = await supabase
      .from("b2b_customers")
      .update(customerData)
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "업체 정보가 수정되었습니다." };
  } else {
    // 등록
    const { error } = await supabase
      .from("b2b_customers")
      .insert(customerData);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "업체가 등록되었습니다.", redirect: true };
  }
}

export default function B2BCustomerForm({ loaderData }: Route.ComponentProps) {
  const { customer, isEdit, newCode } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [formData, setFormData] = useState({
    customer_code: customer?.customer_code || newCode || "",
    company_name: customer?.company_name || "",
    company_name_en: customer?.company_name_en || "",
    business_type: customer?.business_type || "domestic",
    country_code: customer?.country_code || "KR",
    business_registration_no: customer?.business_registration_no || "",
    representative_name: customer?.representative_name || "",
    contact_name: customer?.contact_name || "",
    contact_phone: customer?.contact_phone || "",
    contact_email: customer?.contact_email || "",
    contact_position: customer?.contact_position || "",
    address: customer?.address || "",
    address_en: customer?.address_en || "",
    shipping_address: customer?.shipping_address || "",
    shipping_address_en: customer?.shipping_address_en || "",
    payment_terms: customer?.payment_terms || "",
    currency: customer?.currency || "KRW",
    notes: customer?.notes || "",
    is_active: customer?.is_active ?? true,
  });

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setMessage(`✅ ${fetcher.data.message}`);
        if (fetcher.data.redirect) {
          setTimeout(() => navigate("/dashboard/b2b/customers"), 1000);
        }
      } else {
        setMessage(`❌ ${fetcher.data.error}`);
      }
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetcher.data, fetcher.state]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // 국내/해외 변경 시 국가코드 및 통화 자동 설정
    if (field === "business_type") {
      if (value === "domestic") {
        setFormData((prev) => ({ ...prev, business_type: value, country_code: "KR", currency: "KRW" }));
      } else {
        setFormData((prev) => ({ ...prev, business_type: value, country_code: "US", currency: "USD" }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, String(value));
    });
    fetcher.submit(form, { method: "POST" });
  };

  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/b2b/customers">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              목록
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BuildingIcon className="h-6 w-6" />
              {isEdit ? "업체 수정" : "업체 등록"}
            </h1>
            <p className="text-gray-500">
              {isEdit ? customer?.company_name : "새 B2B 업체를 등록합니다"}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <SaveIcon className="h-4 w-4 mr-2" />
          {isSubmitting ? "저장 중..." : "저장"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>업체의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_code">업체 코드 *</Label>
                <Input
                  id="customer_code"
                  value={formData.customer_code}
                  onChange={(e) => handleChange("customer_code", e.target.value)}
                  placeholder="B2B-0001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_type">업체 유형 *</Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(v) => handleChange("business_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">국내</SelectItem>
                    <SelectItem value="overseas">해외</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">회사명 (국문) *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="회사명"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name_en">회사명 (영문)</Label>
              <Input
                id="company_name_en"
                value={formData.company_name_en}
                onChange={(e) => handleChange("company_name_en", e.target.value)}
                placeholder="Company Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country_code">국가</Label>
                <Select
                  value={formData.country_code}
                  onValueChange={(v) => handleChange("country_code", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">거래 통화</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => handleChange("currency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.business_type === "domestic" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_registration_no">사업자등록번호</Label>
                  <Input
                    id="business_registration_no"
                    value={formData.business_registration_no}
                    onChange={(e) => handleChange("business_registration_no", e.target.value)}
                    placeholder="000-00-00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representative_name">대표자명</Label>
                  <Input
                    id="representative_name"
                    value={formData.representative_name}
                    onChange={(e) => handleChange("representative_name", e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange("is_active", checked)}
              />
              <Label htmlFor="is_active">활성 상태</Label>
            </div>
          </CardContent>
        </Card>

        {/* 담당자 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>담당자 정보</CardTitle>
            <CardDescription>담당자 연락처를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">담당자명</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  placeholder="김담당"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_position">직함</Label>
                <Input
                  id="contact_position"
                  value={formData.contact_position}
                  onChange={(e) => handleChange("contact_position", e.target.value)}
                  placeholder="과장"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">연락처</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">이메일</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                placeholder="contact@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_terms">결제 조건</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => handleChange("payment_terms", e.target.value)}
                placeholder="예: 선불, 30일 후불, T/T 결제 등"
              />
            </div>
          </CardContent>
        </Card>

        {/* 주소 정보 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>주소 정보</CardTitle>
            <CardDescription>회사 주소 및 배송지 주소를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">회사 주소 (국문)</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="서울시 강남구..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_en">회사 주소 (영문)</Label>
                <Textarea
                  id="address_en"
                  value={formData.address_en}
                  onChange={(e) => handleChange("address_en", e.target.value)}
                  placeholder="123 Main Street..."
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipping_address">배송지 주소 (국문)</Label>
                <Textarea
                  id="shipping_address"
                  value={formData.shipping_address}
                  onChange={(e) => handleChange("shipping_address", e.target.value)}
                  placeholder="회사 주소와 다른 경우 입력"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_address_en">배송지 주소 (영문)</Label>
                <Textarea
                  id="shipping_address_en"
                  value={formData.shipping_address_en}
                  onChange={(e) => handleChange("shipping_address_en", e.target.value)}
                  placeholder="If different from company address"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">비고</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="특이사항, 메모 등"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
