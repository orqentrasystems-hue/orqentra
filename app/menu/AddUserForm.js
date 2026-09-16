"use client";

import { useActionState } from "react";
import { addPpi, getAll } from "./actions";

const addInitialState = {
  ok: false,
  message: "",
};

const getInitialState = {
  ok: false,
  message: "",
  rows: [],
};

function formatCell(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function ResultGrid({ rows }) {
  if (!rows?.length) {
    return null;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200">
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-600">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-zinc-200 dark:border-zinc-700"
            >
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 align-top">
                  {formatCell(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AddUserForm() {
  const [addState, addFormAction, addPending] = useActionState(
    addPpi,
    addInitialState,
  );
  const [getState, getFormAction, getPending] = useActionState(
    getAll,
    getInitialState,
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <form
        action={addFormAction}
        className="flex w-full max-w-md flex-col gap-4"
      >
        <label className="flex flex-col gap-1" htmlFor="items">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Items
          </span>
          <input
            id="items"
            name="items"
            type="text"
            required
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          />
        </label>
        <button
          type="submit"
          disabled={addPending}
          className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {addPending ? "Adding…" : "Add"}
        </button>
        {addState.message ? (
          <p
            aria-live="polite"
            className={
              addState.ok
                ? "text-sm text-green-700 dark:text-green-400"
                : "text-sm text-red-700 dark:text-red-400"
            }
          >
            {addState.message}
          </p>
        ) : null}
      </form>
      <form action={getFormAction} className="flex w-full max-w-md flex-col gap-4">
        <button
          type="submit"
          disabled={getPending}
          className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {getPending ? "Getting…" : "Get"}
        </button>
        {getState.message ? (
          <p
            aria-live="polite"
            className={
              getState.ok
                ? "text-sm text-green-700 dark:text-green-400"
                : "text-sm text-red-700 dark:text-red-400"
            }
          >
            {getState.message}
          </p>
        ) : null}
      </form>
      {getState.ok && !getState.rows.length ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No rows.</p>
      ) : null}
      <ResultGrid rows={getState.rows} />
    </div>
  );
}
