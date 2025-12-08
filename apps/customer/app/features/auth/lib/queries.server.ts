/**
 * Authentication Database Queries
 *
 * Supabase client를 사용하도록 수정 (DATABASE_URL 불필요)
 */
import adminClient from "~/core/lib/supa-admin-client.server";

/**
 * 이메일로 사용자 존재 여부 확인
 *
 * @param email - 확인할 이메일 주소
 * @returns 사용자 존재 여부 (true/false)
 */
export async function doesUserExist(email: string) {
  const { data, error } = await adminClient
    .from("auth.users")
    .select("id")
    .eq("email", email)
    .limit(1);

  // auth.users 직접 접근이 안되면 false 반환 (새 사용자로 간주)
  if (error) {
    console.log("doesUserExist check skipped:", error.message);
    return false;
  }

  return data && data.length > 0;
}
