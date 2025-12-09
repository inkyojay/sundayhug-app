import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

/**
 * Creates a Supabase client for server-side operations with proper cookie handling
 */
export default function makeServerClient(
  request: Request,
): [SupabaseClient<Database>, Headers] {
  const headers = new Headers();

  const client = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        // @ts-ignore
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            ),
          );
        },
      },
    },
  );

  return [client, headers];
}


