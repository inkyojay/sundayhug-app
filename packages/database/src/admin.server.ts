import type { Database } from "./types";
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


