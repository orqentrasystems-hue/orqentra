function readEnv(name) {
  return (process.env[name] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export function getSupabaseUrl() {
  const raw = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!raw) {
    return "";
  }

  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  }
}

export function getSupabaseAnonKey() {
  return (
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  );
}
