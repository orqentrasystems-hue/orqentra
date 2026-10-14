import { redirect } from "next/navigation";
import { signOut } from "../actions";
import BrandHeader from "../BrandHeader";
import AddUserForm from "./AddUserForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Menu",
  description: "Menu",
};

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/");
  }

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
              Menu
            </h1>
            <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
          </div>
          <AddUserForm />
        </div>
      </main>
    </div>
  );
}
