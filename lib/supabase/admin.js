import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

export function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
