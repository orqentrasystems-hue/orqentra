import { createClient } from "@/lib/supabase/server";
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
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Reset Password
        </h1>
        {canSetPassword ? (
          <UpdatePasswordForm />
        ) : (
          <RequestResetForm errorMessage={errorMessage} />
        )}
      </main>
    </div>
  );
}
