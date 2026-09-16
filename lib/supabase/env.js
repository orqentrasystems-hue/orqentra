function readEnv(name) {
  return process.env[name] ?? "";
}

export function getSupabaseUrl() {
  const raw = readEnv("NEXT_PUBLIC_SUPABASE_URL").trim();
  return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

export function getSupabaseAnonKey() {
  return readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY").trim();
}
