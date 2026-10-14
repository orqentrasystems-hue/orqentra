"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logOn } from "./actions";

const initialState = {
  message: "",
};

export default function LogonForm() {
  const [state, formAction, pending] = useActionState(logOn, initialState);

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
      <label className="flex flex-col gap-1" htmlFor="password">
        <span className="text-sm font-medium text-zinc-700">
          Password
        </span>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-navy-950"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"
      >
        {pending ? "Logging on…" : "Log on"}
      </button>
      <Link
        href="/reset-password"
        className="text-sm font-medium text-navy-950 underline hover:text-gold-600"
      >
        Reset Password
      </Link>
      {state.message ? (
        <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
