"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export default function RequestResetForm({ errorMessage = "" }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const message = state.message || errorMessage;

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1" htmlFor="username">
        <span className="text-sm font-medium text-zinc-700">
          Username
        </span>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-navy-950"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset email"}
      </button>
      <Link
        href="/"
        className="text-sm font-medium text-navy-950 underline hover:text-gold-600"
      >
        Log on
      </Link>
      {message ? (
        <p
          aria-live="polite"
          className={
            state.ok
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-red-700 dark:text-red-400"
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
