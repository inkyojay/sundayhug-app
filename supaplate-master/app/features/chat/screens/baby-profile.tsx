/**
 * 아기 프로필 등록/수정
 */
import type { Route } from "./+types/baby-profile";

import { Link, useLoaderData, useNavigate, data, Form, useActionData } from "react-router";
import { ArrowLeft, Baby, Calendar, Milk } from "lucide-react";
import { useEffect } from "react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "~/core/components/ui/select";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "아기 정보 | 썬데이허그" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ profile: null });
  }

  const { data: profile } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data({ profile });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const birthDate = formData.get("birthDate") as string;
  const feedingType = formData.get("feedingType") as string;
  const notes = formData.get("notes") as string;

  if (!birthDate) {
    return data({ error: "생년월일은 필수입니다." });
  }

  // 기존 프로필 확인
  const { data: existing } = await supabase
    .from("baby_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const profileData = {
    user_id: user.id,
    name: name || null,
    birth_date: birthDate,
    feeding_type: feedingType || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from("baby_profiles")
      .update(profileData)
      .eq("id", existing.id);

    if (error) {
      return data({ error: "저장에 실패했습니다." });
    }
  } else {
    // 새로 생성
    const { error } = await supabase
      .from("baby_profiles")
      .insert(profileData);

    if (error) {
      return data({ error: "저장에 실패했습니다." });
    }
  }

  return data({ success: true });
}

export default function BabyProfileScreen() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success) {
      navigate("/customer/chat");
    }
  }, [actionData, navigate]);

  // 날짜 형식 변환 (yyyy-mm-dd)
  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-lg px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/chat"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile ? "아기 정보 수정" : "아기 정보 등록"}
            </h1>
            <p className="text-gray-500 text-sm">맞춤형 상담을 위해 정보를 입력해주세요</p>
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
            <Baby className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Form */}
        <Form method="post" className="space-y-6">
          {actionData?.error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              {actionData.error}
            </div>
          )}

          {/* 이름 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <Label htmlFor="name" className="text-gray-700 font-medium mb-2 block">
              아기 이름/별명
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={profile?.name || ""}
              placeholder="예: 콩이, 우리 아기"
              className="bg-gray-50 border-0"
            />
            <p className="text-xs text-gray-400 mt-2">선택사항이에요</p>
          </div>

          {/* 생년월일 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <Label htmlFor="birthDate" className="text-gray-700 font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF6B35]" />
              생년월일 *
            </Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              defaultValue={formatDate(profile?.birth_date)}
              className="bg-gray-50 border-0"
            />
            <p className="text-xs text-gray-400 mt-2">월령에 맞는 상담을 제공해드려요</p>
          </div>

          {/* 수유 방식 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <Label className="text-gray-700 font-medium mb-2 flex items-center gap-2">
              <Milk className="w-4 h-4 text-[#FF6B35]" />
              수유 방식
            </Label>
            <Select name="feedingType" defaultValue={profile?.feeding_type || ""}>
              <SelectTrigger className="bg-gray-50 border-0">
                <SelectValue placeholder="선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breast">모유 수유</SelectItem>
                <SelectItem value="formula">분유 수유</SelectItem>
                <SelectItem value="mixed">혼합 수유</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 메모 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <Label htmlFor="notes" className="text-gray-700 font-medium mb-2 block">
              기타 메모
            </Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={profile?.notes || ""}
              placeholder="알레르기, 특이사항 등을 적어주세요"
              className="bg-gray-50 border-0 resize-none"
              rows={3}
            />
          </div>

          {/* 저장 버튼 */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-lg font-medium rounded-xl"
          >
            저장하기
          </Button>
        </Form>
      </div>
    </div>
  );
}

