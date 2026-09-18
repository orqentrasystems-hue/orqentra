import { redirect } from "next/navigation";
import { signOut } from "../actions";
import AppTree from "./AppTree";
import { buildAppTree } from "./buildAppTree";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Landing",
  description: "Landing",
};

export const dynamic = "force-dynamic";

export default async function LandingPage() {
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

  const { data, error } = await supabase.rpc("pr_app_by_user", {
    p_user_id: userId,
  });
  const nodes = error ? [] : buildAppTree(data);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full justify-end px-16 py-4">
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
          Landing
        </h1>
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>
        ) : (
          <AppTree
            nodes={JSON.parse(JSON.stringify(nodes))}
            openOnSelect
          />
        )}
      </main>
    </div>
  );
}
