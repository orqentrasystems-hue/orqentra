"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export default function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1" htmlFor="password">
        <span className="text-sm font-medium text-zinc-700">
          New password
        </span>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-navy-950"
        />
      </label>
      <label className="flex flex-col gap-1" htmlFor="confirm">
        <span className="text-sm font-medium text-zinc-700">
          Confirm password
        </span>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-navy-950"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-navy-950 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
      {state.message ? (
        <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
