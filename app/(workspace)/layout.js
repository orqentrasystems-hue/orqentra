import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { exitApp, signOut } from "../actions";
import AppTree from "../landing/AppTree";
import { buildFunctionMenuTree } from "./app-menu/buildFunctionMenuTree";
import { NAV_APP_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }) {
  const appName = (await cookies()).get(NAV_APP_COOKIE)?.value ?? "";

  if (!appName) {
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
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full items-center justify-between px-8 py-4">
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
      <div className="flex min-h-0 flex-1 w-full bg-white dark:bg-black">
        <aside className="flex w-fit shrink-0 flex-col items-start gap-6 border-r border-zinc-200 px-8 py-4 dark:border-zinc-700">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {appName}
          </h1>
          {error ? (
            <p className="text-sm text-red-700 dark:text-red-400">
              {error.message}
            </p>
          ) : (
            <AppTree
              nodes={JSON.parse(JSON.stringify(nodes))}
              openMenuPages
              asButtons
              emptyMessage="No menu items."
            />
          )}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col items-start gap-6 px-8 py-4">
          {children}
        </section>
      </div>
    </div>
  );
}
