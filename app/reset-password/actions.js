"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getSiteUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(
    /\/+$/,
    "",
  );

  if (fromEnv) {
    return fromEnv;
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");

  if (!host) {
    return "";
  }

  const proto = headerStore.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function requestPasswordReset(prevState, formData) {
  const username = String(formData.get("username") ?? "").trim();

  if (!username) {
    return { ok: false, message: "Username is required." };
  }

  try {
    const siteUrl = await getSiteUrl();

    if (!siteUrl) {
      return { ok: false, message: "Could not determine the site URL." };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(username, {
      redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "If that account exists, a reset email has been sent.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not reset password.",
    };
  }
}

export async function updatePassword(prevState, formData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password) {
    return { ok: false, message: "Password is required." };
  }

  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { ok: false, message: error.message };
    }

    await supabase.auth.signOut();
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not update password.",
    };
  }

  redirect("/");
}
