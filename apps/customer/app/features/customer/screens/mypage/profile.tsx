/**
 * 내 정보 변경 화면 (새로운 디자인)
 * - 여러 아이 프로필 관리 지원
 */
import type { Route } from "./+types/profile";

import { useState, useEffect } from "react";
import { data, useActionData, Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { useTranslation } from "react-i18next";
import { formatPhoneNumber } from "~/core/lib/formatters";
import { 
  ArrowLeft, 
  User, 
  Lock,
  Baby,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Pencil,
  X
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/core/components/ui/radio-group";
import makeServerClient from "~/core/lib/supa-client.server";

// 아이 프로필 타입
interface BabyProfile {
  id: string;
  name: string;
  birth_date: string;
  gender: string;
}

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
  
  // baby_profiles에서 아이 목록 가져오기
  const { data: babies } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  
  return data({
    user: {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name || "",
      phone: profile?.phone || "",
    },
    babies: babies || [],
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
  
  // 아이 추가
  if (actionType === "addBaby") {
    const babyName = formData.get("babyName") as string;
    const babyBirthDate = formData.get("babyBirthDate") as string;
    const babyGender = formData.get("babyGender") as string;
    
    if (!babyName) {
      return data({ success: false, error: "아이 이름을 입력해주세요.", actionType });
    }
    
    const { error } = await supabase
      .from("baby_profiles")
      .insert({
        user_id: user.id,
        name: babyName,
        birth_date: babyBirthDate || null,
        gender: babyGender || null,
      });
      
    if (error) {
      return data({ success: false, error: "아이 정보 추가에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: `${babyName} 정보가 등록되었습니다! 🎉`, actionType });
  }
  
  // 아이 수정
  if (actionType === "editBaby") {
    const babyId = formData.get("babyId") as string;
    const babyName = formData.get("babyName") as string;
    const babyBirthDate = formData.get("babyBirthDate") as string;
    const babyGender = formData.get("babyGender") as string;
    
    if (!babyName) {
      return data({ success: false, error: "아이 이름을 입력해주세요.", actionType, babyId });
    }
    
    const { error } = await supabase
      .from("baby_profiles")
      .update({
        name: babyName,
        birth_date: babyBirthDate || null,
        gender: babyGender || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", babyId)
      .eq("user_id", user.id);
      
    if (error) {
      return data({ success: false, error: "아이 정보 수정에 실패했습니다.", actionType, babyId });
    }
    
    return data({ success: true, message: `${babyName} 정보가 수정되었습니다!`, actionType, babyId });
  }
  
  // 아이 삭제
  if (actionType === "deleteBaby") {
    const babyId = formData.get("babyId") as string;
    
    const { error } = await supabase
      .from("baby_profiles")
      .delete()
      .eq("id", babyId)
      .eq("user_id", user.id);
      
    if (error) {
      return data({ success: false, error: "아이 정보 삭제에 실패했습니다.", actionType });
    }
    
    return data({ success: true, message: "아이 정보가 삭제되었습니다.", actionType });
  }
  
  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function ProfileScreen() {
  const { user, babies } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { t } = useTranslation(["customer", "common"]);
  
  // 폼 상태
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // 아이 추가 모드
  const [isAddingBaby, setIsAddingBaby] = useState(false);
  const [newBabyName, setNewBabyName] = useState("");
  const [newBabyBirthDate, setNewBabyBirthDate] = useState("");
  const [newBabyGender, setNewBabyGender] = useState("");
  
  // 아이 편집 모드 (편집 중인 아이 ID)
  const [editingBabyId, setEditingBabyId] = useState<string | null>(null);
  const [editBabyName, setEditBabyName] = useState("");
  const [editBabyBirthDate, setEditBabyBirthDate] = useState("");
  const [editBabyGender, setEditBabyGender] = useState("");
  
  // 성공/에러 메시지
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [babyMessage, setBabyMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  
  // 액션 결과 처리
  useEffect(() => {
    if (actionData) {
      const actionResult = actionData as { success: boolean; message?: string; error?: string; actionType?: string; babyId?: string };
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
      } else if (actionResult.actionType === "addBaby" || actionResult.actionType === "editBaby" || actionResult.actionType === "deleteBaby") {
        setBabyMessage(message);
        if (actionResult.success) {
          setIsAddingBaby(false);
          setEditingBabyId(null);
          setNewBabyName("");
          setNewBabyBirthDate("");
          setNewBabyGender("");
        }
      }
      
      setTimeout(() => {
        setProfileMessage(null);
        setPasswordMessage(null);
        setBabyMessage(null);
      }, 3000);
    }
  }, [actionData]);

  // 아이 편집 시작
  const startEditBaby = (baby: BabyProfile) => {
    setEditingBabyId(baby.id);
    setEditBabyName(baby.name || "");
    setEditBabyBirthDate(baby.birth_date || "");
    setEditBabyGender(baby.gender || "");
  };

  // 아이 편집 취소
  const cancelEditBaby = () => {
    setEditingBabyId(null);
    setEditBabyName("");
    setEditBabyBirthDate("");
    setEditBabyGender("");
  };

  // 아이 나이 계산
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "";
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

    if (months < 1) return t("customer:profile.baby.newborn");
    if (months < 12) return t("customer:profile.baby.monthsOld", { count: months });
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return t("customer:profile.baby.yearsOld", { count: years });
    return t("customer:profile.baby.yearsMonthsOld", { years, months: remainingMonths });
  };

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
          <h1 className="text-2xl font-bold text-gray-900">{t("customer:profile.title")}</h1>
        </div>

        <div className="space-y-6">
        {/* 기본 정보 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{t("customer:profile.basicInfo.title")}</h2>
                <p className="text-sm text-gray-500">{t("customer:profile.basicInfo.description")}</p>
              </div>
            </div>
            
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="profile" />
              
              {profileMessage && (
                <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
                  profileMessage.type === "success" 
                    ? "bg-green-50 text-green-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {profileMessage.type === "success" && <Check className="w-4 h-4" />}
                  {profileMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">{t("customer:profile.email")}</Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-500"
                />
                <p className="text-xs text-gray-400">{t("customer:profile.emailCannotChange")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">{t("customer:profile.name")}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("common:form.placeholder.name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">{t("customer:profile.phone")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formatPhoneNumber(phone)}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  maxLength={13}
                  className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                disabled={isSubmitting}
              >
                <Check className="mr-2 h-4 w-4" />
                {t("customer:profile.saveBasicInfo")}
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
                <h2 className="font-semibold text-gray-900">{t("customer:profile.password")}</h2>
                <p className="text-sm text-gray-500">{t("customer:profile.passwordDescription")}</p>
              </div>
            </div>
            
            <Form method="post" className="space-y-4">
              <input type="hidden" name="actionType" value="password" />
              
              {passwordMessage && (
                <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
                  passwordMessage.type === "success" 
                    ? "bg-green-50 text-green-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {passwordMessage.type === "success" && <Check className="w-4 h-4" />}
                  {passwordMessage.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">{t("customer:profile.newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder={t("customer:profile.passwordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 pr-12 text-gray-900 bg-white focus:border-[#FF6B35] focus:ring-[#FF6B35]"
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
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">{t("customer:profile.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t("customer:profile.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gray-800 hover:bg-gray-700 text-white"
                disabled={!newPassword || newPassword !== confirmPassword || isSubmitting}
              >
                <Lock className="mr-2 h-4 w-4" />
                {t("customer:profile.password")}
              </Button>
            </Form>
          </div>

        {/* 아이 정보 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Baby className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{t("customer:profile.baby.title")}</h2>
                  <p className="text-sm text-gray-500">{t("customer:profile.baby.description")}</p>
                </div>
              </div>
              {!isAddingBaby && babies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingBaby(true)}
                  className="flex items-center gap-1 text-sm text-[#FF6B35] hover:text-[#FF6B35]/80 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t("customer:profile.baby.add")}
                </button>
              )}
            </div>
              
              {babyMessage && (
              <div className={`p-4 rounded-xl text-sm mb-4 flex items-center gap-2 ${
                  babyMessage.type === "success" 
                  ? "bg-green-50 text-green-700" 
                  : "bg-red-50 text-red-700"
                }`}>
                {babyMessage.type === "success" && <Check className="w-4 h-4" />}
                  {babyMessage.text}
                </div>
              )}
              
            {/* 등록된 아이 목록 */}
            {babies.length > 0 && (
              <div className="space-y-3 mb-4">
                {(babies as BabyProfile[]).map((baby, index) => (
                  <div key={baby.id}>
                    {editingBabyId === baby.id ? (
                      /* 편집 모드 */
                      <Form method="post" className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                        <input type="hidden" name="actionType" value="editBaby" />
                        <input type="hidden" name="babyId" value={baby.id} />
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-pink-700">
                            {t("customer:profile.baby.ordinal", { index: index + 1 })} {t("customer:profile.baby.editing")}
                          </span>
                          <button
                            type="button"
                            onClick={cancelEditBaby}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                <Input
                  name="babyName"
                            placeholder={t("customer:profile.baby.namePlaceholder")}
                            value={editBabyName}
                            onChange={(e) => setEditBabyName(e.target.value)}
                            className="h-10 rounded-lg border-pink-200 text-gray-900 bg-white"
                          />
                          <Input
                            name="babyBirthDate"
                            type="date"
                            value={editBabyBirthDate}
                            onChange={(e) => setEditBabyBirthDate(e.target.value)}
                            className="h-10 rounded-lg border-pink-200 text-gray-900 bg-white"
                          />
                          <RadioGroup
                            value={editBabyGender}
                            onValueChange={setEditBabyGender}
                            className="flex gap-4"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="male" />
                              <span className="text-sm text-gray-700">{t("customer:profile.baby.male")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="female" />
                              <span className="text-sm text-gray-700">{t("customer:profile.baby.female")}</span>
                            </label>
                          </RadioGroup>
                          <input type="hidden" name="babyGender" value={editBabyGender} />
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEditBaby}
                            className="flex-1 h-10 rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400"
                          >
                            {t("common:buttons.cancel")}
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 h-10 rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                            disabled={!editBabyName || isSubmitting}
                          >
                            {t("common:buttons.save")}
                          </Button>
                        </div>
                      </Form>
                    ) : (
                      /* 뷰 모드 */
                      <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200">
                              <span className="text-lg">
                                {baby.gender === "male" ? "👦" : baby.gender === "female" ? "👧" : "👶"}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{baby.name}</span>
                                <span className="text-xs bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full">
                                  {t("customer:profile.baby.ordinal", { index: index + 1 })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {baby.gender === "male" ? t("customer:profile.baby.male") : baby.gender === "female" ? t("customer:profile.baby.female") : ""}
                                {baby.birth_date && baby.gender && " · "}
                                {baby.birth_date && calculateAge(baby.birth_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditBaby(baby)}
                              className="p-2 text-gray-400 hover:text-[#FF6B35] transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <Form method="post" className="inline">
                              <input type="hidden" name="actionType" value="deleteBaby" />
                              <input type="hidden" name="babyId" value={baby.id} />
                              <button
                                type="submit"
                                onClick={(e) => {
                                  if (!confirm(t("customer:profile.baby.confirmDelete", { name: baby.name }))) {
                                    e.preventDefault();
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Form>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* 아이 추가 폼 */}
            {(isAddingBaby || babies.length === 0) && (
              <Form method="post" className="space-y-4">
                <input type="hidden" name="actionType" value="addBaby" />
                
                {babies.length === 0 && !isAddingBaby && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Baby className="w-8 h-8 text-pink-300" />
                    </div>
                    <p className="text-gray-500 mb-4">{t("customer:profile.baby.noBabies")}</p>
                    <Button
                      type="button"
                      onClick={() => setIsAddingBaby(true)}
                      className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("customer:profile.baby.register")}
                    </Button>
                  </div>
                )}
                
                {(isAddingBaby || (babies.length === 0 && isAddingBaby)) && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {t("customer:profile.baby.ordinal", { index: babies.length + 1 })} {t("customer:profile.baby.registering")}
                      </span>
                      {babies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingBaby(false);
                            setNewBabyName("");
                            setNewBabyBirthDate("");
                            setNewBabyGender("");
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        {t("customer:profile.baby.name")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        name="babyName"
                        placeholder={t("customer:profile.baby.namePlaceholderExample")}
                        value={newBabyName}
                        onChange={(e) => setNewBabyName(e.target.value)}
                        required
                        className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t("customer:profile.baby.birthDate")} ({t("common:form.optional")})</Label>
                <Input
                  name="babyBirthDate"
                  type="date"
                        value={newBabyBirthDate}
                        onChange={(e) => setNewBabyBirthDate(e.target.value)}
                        className="h-12 rounded-xl border-gray-200 text-gray-900 bg-white focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </div>

              <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">{t("customer:profile.baby.gender")} ({t("common:form.optional")})</Label>
                <RadioGroup
                        value={newBabyGender}
                        onValueChange={setNewBabyGender}
                  className="flex gap-4"
                >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="male" />
                          <span className="text-gray-700">{t("customer:profile.baby.male")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="female" />
                          <span className="text-gray-700">{t("customer:profile.baby.female")}</span>
                        </label>
                </RadioGroup>
                      <input type="hidden" name="babyGender" value={newBabyGender} />
              </div>
              
                    <div className="flex gap-3">
                      {babies.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingBaby(false);
                            setNewBabyName("");
                            setNewBabyBirthDate("");
                            setNewBabyGender("");
                          }}
                          className="flex-1 h-12 rounded-xl border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400"
                        >
                          {t("common:buttons.cancel")}
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className={`${babies.length > 0 ? "flex-1" : "w-full"} h-12 rounded-xl bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white`}
                        disabled={!newBabyName || isSubmitting}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {t("customer:profile.baby.register")}
                      </Button>
                    </div>
                  </>
                )}
            </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
