import { createClient } from "@/lib/supabase/server";
import BrandHeader from "../BrandHeader";
import RequestResetForm from "./RequestResetForm";
import UpdatePasswordForm from "./UpdatePasswordForm";

export const metadata = {
  title: "Reset Password",
  description: "Reset Password",
};

export const dynamic = "force-dynamic";

function firstString(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function ResetPasswordPage({ searchParams }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const canSetPassword = Boolean(data?.claims);
  const errorParam = firstString((await searchParams).error);
  const errorMessage =
    errorParam === "invalid"
      ? "That reset link is invalid or has expired."
      : "";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans">
      <BrandHeader />
      <main className="flex flex-1 w-full flex-col items-center justify-center px-8 py-16">
        <div className="flex w-full max-w-md flex-col gap-6 rounded border border-zinc-300 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
              Reset Password
            </h1>
            <div className="h-0.5 w-12 bg-gold-600" aria-hidden="true" />
          </div>
          {canSetPassword ? (
            <UpdatePasswordForm />
          ) : (
            <RequestResetForm errorMessage={errorMessage} />
          )}
        </div>
      </main>
    </div>
  );
}
