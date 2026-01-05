/**
 * A/S 신청 페이지
 */
import type { Route } from "./+types/as-request";

import { data, redirect, useNavigate, useParams, useActionData } from "react-router";
import { ArrowLeftIcon, WrenchIcon } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

import {
  getCurrentUser,
  getWarrantyById,
  createAsRequest,
} from "../lib/customer.server";
import {
  EmptyStateCard,
  SuccessCard,
  ProductInfoCard,
  AsRequestForm,
  InfoCard,
} from "../components";

export function meta(): Route.MetaDescriptors {
  return [{ title: "A/S 신청 | 썬데이허그" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { warrantyId } = params;
  const [supabase] = makeServerClient(request);

  // 로그인 체크
  const user = await getCurrentUser(supabase);
  if (!user) {
    throw redirect("/customer/login");
  }

  if (!warrantyId) {
    return data({ warranty: null });
  }

  // 해당 user의 보증서인지 확인
  const warranty = await getWarrantyById(supabase, warrantyId, user.id);
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

  if (
    !warrantyId ||
    !requestType ||
    !issueDescription ||
    !contactName ||
    !contactPhone
  ) {
    return data({ success: false, error: "필수 항목을 모두 입력해주세요." });
  }

  const [supabase] = makeServerClient(request);

  const result = await createAsRequest(supabase, {
    warrantyId,
    requestType,
    issueDescription,
    contactName,
    contactPhone,
    contactAddress,
  });

  return data(result);
}

export default function AsRequestScreen({ loaderData }: Route.ComponentProps) {
  const { warranty } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const params = useParams();

  if (!warranty) {
    return (
      <EmptyStateCard
        icon={WrenchIcon}
        message="보증서를 찾을 수 없습니다"
        buttonLabel="내 보증서 확인하기"
        onButtonClick={() => navigate("/customer/mypage/warranties")}
      />
    );
  }

  if (actionData?.success) {
    return (
      <SuccessCard
        title="A/S 신청 완료"
        message={`신청이 접수되었습니다.\n담당자가 확인 후 연락드리겠습니다.`}
        actions={[
          {
            label: "A/S 이력 확인",
            onClick: () => navigate("/customer/mypage/as"),
          },
          {
            label: "마이페이지로 이동",
            onClick: () => navigate("/customer/mypage"),
            variant: "outline",
          },
        ]}
      />
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
            onClick={() =>
              navigate(`/customer/mypage/warranty/${params.warrantyId}`)
            }
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">A/S 신청</h1>
        </div>

        {/* 제품 정보 */}
        <ProductInfoCard
          productName={warranty.product_name}
          productOption={warranty.product_option}
          warrantyNumber={warranty.warranty_number}
        />

        {/* 신청 폼 */}
        <AsRequestForm
          defaultContactName={warranty.customer_name || ""}
          error={
            actionData && !actionData.success && "error" in actionData
              ? actionData.error
              : undefined
          }
        />

        {/* 안내 사항 */}
        <InfoCard
          items={[
            "A/S 신청 후 영업일 기준 1-2일 내 연락드립니다.",
            "수리/교환 시 제품 상태에 따라 처리 기간이 다를 수 있습니다.",
            "보증기간 내 품질 보증 사유인 경우 무상 A/S가 가능합니다.",
          ]}
        />
      </div>
    </div>
  );
}

