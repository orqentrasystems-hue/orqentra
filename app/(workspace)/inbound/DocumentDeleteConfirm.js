"use client";

import { useEffect } from "react";

export default function DocumentDeleteConfirm({
  open,
  pending = false,
  message = "",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-black/50"
        disabled={pending}
        onClick={pending ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete document"
        className="relative z-10 w-full max-w-md rounded border border-zinc-300 bg-white p-6 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Delete document
        </h2>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          Delete this document?
        </p>
        {message ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">{message}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            NO
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded border border-red-700 bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "YES"}
          </button>
        </div>
      </div>
    </div>
  );
}
