import { redirect } from "next/navigation";
import BrandHeader from "./BrandHeader";
import LogonForm from "./LogonForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Log on",
  description: "Log on",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/landing");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans">
      <BrandHeader />
      <main className="flex flex-1 w-full flex-col items-center justify-center px-8 py-16">
        <div className="flex w-full max-w-md flex-col gap-6 rounded border border-zinc-300 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
              Log on
            </h1>
            <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
          </div>
          <LogonForm />
        </div>
      </main>
    </div>
  );
}
