import { redirect } from "next/navigation";
import { signOut } from "../actions";
import BrandHeader from "../BrandHeader";
import AppTree from "./AppTree";
import { buildAppTree } from "./buildAppTree";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Applications",
  description: "CLTE applications",
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
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans">
      <BrandHeader>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            Sign Out
          </button>
        </form>
      </BrandHeader>
      <main className="flex w-full flex-1 flex-col items-center px-8 py-8">
        <div className="flex w-full max-w-5xl flex-col items-start gap-6 rounded border border-zinc-300 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
              Applications
            </h1>
            <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
          </div>
          {error ? (
            <p className="text-sm text-red-700">{error.message}</p>
          ) : (
            <AppTree
              nodes={JSON.parse(JSON.stringify(nodes))}
              openOnSelect
            />
          )}
        </div>
      </main>
    </div>
  );
}
