import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { exitApp, signOut } from "../actions";
import BrandHeader from "../BrandHeader";
import AppTree from "../landing/AppTree";
import { buildFunctionMenuTree } from "./app-menu/buildFunctionMenuTree";
import { NAV_APP_COOKIE, NAV_PAGE_COOKIE } from "@/lib/nav-access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }) {
  const cookieStore = await cookies();
  const appName = cookieStore.get(NAV_APP_COOKIE)?.value ?? "";
  const selectedPage = cookieStore.get(NAV_PAGE_COOKIE)?.value ?? "";

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

  const { data, error } = await supabase.rpc("pr_functions_by_app_and_user_menu", {
    p_user_id: userId,
    p_app_name: appName,
  });
  const nodes = error ? [] : buildFunctionMenuTree(data);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans">
      <BrandHeader>
        <form action={exitApp}>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-navy-950 hover:bg-zinc-100"
          >
            Exit App
          </button>
        </form>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            Sign Out
          </button>
        </form>
      </BrandHeader>
      <div className="flex min-h-0 flex-1 w-full bg-white">
        <aside className="flex w-max max-w-full shrink-0 flex-col items-stretch gap-6 bg-navy-950 px-6 py-6 text-white">
          <div className="flex flex-col gap-2">
            <h1 className="whitespace-nowrap text-xl font-semibold leading-7 tracking-tight text-white">
              {appName}
            </h1>
            <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
          </div>
          {error ? (
            <p className="text-sm text-gold-400">{error.message}</p>
          ) : (
            <AppTree
              nodes={JSON.parse(JSON.stringify(nodes))}
              openMenuPages
              asButtons
              variant="sidebar"
              selectedPage={selectedPage}
              emptyMessage="No menu items."
            />
          )}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col items-start gap-6 bg-white px-8 py-6">
          {children}
        </section>
      </div>
    </div>
  );
}
