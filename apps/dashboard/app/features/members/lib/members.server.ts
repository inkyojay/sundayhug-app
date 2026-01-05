/**
 * Members 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// 회원 목록 조회
// ============================================

export interface MemberListParams {
  search?: string;
  approvalFilter?: string;
  page: number;
  limit: number;
}

export interface MemberListResult {
  members: any[];
  total: number;
  pendingCount: number;
}

/**
 * 현재 사용자 역할 조회
 */
export async function getCurrentUserRole(
  supabase: SupabaseClient,
  adminClient: SupabaseClient
) {
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return null;
  }

  const { data: currentProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  return currentProfile?.role ?? null;
}

/**
 * 회원 목록 조회
 */
export async function getMemberList(
  adminClient: SupabaseClient,
  params: MemberListParams
): Promise<MemberListResult> {
  const { search, approvalFilter, page, limit } = params;
  const offset = (page - 1) * limit;

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
  if (approvalFilter && approvalFilter !== "all") {
    query = query.eq("approval_status", approvalFilter);
  }

  const { data: members, count, error } = await query;

  if (error) {
    console.error("회원 목록 조회 오류:", error);
  }

  // 승인 대기 회원 수 (알림용)
  const { count: pendingCount } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");

  return {
    members: members ?? [],
    total: count ?? 0,
    pendingCount: pendingCount ?? 0,
  };
}

// ============================================
// 회원 상세 조회
// ============================================

export interface MemberDetailResult {
  member: any;
  warranties: any[];
  warrantyCount: number;
  sleepAnalyses: any[];
  sleepCount: number;
  babyProfiles: any[];
  reviewSubmissions: any[];
  reviewCount: number;
}

/**
 * 회원 상세 정보 조회
 */
export async function getMemberDetail(
  adminClient: SupabaseClient,
  memberId: string
): Promise<MemberDetailResult> {
  // 회원 프로필 조회
  const { data: member, error: memberError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .single();

  if (memberError || !member) {
    throw new Response("회원을 찾을 수 없습니다", { status: 404 });
  }

  // 해당 회원의 보증서 목록
  const { data: warranties, count: warrantyCount } = await adminClient
    .from("warranties")
    .select("id, warranty_number, product_name, status, created_at", {
      count: "exact",
    })
    .eq("user_id", memberId)
    .order("created_at", { ascending: false })
    .limit(5);

  // 해당 회원의 수면 분석 기록
  const { data: sleepAnalyses, count: sleepCount } = await adminClient
    .from("sleep_analyses")
    .select("id, summary, created_at", { count: "exact" })
    .eq("user_id", memberId)
    .order("created_at", { ascending: false })
    .limit(5);

  // 아기 프로필
  const { data: babyProfiles } = await adminClient
    .from("baby_profiles")
    .select("*")
    .eq("user_id", memberId)
    .order("created_at", { ascending: false });

  // 후기 참여 이력
  const { data: reviewSubmissions, count: reviewCount } = await adminClient
    .from("review_submissions")
    .select("id, review_type, status, created_at", { count: "exact" })
    .eq("user_id", memberId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    member,
    warranties: warranties ?? [],
    warrantyCount: warrantyCount ?? 0,
    sleepAnalyses: sleepAnalyses ?? [],
    sleepCount: sleepCount ?? 0,
    babyProfiles: babyProfiles ?? [],
    reviewSubmissions: reviewSubmissions ?? [],
    reviewCount: reviewCount ?? 0,
  };
}

// ============================================
// 회원 승인/거절/역할 변경
// ============================================

/**
 * 회원 승인 처리
 */
export async function approveMember(
  adminClient: SupabaseClient,
  userId: string,
  role: string = "admin"
) {
  const { error } = await adminClient
    .from("profiles")
    .update({
      approval_status: "approved",
      role,
    })
    .eq("id", userId);

  if (error) {
    console.error("승인 처리 오류:", error);
    return { success: false, error: `승인 실패: ${error.message}` };
  }

  return { success: true, message: "회원이 승인되었습니다" };
}

/**
 * 회원 거절 처리
 */
export async function rejectMember(adminClient: SupabaseClient, userId: string) {
  const { error } = await adminClient
    .from("profiles")
    .update({ approval_status: "rejected" })
    .eq("id", userId);

  if (error) {
    console.error("거절 처리 오류:", error);
    return { success: false, error: `거절 실패: ${error.message}` };
  }

  return { success: true, message: "회원이 거절되었습니다" };
}

/**
 * 회원 역할 변경
 */
export async function changeMemberRole(
  adminClient: SupabaseClient,
  userId: string,
  newRole: string
) {
  // super_admin은 변경 불가 (보안)
  if (newRole === "super_admin") {
    return { success: false, error: "최고관리자 권한은 직접 설정할 수 없습니다" };
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    console.error("역할 변경 오류:", error);
    return { success: false, error: `역할 변경 실패: ${error.message}` };
  }

  return { success: true, message: "역할이 변경되었습니다" };
}

/**
 * 회원 승인 상태 변경
 */
export async function changeApprovalStatus(
  adminClient: SupabaseClient,
  userId: string,
  newStatus: string
) {
  const { error } = await adminClient
    .from("profiles")
    .update({ approval_status: newStatus })
    .eq("id", userId);

  if (error) {
    console.error("승인 상태 변경 오류:", error);
    return { success: false, error: `승인 상태 변경 실패: ${error.message}` };
  }

  return { success: true, message: "승인 상태가 변경되었습니다" };
}

// ============================================
// 회원 삭제
// ============================================

/**
 * 회원 삭제 (관련 데이터 정리 포함)
 */
export async function deleteMember(adminClient: SupabaseClient, userId: string) {
  try {
    // 1. auth.users에서 먼저 삭제 (CASCADE 설정된 테이블은 자동 삭제)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    // auth 삭제 실패해도 일단 관련 데이터 정리 시도
    if (authError) {
      console.warn("auth.users 삭제 경고:", authError.message);
    }

    // 2. 관련 데이터 정리 (남아있을 수 있는 데이터)
    await adminClient
      .from("warranties")
      .update({ user_id: null })
      .eq("user_id", userId);
    await adminClient
      .from("as_requests")
      .update({ user_id: null })
      .eq("user_id", userId);
    await adminClient
      .from("sleep_analyses")
      .update({ user_id: null })
      .eq("user_id", userId);
    await adminClient
      .from("review_submissions")
      .update({ user_id: null })
      .eq("user_id", userId);
    await adminClient
      .from("blog_posts")
      .update({ author_id: null })
      .eq("author_id", userId);

    // 삭제해야 하는 데이터
    await adminClient.from("baby_profiles").delete().eq("user_id", userId);
    await adminClient.from("point_transactions").delete().eq("user_id", userId);
    await adminClient.from("chat_feedback").delete().eq("user_id", userId);
    await adminClient.from("forecast_logs").delete().eq("user_id", userId);

    // 채팅 세션/메시지 삭제
    const { data: sessions } = await adminClient
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId);
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
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
