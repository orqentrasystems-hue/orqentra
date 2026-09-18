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
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Username
        </span>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Sending…" : "Send reset email"}
      </button>
      <Link
        href="/"
        className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
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
