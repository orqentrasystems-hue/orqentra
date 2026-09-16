"use client";

import { useActionState } from "react";
import { addUser } from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export default function AddUserForm() {
  const [state, formAction, pending] = useActionState(addUser, initialState);

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
      <label className="flex flex-col gap-1" htmlFor="password">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </span>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.ok
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-red-700 dark:text-red-400"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
