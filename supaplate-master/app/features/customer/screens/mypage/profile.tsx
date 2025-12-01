/**
 * 내 정보 변경 화면
 * 
 * - 기본 정보 (이름, 이메일, 전화번호)
 * - 비밀번호 변경
 * - 아이 정보
 */
import type { Route } from "./+types/profile";

import { useEffect, useState } from "react";
import { data, useActionData, useNavigate, Form } from "react-router";
import { 
  ArrowLeftIcon, 
  UserIcon, 
  LockIcon,
  BabyIcon,
  CheckIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon
} from "lucide-react";
import bcrypt from "bcryptjs";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/core/components/ui/card";
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "내 정보 변경 | 썬데이허그" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const memberId = formData.get("memberId") as string;
  
  if (!memberId) {
    return data({ success: false, error: "회원 정보를 찾을 수 없습니다." });
  }
  
  const [supabase] = makeServerClient(request);
  
  // 기본 정보 수정
  if (actionType === "profile") {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    
    const { error } = await supabase
      .from("warranty_members")
      .update({
        name,
        email,
        phone: phone?.replace(/-/g, ""),
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId);
      
    if (error) {
      return data({ success: false, error: "정보 수정에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: "기본 정보가 수정되었습니다.", actionType, newName: name });
  }
  
  // 비밀번호 변경
  if (actionType === "password") {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const hasPassword = formData.get("hasPassword") === "true";
    
    if (newPassword.length < 6) {
      return data({ success: false, error: "비밀번호는 6자 이상이어야 합니다.", actionType });
    }
    
    if (newPassword !== confirmPassword) {
      return data({ success: false, error: "새 비밀번호가 일치하지 않습니다.", actionType });
    }
    
    // 기존 비밀번호 확인 (비밀번호가 설정된 경우에만)
    if (hasPassword) {
      const { data: member } = await supabase
        .from("warranty_members")
        .select("password_hash")
        .eq("id", memberId)
        .single();
        
      if (member?.password_hash) {
        const isValid = await bcrypt.compare(currentPassword || "", member.password_hash);
        if (!isValid) {
          return data({ success: false, error: "현재 비밀번호가 올바르지 않습니다.", actionType });
        }
      }
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const { error } = await supabase
      .from("warranty_members")
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId);
      
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
      .from("warranty_members")
      .update({
        baby_name: babyName || null,
        baby_birth_date: babyBirthDate || null,
        baby_gender: babyGender || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId);
      
    if (error) {
      return data({ success: false, error: "아이 정보 수정에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: "아이 정보가 수정되었습니다.", actionType });
  }
  
  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function ProfileScreen() {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  
  // 폼 상태
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [babyName, setBabyName] = useState("");
  const [babyBirthDate, setBabyBirthDate] = useState("");
  const [babyGender, setBabyGender] = useState("");
  
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

  // 로그인 체크 및 데이터 로드
  useEffect(() => {
    const id = localStorage.getItem("customerId");
    if (!id) {
      navigate("/customer/login");
      return;
    }
    setCustomerId(id);
    
    // 회원 정보 가져오기
    const fetchMember = async () => {
      try {
        const response = await fetch(`/api/customer/member?id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch member");
        }
        const { member } = await response.json();
        
        if (member) {
          setName(member.name || "");
          setEmail(member.email || "");
          setPhone(formatPhoneNumber(member.phone || ""));
          setBabyName(member.baby_name || "");
          setBabyBirthDate(member.baby_birth_date || "");
          setBabyGender(member.baby_gender || "");
          setHasPassword(!!member.password_hash);
        }
      } catch (error) {
        console.error("Failed to load member:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMember();
  }, [navigate]);
  
  // 액션 결과 처리
  useEffect(() => {
    if (actionData) {
      const message = {
        type: actionData.success ? "success" as const : "error" as const,
        text: actionData.success ? actionData.message || "" : actionData.error || ""
      };
      
      if (actionData.actionType === "profile") {
        setProfileMessage(message);
        if (actionData.success && "newName" in actionData && actionData.newName) {
          localStorage.setItem("customerName", actionData.newName);
        }
      } else if (actionData.actionType === "password") {
        setPasswordMessage(message);
        if (actionData.success) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setHasPassword(true);
        }
      } else if (actionData.actionType === "baby") {
        setBabyMessage(message);
      }
      
      // 3초 후 메시지 숨기기
      setTimeout(() => {
        setProfileMessage(null);
        setPasswordMessage(null);
        setBabyMessage(null);
      }, 3000);
    }
  }, [actionData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customer/mypage")}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">내 정보 변경</h1>
        </div>

        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="h-5 w-5 text-primary" />
              기본 정보
            </CardTitle>
            <CardDescription>이름, 이메일, 전화번호를 수정할 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="profile" />
              <input type="hidden" name="memberId" value={customerId} />
              
              {profileMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  profileMessage.type === "success" 
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" 
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}>
                  {profileMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  maxLength={13}
                />
              </div>
              
              <Button type="submit" className="w-full">
                <CheckIcon className="mr-2 h-4 w-4" />
                기본 정보 저장
              </Button>
            </Form>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockIcon className="h-5 w-5 text-orange-500" />
              비밀번호 {hasPassword ? "변경" : "설정"}
            </CardTitle>
            <CardDescription>
              {hasPassword 
                ? "현재 비밀번호를 입력 후 새 비밀번호를 설정하세요" 
                : "이메일 로그인을 위한 비밀번호를 설정하세요"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="password" />
              <input type="hidden" name="memberId" value={customerId} />
              <input type="hidden" name="hasPassword" value={hasPassword.toString()} />
              
              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  passwordMessage.type === "success" 
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" 
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}>
                  {passwordMessage.text}
                </div>
              )}
              
              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="현재 비밀번호"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="6자 이상"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="새 비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full"
                disabled={!newPassword || newPassword !== confirmPassword}
              >
                <LockIcon className="mr-2 h-4 w-4" />
                비밀번호 {hasPassword ? "변경" : "설정"}
              </Button>
            </Form>
          </CardContent>
        </Card>

        {/* 아이 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BabyIcon className="h-5 w-5 text-pink-500" />
              아이 정보
            </CardTitle>
            <CardDescription>수면 분석 등에 활용되는 아이 정보입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="baby" />
              <input type="hidden" name="memberId" value={customerId} />
              
              {babyMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  babyMessage.type === "success" 
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" 
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}>
                  {babyMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="babyName">아이 이름 (선택)</Label>
                <Input
                  id="babyName"
                  name="babyName"
                  placeholder="아이 이름"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="babyBirthDate">생년월일 (선택)</Label>
                <Input
                  id="babyBirthDate"
                  name="babyBirthDate"
                  type="date"
                  value={babyBirthDate}
                  onChange={(e) => setBabyBirthDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-3">
                <Label>성별 (선택)</Label>
                <RadioGroup
                  value={babyGender}
                  onValueChange={setBabyGender}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="font-normal cursor-pointer">남아</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="font-normal cursor-pointer">여아</Label>
                  </div>
                </RadioGroup>
                <input type="hidden" name="babyGender" value={babyGender} />
              </div>
              
              <Button type="submit" variant="outline" className="w-full">
                <BabyIcon className="mr-2 h-4 w-4" />
                아이 정보 저장
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
