/**
 * 회원 관리 - 회원 상세정보
 *
 * 기능:
 * - 회원 기본 정보 조회
 * - 보증서, 수면분석 등 연관 데이터 확인
 * - 회원 삭제
 */
import type { Route } from "./+types/member-detail";

import { useState } from "react";
import { Form, Link, redirect, useSubmit } from "react-router";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BabyIcon,
  CalendarIcon,
  CheckIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Separator } from "~/core/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import makeServerClient from "~/core/lib/supa-client.server";

import {
  getCurrentUserRole,
  getMemberDetail,
  changeMemberRole,
  changeApprovalStatus,
  deleteMember,
} from "../lib/members.server";
import {
  formatDateLong,
  calculateAge,
  getSleepSensitivityLabel,
  getGenderLabel,
} from "../lib/members.shared";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const { id } = params;
  const adminClient = createAdminClient();

  // 현재 로그인한 사용자 정보 가져오기
  const [client] = makeServerClient(request);
  const { data: { user: currentUser } } = await client.auth.getUser();

  // 현재 사용자 역할 확인
  const currentUserRole = await getCurrentUserRole(client, adminClient);

  // 회원 상세 정보 조회
  const memberDetail = await getMemberDetail(adminClient, id);

  return {
    ...memberDetail,
    currentUserRole,
    currentUserId: currentUser?.id,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // 현재 사용자 권한 확인
  const [client] = makeServerClient(request);

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const currentUserRole = await getCurrentUserRole(client, adminClient);

  // 역할 변경 (최고관리자만 가능)
  if (intent === "change_role") {
    if (currentUserRole !== "super_admin") {
      return { error: "최고관리자만 권한을 변경할 수 있습니다" };
    }

    const newRole = formData.get("role") as string;
    const { id } = params;

    return changeMemberRole(adminClient, id, newRole);
  }

  // 승인 상태 변경 (관리자 이상 가능)
  if (intent === "change_approval") {
    if (currentUserRole !== "super_admin" && currentUserRole !== "admin") {
      return { error: "관리자만 승인 상태를 변경할 수 있습니다" };
    }

    const newStatus = formData.get("approval_status") as string;
    const { id } = params;

    return changeApprovalStatus(adminClient, id, newStatus);
  }

  if (intent === "delete") {
    const { id } = params;

    try {
      const result = await deleteMember(adminClient, id);

      if (result.success) {
        // 삭제 성공 후 목록으로 리다이렉트
        throw redirect("/dashboard/members?deleted=true");
      }

      return result;
    } catch (err: any) {
      if (err instanceof Response) throw err; // redirect는 그대로 throw
      console.error("회원 삭제 중 오류:", err);
      return { error: `삭제 실패: ${err.message || "알 수 없는 오류"}` };
    }
  }

  return { error: "알 수 없는 요청입니다" };
}

export default function MemberDetailPage({ loaderData, actionData }: Route.ComponentProps) {
  const {
    member,
    warranties,
    warrantyCount,
    sleepAnalyses,
    sleepCount,
    babyProfiles,
    reviewSubmissions,
    reviewCount,
    currentUserRole,
    currentUserId,
  } = loaderData;

  const submit = useSubmit();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const isSuperAdmin = currentUserRole === "super_admin";
  const isCurrentUser = currentUserId === member.id;

  const handleRoleChange = (newRole: string) => {
    if (!confirm(`역할을 "${newRole === 'admin' ? '관리자' : newRole === 'accountant' ? '회계담당' : '고객'}"(으)로 변경하시겠습니까?`)) return;
    
    const formData = new FormData();
    formData.append("intent", "change_role");
    formData.append("role", newRole);
    submit(formData, { method: "post" });
  };

  const handleApprovalChange = (newStatus: string) => {
    if (!confirm(`승인 상태를 "${newStatus === 'approved' ? '승인' : newStatus === 'pending' ? '대기' : '거절'}"(으)로 변경하시겠습니까?`)) return;
    
    const formData = new FormData();
    formData.append("intent", "change_approval");
    formData.append("approval_status", newStatus);
    submit(formData, { method: "post" });
  };

  const handleDeleteConfirm = () => {
    const formData = new FormData();
    formData.append("intent", "delete");
    submit(formData, { method: "post" });
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-purple-600">최고관리자</Badge>;
      case "admin":
        return <Badge variant="destructive">관리자</Badge>;
      case "accountant":
        return <Badge variant="secondary">회계담당</Badge>;
      default:
        return <Badge variant="outline">고객</Badge>;
    }
  };
  
  const getApprovalBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">승인됨</Badge>;
      case "pending":
        return <Badge variant="secondary">대기중</Badge>;
      case "rejected":
        return <Badge variant="destructive">거절됨</Badge>;
      default:
        return <Badge variant="outline">{status || "미정"}</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">승인</Badge>;
      case "pending":
        return <Badge variant="secondary">대기중</Badge>;
      case "rejected":
        return <Badge variant="destructive">거절</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (months < 12) {
      return `${months}개월`;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}세 ${remainingMonths}개월` : `${years}세`;
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/members">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">회원 상세정보</h1>
            <p className="text-muted-foreground mt-1">
              회원 ID: {member.id}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2Icon className="h-4 w-4 mr-2" />
          회원 삭제
        </Button>
      </div>

      {/* 알림 메시지 */}
      {actionData?.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangleIcon className="h-4 w-4" />
          {actionData.error}
        </div>
      )}
      {actionData?.success && (
        <div className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckIcon className="h-4 w-4" />
          {actionData.message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 프로필 이미지 */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {member.kakao_profile_image || member.naver_profile_image ? (
                  <img
                    src={member.kakao_profile_image || member.naver_profile_image || ""}
                    alt={member.name || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xl font-semibold">{member.name || "-"}</p>
                {getRoleBadge(member.role)}
              </div>
            </div>

            <Separator />

            {/* 연락처 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <span>{member.email || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <span>{member.phone || "-"}</span>
              </div>
              {member.address && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{member.address}</p>
                    {member.address_detail && <p>{member.address_detail}</p>}
                    {member.zipcode && <p className="text-sm text-muted-foreground">({member.zipcode})</p>}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 소셜 로그인 */}
            <div>
              <p className="text-sm font-medium mb-2">소셜 계정</p>
              <div className="flex gap-2 flex-wrap">
                {member.kakao_id && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    카카오 연동
                  </Badge>
                )}
                {member.naver_id && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    네이버 연동
                  </Badge>
                )}
                {!member.kakao_id && !member.naver_id && (
                  <span className="text-sm text-muted-foreground">연동된 소셜 계정 없음</span>
                )}
              </div>
            </div>

            <Separator />

            {/* 가입/활동 정보 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">가입일</span>
                <span>{formatDate(member.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">마지막 로그인</span>
                <span>{formatDate(member.last_login_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">보유 포인트</span>
                <span className="font-medium">{(member.points ?? 0).toLocaleString()}P</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">추천인 코드</span>
                <span className="font-mono text-xs">{member.referral_code || "-"}</span>
              </div>
            </div>

            {/* 권한 관리 (최고관리자만 표시) */}
            {isSuperAdmin && !isCurrentUser && member.role !== "super_admin" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">권한 관리</span>
                  </div>
                  
                  {/* 역할 변경 */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">회원 역할</label>
                    <Select
                      defaultValue={member.role || "customer"}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">고객</SelectItem>
                        <SelectItem value="accountant">회계담당</SelectItem>
                        <SelectItem value="admin">관리자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 승인 상태 변경 */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">승인 상태</label>
                    <div className="flex items-center gap-2">
                      {getApprovalBadge(member.approval_status)}
                      <Select
                        defaultValue={member.approval_status || "pending"}
                        onValueChange={handleApprovalChange}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">대기</SelectItem>
                          <SelectItem value="approved">승인</SelectItem>
                          <SelectItem value="rejected">거절</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 아기 프로필 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BabyIcon className="h-5 w-5" />
              아기 프로필
            </CardTitle>
            <CardDescription>등록된 아기 정보</CardDescription>
          </CardHeader>
          <CardContent>
            {babyProfiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">등록된 아기가 없습니다</p>
            ) : (
              <div className="space-y-4">
                {babyProfiles.map((baby) => (
                  <div key={baby.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{baby.name || "이름 미등록"}</p>
                        <p className="text-sm text-muted-foreground">
                          {baby.gender === "male" ? "남아" : baby.gender === "female" ? "여아" : ""}
                          {baby.birth_date && ` · ${calculateAge(baby.birth_date)}`}
                        </p>
                      </div>
                      {baby.sleep_sensitivity && (
                        <Badge variant="outline">
                          수면 민감도: {baby.sleep_sensitivity === "high" ? "예민" : baby.sleep_sensitivity === "low" ? "잘 잠" : "보통"}
                        </Badge>
                      )}
                    </div>
                    {baby.birth_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        생년월일: {new Date(baby.birth_date).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 보증서 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5" />
                보증서
              </span>
              <Badge variant="secondary">{warrantyCount}건</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warranties.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">등록된 보증서가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {warranties.map((warranty) => (
                  <Link
                    key={warranty.id}
                    to={`/dashboard/warranty/${warranty.id}`}
                    className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{warranty.product_name || "-"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{warranty.warranty_number}</p>
                      </div>
                      {getStatusBadge(warranty.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(warranty.created_at)}
                    </p>
                  </Link>
                ))}
                {warrantyCount > 5 && (
                  <p className="text-sm text-center text-muted-foreground">
                    외 {warrantyCount - 5}건 더 있음
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 후기 참여 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                후기 참여
              </span>
              <Badge variant="secondary">{reviewCount}건</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewSubmissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">참여한 후기가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {reviewSubmissions.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline">{review.review_type}</Badge>
                      </div>
                      {getStatusBadge(review.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              회원 삭제
            </DialogTitle>
            <DialogDescription>
              정말로 이 회원을 삭제하시겠습니까?
              <br />
              <strong className="text-foreground">
                {member.name || member.email || "알 수 없음"}
              </strong>
              <br /><br />
              <span className="text-destructive font-medium">
                ⚠️ 이 작업은 되돌릴 수 없습니다!
              </span>
              <br />
              해당 회원의 다음 데이터가 모두 삭제됩니다:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>보증서 {warrantyCount}건</li>
                <li>수면분석 {sleepCount}건</li>
                <li>아기 프로필 {babyProfiles.length}건</li>
                <li>후기 참여 {reviewCount}건</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

