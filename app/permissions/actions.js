"use server";

import { cookies } from "next/headers";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

function toInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const text = String(value ?? "").trim();
  return /^-?\d+$/.test(text) ? Number(text) : NaN;
}

export async function savePermissions(prevState, formData) {
  const userId = toInteger(formData.get("userId"));
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName || allowedPage !== "permissions") {
    return { ok: false, message: "Open Permissions from the app menu." };
  }

  if (!Number.isInteger(userId) || userId === 0) {
    return { ok: false, message: "Select a user." };
  }

  let rows;

  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { ok: false, message: "Could not read the grid." };
  }

  if (!Array.isArray(rows) || !rows.length) {
    return { ok: false, message: "There are no rows to save." };
  }

  try {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getClaims();

    if (!session?.claims) {
      return { ok: false, message: "You must be logged on." };
    }

    for (const row of rows) {
      const functionId = toInteger(row?.functionId);

      if (!Number.isInteger(functionId)) {
        continue;
      }

      const { error } = await supabase.rpc("pi_permission_by_user", {
        p_user_id: userId,
        p_function_id: functionId,
        p_app_name: appName,
        p_give: Boolean(row?.give),
      });

      if (error) {
        return { ok: false, message: error.message };
      }
    }

    return { ok: true, message: "Saved." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save.",
    };
  }
}
