import { redirect } from "next/navigation";
import LogonForm from "./LogonForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Log on",
  description: "Log on",
};

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/menu");
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Log on
        </h1>
        <LogonForm />
      </main>
    </div>
  );
}
