import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NAV_APP_COOKIE } from "@/lib/nav-access";

export const dynamic = "force-dynamic";

function firstString(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function generateMetadata({ searchParams }) {
  const appName = firstString((await searchParams).app).trim() || "App menu";

  return {
    title: appName,
    description: appName,
  };
}

export default async function AppMenuPage({ searchParams }) {
  const appName = firstString((await searchParams).app).trim();

  if (!appName) {
    redirect("/landing");
  }

  const allowedApp = (await cookies()).get(NAV_APP_COOKIE)?.value ?? "";

  if (allowedApp !== appName) {
    redirect("/landing");
  }

  return null;
}
