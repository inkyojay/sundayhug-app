/**
 * Supabase Admin Client Module
 *
 * 내부 활용 버전 - SERVICE_ROLE_KEY가 없으면 ANON_KEY 사용
 * 
 * SECURITY WARNING: 프로덕션에서는 SERVICE_ROLE_KEY를 설정하는 것을 권장합니다.
 */
import type { Database } from "database.types";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client
 * SERVICE_ROLE_KEY가 있으면 admin 권한, 없으면 일반 권한
 */
const adminClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
);

export default adminClient;
