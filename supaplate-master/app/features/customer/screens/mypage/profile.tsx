/**
 * 내 정보 변경 화면 (새로운 디자인)
 */
import type { Route } from "./+types/profile";

import { useState, useEffect } from "react";
import { data, useActionData, Form, Link, redirect, useLoaderData } from "react-router";
import { 
  ArrowLeft, 
  User, 
  Lock,
  Baby,
  Check,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "내 정보 변경 | 썬데이허그" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw redirect("/customer/login");
  }
  
  // profiles에서 추가 정보 가져오기
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  
  return data({
    user: {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name || "",
      phone: profile?.phone || "",
      babyName: profile?.baby_name || "",
      babyBirthDate: profile?.baby_birth_date || "",
      babyGender: profile?.baby_gender || "",
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return data({ success: false, error: "로그인이 필요합니다." });
  }
  
  // 기본 정보 수정
  if (actionType === "profile") {
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        phone: phone?.replace(/-/g, ""),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);
      
    if (error) {
      return data({ success: false, error: "정보 수정에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: "기본 정보가 수정되었습니다.", actionType });
  }
  
  // 비밀번호 변경
  if (actionType === "password") {
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (newPassword.length < 6) {
      return data({ success: false, error: "비밀번호는 6자 이상이어야 합니다.", actionType });
    }
    
    if (newPassword !== confirmPassword) {
      return data({ success: false, error: "새 비밀번호가 일치하지 않습니다.", actionType });
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
      
    if (error) {
      return data({ success: false, error: "비밀번호 변경에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: "비밀번호가 변경되었습니다.", actionType });
  }
  
  // 아이 정보 수정
  if (actionType === "baby") {
    const babyName = formData.get("babyName") as string;
    const babyBirthDate = formData.get("babyBirthDate") as string;
    const babyGender = formData.get("babyGender") as string;
    
    const { error } = await supabase
      .from("profiles")
      .update({
        baby_name: babyName || null,
        baby_birth_date: babyBirthDate || null,
        baby_gender: babyGender || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);
      
    if (error) {
      return data({ success: false, error: "아이 정보 수정에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: "아이 정보가 수정되었습니다.", actionType });
  }
  
  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function ProfileScreen() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  // 폼 상태
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [babyName, setBabyName] = useState(user.babyName);
  const [babyBirthDate, setBabyBirthDate] = useState(user.babyBirthDate);
  const [babyGender, setBabyGender] = useState(user.babyGender);
  
  // 성공/에러 메시지
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [babyMessage, setBabyMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 액션 결과 처리
  useEffect(() => {
    if (actionData) {
      const actionResult = actionData as { success: boolean; message?: string; error?: string; actionType?: string };
      const message = {
        type: actionResult.success ? "success" as const : "error" as const,
        text: actionResult.success ? actionResult.message || "" : actionResult.error || ""
      };
      
      if (actionResult.actionType === "profile") {
        setProfileMessage(message);
      } else if (actionResult.actionType === "password") {
        setPasswordMessage(message);
        if (actionResult.success) {
          setNewPassword("");
          setConfirmPassword("");
        }
      } else if (actionResult.actionType === "baby") {
        setBabyMessage(message);
      }
      
      setTimeout(() => {
        setProfileMessage(null);
        setPasswordMessage(null);
        setBabyMessage(null);
      }, 3000);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer/mypage"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">내 정보 변경</h1>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">기본 정보</h2>
                <p className="text-sm text-gray-500">이름, 전화번호를 수정할 수 있습니다</p>
              </div>
            </div>
            
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="profile" />
              
              {profileMessage && (
                <div className={`p-4 rounded-xl text-sm ${
                  profileMessage.type === "success" 
                    ? "bg-green-50 text-green-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {profileMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">이메일</Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="h-12 rounded-xl bg-gray-50 border-gray-200"
                />
                <p className="text-xs text-gray-400">이메일은 변경할 수 없습니다</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">이름</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">전화번호</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formatPhoneNumber(phone)}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  maxLength={13}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90"
              >
                <Check className="mr-2 h-4 w-4" />
                기본 정보 저장
              </Button>
            </Form>
          </div>

          {/* 비밀번호 변경 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">비밀번호 변경</h2>
                <p className="text-sm text-gray-500">새로운 비밀번호를 설정하세요</p>
              </div>
            </div>
            
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="password" />
              
              {passwordMessage && (
                <div className={`p-4 rounded-xl text-sm ${
                  passwordMessage.type === "success" 
                    ? "bg-green-50 text-green-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {passwordMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="6자 이상"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 pr-12 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">새 비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="새 비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>
              
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                disabled={!newPassword || newPassword !== confirmPassword}
              >
                <Lock className="mr-2 h-4 w-4" />
                비밀번호 변경
              </Button>
            </Form>
          </div>

          {/* 아이 정보 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Baby className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">아이 정보</h2>
                <p className="text-sm text-gray-500">수면 분석 등에 활용되는 정보입니다</p>
              </div>
            </div>
            
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="baby" />
              
              {babyMessage && (
                <div className={`p-4 rounded-xl text-sm ${
                  babyMessage.type === "success" 
                    ? "bg-green-50 text-green-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {babyMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="babyName" className="text-sm font-medium text-gray-700">아이 이름 (선택)</Label>
                <Input
                  id="babyName"
                  name="babyName"
                  placeholder="아이 이름"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="babyBirthDate" className="text-sm font-medium text-gray-700">생년월일 (선택)</Label>
                <Input
                  id="babyBirthDate"
                  name="babyBirthDate"
                  type="date"
                  value={babyBirthDate}
                  onChange={(e) => setBabyBirthDate(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">성별 (선택)</Label>
                <RadioGroup
                  value={babyGender}
                  onValueChange={setBabyGender}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="male" id="male" />
                    <span className="text-gray-700">남아</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="female" id="female" />
                    <span className="text-gray-700">여아</span>
                  </label>
                </RadioGroup>
                <input type="hidden" name="babyGender" value={babyGender} />
              </div>
              
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Baby className="mr-2 h-4 w-4" />
                아이 정보 저장
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
