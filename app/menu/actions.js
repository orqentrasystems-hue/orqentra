"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function addUser(prevState, formData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { ok: false, message: "Username and password are required." };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: username,
      password,
      email_confirm: true,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "User added." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not add user.",
    };
  }
}
