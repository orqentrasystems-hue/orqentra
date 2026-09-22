"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  NAV_APP_COOKIE,
  NAV_PAGE_COOKIE,
  menuPageKey,
  menuPagePath,
  navCookieOptions,
} from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

export async function logOn(prevState, formData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { message: "Username and password are required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (error) {
      return { message: error.message };
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Could not log on.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/landing");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(NAV_APP_COOKIE);
  cookieStore.delete(NAV_PAGE_COOKIE);
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function openApp(appName) {
  const name = String(appName ?? "").trim();

  if (!name) {
    redirect("/landing");
  }

  const cookieStore = await cookies();
  cookieStore.set(NAV_APP_COOKIE, name, navCookieOptions);
  cookieStore.delete(NAV_PAGE_COOKIE);
  redirect(`/app-menu?app=${encodeURIComponent(name)}`);
}

export async function exitApp() {
  const cookieStore = await cookies();
  cookieStore.delete(NAV_APP_COOKIE);
  cookieStore.delete(NAV_PAGE_COOKIE);
  redirect("/landing");
}

export async function openMenuPage(pageName) {
  const name = String(pageName ?? "").trim();
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";

  if (!appName) {
    redirect("/landing");
  }

  const path = menuPagePath(name);

  if (path) {
    cookieStore.set(NAV_PAGE_COOKIE, menuPageKey(name), navCookieOptions);
    redirect(path);
  }

  redirect(`/app-menu?app=${encodeURIComponent(appName)}`);
}
