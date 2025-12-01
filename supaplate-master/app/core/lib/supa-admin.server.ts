/**
 * Supabase Admin Client (Service Role)
 * 
 * RLS를 우회하는 관리자용 클라이언트
 * ⚠️ 서버 사이드에서만 사용할 것!
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "database.types";

/**
 * RLS를 우회하는 Supabase Admin 클라이언트 생성
 * Service Role Key 사용 - 서버에서만 사용
 */
export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}


