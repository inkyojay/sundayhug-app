/**
 * 회원 관리 - 회원 목록
 * 
 * 기능:
 * - 가입 회원 목록 조회
 * - 검색 (이름, 전화번호, 이메일)
 * - 회원 상세 보기
 * - 회원 삭제
 */
import type { Route } from "./+types/member-list";

import { useState } from "react";
import { Form, Link, useSearchParams, useSubmit } from "react-router";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/core/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Badge } from "~/core/components/ui/badge";

// 서버 전용 모듈은 loader/action 내부에서 동적 import

export async function loader({ request }: Route.LoaderArgs) {
  const { default: makeServerClient } = await import("~/core/lib/supa-client.server");
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const [client, headers] = makeServerClient(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const approvalFilter = url.searchParams.get("approval") ?? "all";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Admin 클라이언트로 전체 회원 조회 (RLS 우회)
  const adminClient = createAdminClient();

  // 현재 로그인한 사용자 역할 확인
  const { data: { user: currentUser } } = await client.auth.getUser();
  let currentUserRole = null;
  if (currentUser) {
    const { data: currentProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    currentUserRole = currentProfile?.role;
  }

  let query = adminClient
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // 검색어가 있으면 필터 적용
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // 승인 상태 필터
  if (approvalFilter !== "all") {
    query = query.eq("approval_status", approvalFilter);
  }

  const { data: members, count, error } = await query;

  // 승인 대기 회원 수 (알림용)
  const { count: pendingCount } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");

  if (error) {
    console.error("회원 목록 조회 오류:", error);
  }

  return {
    members: members ?? [],
    total: count ?? 0,
    page,
    limit,
    search,
    approvalFilter,
    pendingCount: pendingCount ?? 0,
    currentUserRole,
    headers,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 빠른 승인 처리
  if (intent === "approve") {
    const userId = formData.get("userId") as string;
    const newRole = formData.get("role") as string || "admin";
    
    if (!userId) {
      return { error: "사용자 ID가 필요합니다" };
    }

    const { error } = await adminClient
      .from("profiles")
      .update({ 
        approval_status: "approved",
        role: newRole,
      })
      .eq("id", userId);

    if (error) {
      console.error("승인 처리 오류:", error);
      return { error: `승인 실패: ${error.message}` };
    }

    return { success: true, message: "회원이 승인되었습니다" };
  }

  // 거절 처리
  if (intent === "reject") {
    const userId = formData.get("userId") as string;
    
    if (!userId) {
      return { error: "사용자 ID가 필요합니다" };
    }

    const { error } = await adminClient
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", userId);

    if (error) {
      console.error("거절 처리 오류:", error);
      return { error: `거절 실패: ${error.message}` };
    }

    return { success: true, message: "회원이 거절되었습니다" };
  }

  if (intent === "delete") {
    const userId = formData.get("userId") as string;
    
    if (!userId) {
      return { error: "사용자 ID가 필요합니다" };
    }

    try {
      // 1. auth.users에서 먼저 삭제 (CASCADE 설정된 테이블은 자동 삭제)
      const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
      
      // auth 삭제 실패해도 일단 관련 데이터 정리 시도
      if (authError) {
        console.warn("auth.users 삭제 경고:", authError.message);
      }

      // 2. 관련 데이터 정리 (남아있을 수 있는 데이터)
      await adminClient.from("warranties").update({ user_id: null }).eq("user_id", userId);
      await adminClient.from("as_requests").update({ user_id: null }).eq("user_id", userId);
      await adminClient.from("sleep_analyses").update({ user_id: null }).eq("user_id", userId);
      await adminClient.from("review_submissions").update({ user_id: null }).eq("user_id", userId);
      await adminClient.from("blog_posts").update({ author_id: null }).eq("author_id", userId);
      
      // 삭제해야 하는 데이터
      await adminClient.from("baby_profiles").delete().eq("user_id", userId);
      await adminClient.from("point_transactions").delete().eq("user_id", userId);
      await adminClient.from("chat_feedback").delete().eq("user_id", userId);
      await adminClient.from("forecast_logs").delete().eq("user_id", userId);
      
      // 채팅 세션/메시지 삭제
      const { data: sessions } = await adminClient.from("chat_sessions").select("id").eq("user_id", userId);
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        await adminClient.from("chat_messages").delete().in("session_id", sessionIds);
      }
      await adminClient.from("chat_sessions").delete().eq("user_id", userId);
      
      // 3. profiles 삭제 (마지막에)
      await adminClient.from("profiles").delete().eq("id", userId);

      return { success: true, message: "회원이 삭제되었습니다" };
    } catch (err: any) {
      console.error("회원 삭제 중 오류:", err);
      // 삭제 중 일부 실패해도 성공으로 처리 (이미 삭제된 경우 등)
      return { success: true, message: "회원이 삭제되었습니다" };
    }
  }

  return { error: "알 수 없는 요청입니다" };
}

export default function MemberListPage({ loaderData, actionData }: Route.ComponentProps) {
  const { members, total, page, limit, search, approvalFilter, pendingCount, currentUserRole } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);

  const totalPages = Math.ceil(total / limit);
  const isSuperAdmin = currentUserRole === "super_admin";

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get("search") as string;
    setSearchParams({ search: searchValue, page: "1" });
  };

  const handleDeleteClick = (member: typeof members[0]) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedMember) {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("userId", selectedMember.id);
      submit(formData, { method: "post" });
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    }
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
        return <Badge className="bg-green-500 text-white">승인</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">대기</Badge>;
      case "rejected":
        return <Badge variant="destructive">거절</Badge>;
      default:
        return <Badge variant="outline">{status || "-"}</Badge>;
    }
  };

  const handleApprove = (member: typeof members[0]) => {
    if (!confirm(`${member.name || member.email}님을 관리자로 승인하시겠습니까?`)) return;
    
    const formData = new FormData();
    formData.append("intent", "approve");
    formData.append("userId", member.id);
    formData.append("role", "admin");
    submit(formData, { method: "post" });
  };

  const handleReject = (member: typeof members[0]) => {
    if (!confirm(`${member.name || member.email}님의 가입을 거절하시겠습니까?`)) return;
    
    const formData = new FormData();
    formData.append("intent", "reject");
    formData.append("userId", member.id);
    submit(formData, { method: "post" });
  };

  const handleFilterChange = (filter: string) => {
    setSearchParams({ search, approval: filter, page: "1" });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" />
            회원 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            총 {total}명의 회원이 있습니다
          </p>
        </div>
      </div>

      {/* 알림 메시지 */}
      {actionData?.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangleIcon className="h-4 w-4" />
          {actionData.error}
        </div>
      )}
      {actionData?.success && (
        <div className="bg-green-500/10 text-green-600 px-4 py-3 rounded-lg">
          {actionData.message}
        </div>
      )}

      {/* 승인 대기 알림 */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-lg flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              승인 대기 중인 회원이 {pendingCount}명 있습니다
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              가입 승인이 필요합니다
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => handleFilterChange("pending")}
          >
            확인하기
          </Button>
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="이름, 전화번호, 이메일로 검색..."
              defaultValue={search}
              className="pl-10"
            />
          </div>
          <Button type="submit">검색</Button>
        </form>
        
        {/* 승인 상태 필터 */}
        <div className="flex gap-2">
          <Button
            variant={approvalFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("all")}
          >
            전체
          </Button>
          <Button
            variant={approvalFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("pending")}
            className={approvalFilter !== "pending" && pendingCount > 0 ? "border-amber-300 text-amber-700" : ""}
          >
            대기 {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          <Button
            variant={approvalFilter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("approved")}
          >
            승인
          </Button>
          <Button
            variant={approvalFilter === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("rejected")}
          >
            거절
          </Button>
        </div>
      </div>

      {/* 회원 목록 테이블 */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>회원정보</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>승인상태</TableHead>
              <TableHead>소셜 로그인</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-10 w-10" />
                    <p>회원이 없습니다</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} className={member.approval_status === "pending" ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {member.kakao_profile_image || member.naver_profile_image ? (
                          <img
                            src={member.kakao_profile_image || member.naver_profile_image || ""}
                            alt={member.name || ""}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{member.email || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{member.phone || "-"}</p>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(member.role)}
                  </TableCell>
                  <TableCell>
                    {getApprovalBadge(member.approval_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {member.kakao_id && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          카카오
                        </Badge>
                      )}
                      {member.naver_id && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          네이버
                        </Badge>
                      )}
                      {!member.kakao_id && !member.naver_id && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{formatDate(member.created_at)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* 승인 대기 중인 경우 빠른 승인/거절 버튼 */}
                      {member.approval_status === "pending" && (isSuperAdmin || currentUserRole === "admin") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(member)}
                            title="승인"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(member)}
                            title="거절"
                          >
                            <AlertTriangleIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link to={`/dashboard/members/${member.id}`}>
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(member)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setSearchParams({ search, page: String(page - 1) })}
          >
            이전
          </Button>
          <span className="flex items-center px-3 text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setSearchParams({ search, page: String(page + 1) })}
          >
            다음
          </Button>
        </div>
      )}

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
                {selectedMember?.name || selectedMember?.email || "알 수 없음"}
              </strong>
              <br />
              <span className="text-destructive">
                이 작업은 되돌릴 수 없으며, 해당 회원의 모든 데이터가 삭제됩니다.
              </span>
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

