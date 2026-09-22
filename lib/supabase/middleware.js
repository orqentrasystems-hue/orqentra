import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  MENU_PAGE_PATHS,
  NAV_APP_COOKIE,
  NAV_PAGE_COOKIE,
} from "@/lib/nav-access";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

function redirectWithCookies(request, pathname, supabaseResponse, searchParams) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  if (searchParams) {
    url.search = "";
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

function clearNavCookie(response, name) {
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
  });
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isLoggedOn = Boolean(data?.claims);
  const pathname = request.nextUrl.pathname;
  const isLogonPage = pathname === "/";
  const isResetPasswordPage = pathname === "/reset-password";
  const isAuthConfirm = pathname === "/auth/confirm";

  if (!isLoggedOn && !isLogonPage && !isResetPasswordPage && !isAuthConfirm) {
    return redirectWithCookies(request, "/", supabaseResponse);
  }

  if (isLoggedOn && isLogonPage) {
    return redirectWithCookies(request, "/landing", supabaseResponse);
  }

  if (isLoggedOn && request.nextUrl.pathname === "/landing") {
    clearNavCookie(supabaseResponse, NAV_APP_COOKIE);
    clearNavCookie(supabaseResponse, NAV_PAGE_COOKIE);
  }

  if (isLoggedOn && request.nextUrl.pathname === "/app-menu") {
    const allowedApp = request.cookies.get(NAV_APP_COOKIE)?.value ?? "";
    const requestedApp = request.nextUrl.searchParams.get("app") ?? "";

    if (!allowedApp || allowedApp !== requestedApp) {
      return redirectWithCookies(request, "/landing", supabaseResponse);
    }
  }

  if (isLoggedOn && MENU_PAGE_PATHS.includes(pathname)) {
    const allowedApp = request.cookies.get(NAV_APP_COOKIE)?.value ?? "";
    const allowedPage = request.cookies.get(NAV_PAGE_COOKIE)?.value ?? "";
    const requestedPage = pathname.slice(1);

    if (!allowedApp) {
      return redirectWithCookies(request, "/landing", supabaseResponse);
    }

    if (allowedPage !== requestedPage) {
      return redirectWithCookies(request, "/app-menu", supabaseResponse, {
        app: allowedApp,
      });
    }
  }

  if (
    isLoggedOn &&
    pathname !== "/" &&
    pathname !== "/landing" &&
    pathname !== "/app-menu" &&
    pathname !== "/reset-password" &&
    pathname !== "/auth/confirm" &&
    !MENU_PAGE_PATHS.includes(pathname)
  ) {
    return redirectWithCookies(request, "/landing", supabaseResponse);
  }

  return supabaseResponse;
}
