import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";

export async function requireMenuPage(pageName) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const allowedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

  if (!appName) {
    redirect("/landing");
  }

  if (allowedPage !== pageName) {
    redirect(`/app-menu?app=${encodeURIComponent(appName)}`);
  }
}
