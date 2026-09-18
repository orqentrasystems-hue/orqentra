import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { exitApp, signOut } from "../actions";
import AppTree from "../landing/AppTree";
import { buildFunctionMenuTree } from "./buildFunctionMenuTree";
import { NAV_APP_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/");
  }

  const userId =
    claimsData.claims.sub ??
    (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    redirect("/");
  }

  const { data, error } = await supabase.rpc("pr_functions_by_app_and_user", {
    p_user_id: userId,
    p_app_name: appName,
  });
  const nodes = error ? [] : buildFunctionMenuTree(data);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full items-center justify-between px-16 py-4">
        <form action={exitApp}>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Exit App
          </button>
        </form>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Sign Out
          </button>
        </form>
      </header>
      <main className="flex w-full max-w-5xl flex-col items-start gap-6 px-16 py-4 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          {appName}
        </h1>
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>
        ) : (
          <AppTree
            nodes={JSON.parse(JSON.stringify(nodes))}
            openMenuPages
            emptyMessage="No menu items."
          />
        )}
      </main>
    </div>
  );
}
