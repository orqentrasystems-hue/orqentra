import { redirect } from "next/navigation";
import { signOut } from "../actions";
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
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-16 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Menu
        </h1>
        <AddUserForm />
      </main>
    </div>
  );
}
